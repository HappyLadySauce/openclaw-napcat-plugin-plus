import { getNapCatConfig, getNapCatRuntime } from "./runtime.js";
import { buildNapCatMessageFromReply } from "./napcat-message-format.js";
import {
    buildInboundMediaContexts,
    buildMediaContextPayload,
    downloadInboundMedia,
    extractNapCatMediaSegments,
    parseCqMedia,
} from "./napcat-inbound-media.js";
import { cleanupInboundMediaFiles, toWorkspaceRelativeMediaPath } from "./napcat-media-context-store.js";
import { sendNapCatByTransport } from "./napcat-transport.js";

function buildReplyDeliverer(conversationId: string) {
    return async (payload: any) => {
        console.log("[NapCat] Reply to deliver:", JSON.stringify(payload).substring(0, 100));
        const currentConfig = getNapCatConfig();
        const isGroupReply = conversationId.startsWith("group:");
        const targetId = isGroupReply ? conversationId.replace("group:", "") : conversationId.replace("private:", "");
        const endpoint = isGroupReply ? "/send_group_msg" : "/send_private_msg";
        const message = buildNapCatMessageFromReply(payload, currentConfig);
        if (!message) {
            console.log("[NapCat] Skip empty reply payload");
            return;
        }
        const msgPayload: any = { message };
        if (isGroupReply) msgPayload.group_id = targetId;
        else msgPayload.user_id = targetId;
        console.log(`[NapCat] Sending reply to ${isGroupReply ? "group" : "private"} ${targetId}: ${message.substring(0, 50)}...`);
        try {
            await sendNapCatByTransport(currentConfig, endpoint, msgPayload);
            console.log("[NapCat] Reply sent successfully");
        } catch (err) {
            console.error("[NapCat] Reply delivery failed (suppressed to avoid channel crash):", err);
        }
    };
}

async function createReplyDispatcher(runtime: any, conversationId: string) {
    const commonOptions = {
        responsePrefix: "",
        responsePrefixContextProvider: () => ({}),
        humanDelay: 0,
        deliver: buildReplyDeliverer(conversationId),
        onError: (err: any, info: any) => {
            console.error(`[NapCat] Reply error (${info.kind}):`, err);
        },
    };

    if (runtime.channel.reply.createReplyDispatcherWithTyping) {
        console.log("[NapCat] Calling createReplyDispatcherWithTyping...");
        const result = await runtime.channel.reply.createReplyDispatcherWithTyping({
            ...commonOptions,
            onReplyStart: () => {},
            onIdle: () => {},
        });
        return result.dispatcher;
    }

    if (runtime.channel.reply.createReplyDispatcher) {
        return runtime.channel.reply.createReplyDispatcher(commonOptions);
    }

    return null;
}

export async function handleNapCatMessageEvent(event: any, config: any): Promise<void> {
    const runtime = getNapCatRuntime();
    const isGroup = event.message_type === "group";
    const senderId = String(event.user_id);
    if (!/^\d+$/.test(senderId)) {
        console.warn(`[NapCat] WARNING: user_id is not numeric: ${senderId}`);
    }
    const rawText = event.raw_message || "";
    let text = rawText;

    const allowUsers = config.allowUsers || [];
    const isAllowUser = allowUsers.includes(senderId);
    if (allowUsers.length > 0 && !isAllowUser) {
        console.log(`[NapCat] Ignoring message from ${senderId} (not in allowlist)`);
        return;
    }

    const enableGroupMessages = config.enableGroupMessages || false;
    const groupMentionOnly = config.groupMentionOnly !== false;
    let wasMentioned = !isGroup;

    if (isGroup) {
        if (!enableGroupMessages) {
            console.log("[NapCat] Ignoring group message (group messages disabled)");
            return;
        }

        const botId = event.self_id || config.selfId;
        if (groupMentionOnly) {
            if (!botId) {
                console.log("[NapCat] Cannot determine bot ID, ignoring group message");
                return;
            }
            const mentionPatternCQ = new RegExp(`\\[CQ:at,qq=${botId}\\]`, "i");
            const allMentionPatternCQ = /\[CQ:at,qq=all\]/i;
            const mentionPatternPlain1 = new RegExp(`@[^\\s]+ \\(${botId}\\)`, "i");
            const mentionPatternPlain2 = new RegExp(`@${botId}(?:\\s|$|,)`, "i");
            const isMentionedCQ = mentionPatternCQ.test(text) || allMentionPatternCQ.test(text);
            const isMentionedPlain = mentionPatternPlain1.test(text) || mentionPatternPlain2.test(text);
            if (!isMentionedCQ && !isMentionedPlain) {
                console.log("[NapCat] Ignoring group message (bot not mentioned)");
                return;
            }
            wasMentioned = true;
            console.log("[NapCat] Bot mentioned in group, processing message");
        } else if (botId) {
            const mentionPatternCQ = new RegExp(`\\[CQ:at,qq=${botId}\\]`, "i");
            const allMentionPatternCQ = /\[CQ:at,qq=all\]/i;
            const mentionPatternPlain1 = new RegExp(`@[^\\s]+ \\(${botId}\\)`, "i");
            const mentionPatternPlain2 = new RegExp(`@${botId}(?:\\s|$|,)`, "i");
            wasMentioned = mentionPatternCQ.test(text) || allMentionPatternCQ.test(text)
                || mentionPatternPlain1.test(text) || mentionPatternPlain2.test(text);
        }

        if (botId) {
            const stripCQ = new RegExp(`^\\[CQ:at,qq=${botId}\\]\\s*`, "i");
            const stripAll = /^\[CQ:at,qq=all\]\s*/i;
            const stripPlain1 = new RegExp(`^@[^\\s]+ \\(${botId}\\)\\s*`, "i");
            const stripPlain2 = new RegExp(`^@${botId}(?:\\s|$|,)\\s*`, "i");
            text = text.replace(stripCQ, "").replace(stripAll, "").replace(stripPlain1, "").replace(stripPlain2, "").trim();
        }
    }

    const messageId = String(event.message_id);
    const conversationId = isGroup ? `group:${event.group_id}` : `private:${senderId}`;
    const senderName = event.sender?.nickname || senderId;
    const baseSessionKey = isGroup ? `session:napcat:group:${event.group_id}` : `session:napcat:private:${senderId}`;
    const cfg = runtime.config?.loadConfig?.() || {};
    const route = await runtime.channel.routing.resolveAgentRoute({
        channel: "napcat",
        conversationId,
        senderId,
        text,
        cfg,
        ctx: {},
    });

    if (!route?.agentId) {
        console.log("[NapCat] No route found for message, ignoring");
        return;
    }

    const configuredAgentId = String(config.agentId || "").trim().toLowerCase();
    const routeAgentId = String(route.agentId || "").trim().toLowerCase();
    const effectiveAgentId = configuredAgentId || routeAgentId || "main";
    const sessionKey = `agent:${effectiveAgentId}:${baseSessionKey}`;
    const sessionDisplayName = sessionKey;

    console.log(`[NapCat] Inbound from ${senderId} (session: ${sessionKey}): ${text.substring(0, 50)}...`);
    if (configuredAgentId && configuredAgentId !== routeAgentId) {
        console.log(`[NapCat] Override route agent by config: ${routeAgentId || "none"} -> ${configuredAgentId}`);
    }

    route.agentId = effectiveAgentId;
    route.sessionKey = sessionKey;

    await cleanupInboundMediaFiles(config);
    const parsedMedia = parseCqMedia(text, config);
    const mediaImageUrls = parsedMedia.imageUrls || [];
    const mediaAudioUrls = parsedMedia.audioUrls || [];
    const mediaVideoUrls = parsedMedia.videoUrls || [];
    const finalText = parsedMedia.text || text;
    const downloadedImages = await downloadInboundMedia(mediaImageUrls, "image", config);
    const downloadedAudios = await downloadInboundMedia(mediaAudioUrls, "audio", config);
    const downloadedVideos = await downloadInboundMedia(mediaVideoUrls, "video", config);
    const chatType: "group" | "direct" = isGroup ? "group" : "direct";
    const contextBase = {
        messageId,
        chatType,
        conversationId,
        senderId,
        groupId: isGroup ? String(event.group_id) : undefined,
    };
    const imageContexts = buildInboundMediaContexts("image", extractNapCatMediaSegments(event, "image"), downloadedImages.records, contextBase);
    const audioContexts = buildInboundMediaContexts("audio", extractNapCatMediaSegments(event, "audio"), downloadedAudios.records, contextBase);
    const videoContexts = buildInboundMediaContexts("video", extractNapCatMediaSegments(event, "video"), downloadedVideos.records, contextBase);
    const allMediaContexts = [...imageContexts, ...audioContexts, ...videoContexts];

    const ctxPayload: any = {
        Body: finalText,
        RawBody: rawText,
        CommandBody: finalText,
        From: `napcat:${conversationId}`,
        To: "me",
        SessionKey: sessionKey,
        SessionDisplayName: sessionDisplayName,
        displayName: sessionDisplayName,
        name: sessionDisplayName,
        Title: sessionDisplayName,
        ConversationTitle: sessionDisplayName,
        Topic: sessionDisplayName,
        Subject: sessionDisplayName,
        AccountId: route.accountId,
        ChatType: isGroup ? "group" : "direct",
        ConversationLabel: sessionKey,
        SenderName: senderName,
        SenderId: senderId,
        Provider: "napcat",
        Surface: "napcat",
        MessageSid: messageId,
        WasMentioned: wasMentioned,
        CommandAuthorized: true,
        OriginatingChannel: "napcat",
        OriginatingTo: conversationId,
    };

    if (mediaImageUrls.length > 0) {
        ctxPayload.MediaUrls = mediaImageUrls;
        ctxPayload.MediaUrl = mediaImageUrls[0];
        ctxPayload.ImageUrls = mediaImageUrls;
        ctxPayload.Images = mediaImageUrls.map((url: string, index: number) => {
            const context = imageContexts.find((item) => item.sourceIndex === index);
            return context ? {
                type: "image",
                url,
                file: context.file,
                contextImageId: context.id,
                contextMediaId: context.id,
                localPath: context.localPath,
            } : { type: "image", url };
        });
    }

    if (imageContexts.length > 0) {
        ctxPayload.ImageContextIds = imageContexts.map((item) => item.id);
        ctxPayload.ImageContextId = imageContexts[0].id;
        ctxPayload.ImageContexts = imageContexts.map((item) => buildMediaContextPayload(item));
    }

    if (mediaAudioUrls.length > 0) {
        ctxPayload.AudioUrls = mediaAudioUrls;
        ctxPayload.Audios = mediaAudioUrls.map((url: string, index: number) => {
            const context = audioContexts.find((item) => item.sourceIndex === index);
            return context ? {
                type: "audio",
                url,
                file: context.file,
                contextAudioId: context.id,
                contextMediaId: context.id,
                localPath: context.localPath,
            } : { type: "audio", url };
        });
    }

    if (audioContexts.length > 0) {
        ctxPayload.AudioContextIds = audioContexts.map((item) => item.id);
        ctxPayload.AudioContextId = audioContexts[0].id;
        ctxPayload.AudioContexts = audioContexts.map((item) => buildMediaContextPayload(item));
    }

    if (mediaVideoUrls.length > 0) {
        ctxPayload.VideoUrls = mediaVideoUrls;
        ctxPayload.Videos = mediaVideoUrls.map((url: string, index: number) => {
            const context = videoContexts.find((item) => item.sourceIndex === index);
            return context ? {
                type: "video",
                url,
                file: context.file,
                contextVideoId: context.id,
                contextMediaId: context.id,
                localPath: context.localPath,
            } : { type: "video", url };
        });
    }

    if (videoContexts.length > 0) {
        ctxPayload.VideoContextIds = videoContexts.map((item) => item.id);
        ctxPayload.VideoContextId = videoContexts[0].id;
        ctxPayload.VideoContexts = videoContexts.map((item) => buildMediaContextPayload(item));
    }

    if (allMediaContexts.length > 0) {
        ctxPayload.MediaContextIds = allMediaContexts.map((item) => item.id);
        ctxPayload.MediaContextId = allMediaContexts[0].id;
        ctxPayload.MediaContexts = allMediaContexts.map((item) => buildMediaContextPayload(item));
    }

    const mediaPaths = [...downloadedImages.paths, ...downloadedAudios.paths, ...downloadedVideos.paths]
        .map((filePath) => toWorkspaceRelativeMediaPath(filePath, config));
    const mediaTypes = [...downloadedImages.types, ...downloadedAudios.types, ...downloadedVideos.types];
    if (mediaPaths.length > 0) {
        ctxPayload.MediaPaths = mediaPaths;
        ctxPayload.MediaPath = mediaPaths[0];
        ctxPayload.MediaTypes = mediaTypes;
        ctxPayload.MediaType = mediaTypes[0] || "file";
        console.log(`[NapCat] Prepared local media files for OpenClaw: count=${mediaPaths.length}`);
    }

    const dispatcher = await createReplyDispatcher(runtime, conversationId);
    if (!dispatcher) {
        console.error("[NapCat] Could not create dispatcher");
        return;
    }

    console.log("[NapCat] Dispatcher created, methods:", Object.keys(dispatcher));
    await runtime.channel.reply.dispatchReplyFromConfig({
        ctx: ctxPayload,
        cfg,
        dispatcher,
        replyOptions: {},
    });
}
