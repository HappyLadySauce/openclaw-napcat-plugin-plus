import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sanitizeLogToken } from "./napcat-inbound-log.js";
import { sendNapCatByTransport } from "./napcat-transport.js";

function getFriendRequestLogDir(config: any): string {
    const baseDirRaw = String(config?.friendRequestLogDir || "./logs/napcat-friend-requests").trim() || "./logs/napcat-friend-requests";
    return resolve(baseDirRaw);
}

function renderFriendRemarkTemplate(template: string, event: any): string {
    const rawTemplate = String(template || "").trim();
    if (!rawTemplate) return "";
    const nickname = String(event?.nickname || event?.sender?.nickname || "").trim();
    const comment = String(event?.comment || "").trim();
    return rawTemplate
        .replace(/\{userId\}/g, String(event?.user_id || ""))
        .replace(/\{nickname\}/g, nickname)
        .replace(/\{comment\}/g, comment);
}

async function appendFriendRequestLog(event: any, config: any, extra: Record<string, any> = {}): Promise<void> {
    const baseDir = getFriendRequestLogDir(config);
    const userId = sanitizeLogToken(String(event?.user_id || "unknown_user"));
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        post_type: event?.post_type || "",
        request_type: event?.request_type || "",
        self_id: event?.self_id,
        user_id: event?.user_id,
        nickname: event?.nickname || event?.sender?.nickname || "",
        comment: event?.comment || "",
        flag: event?.flag || "",
        ...extra,
    }) + "\n";
    const files = [
        resolve(baseDir, "requests.log"),
        resolve(baseDir, `qq-${userId}.log`),
    ];
    for (const filePath of files) {
        await mkdir(dirname(filePath), { recursive: true });
        await appendFile(filePath, line, "utf8");
    }
}

export async function handleNapCatFriendRequest(event: any, config: any): Promise<void> {
    const userId = String(event?.user_id || "").trim();
    const flag = String(event?.flag || "").trim();
    if (!userId || !flag) {
        await appendFriendRequestLog(event, config, {
            status: "invalid",
            reason: "missing_user_id_or_flag",
        });
        console.warn("[NapCat] Ignore malformed friend request event:", event);
        return;
    }

    const allowUsers = Array.isArray(config?.friendRequestAllowUsers)
        ? config.friendRequestAllowUsers.map((item: any) => String(item))
        : [];
    const allowMatched = allowUsers.length === 0 || allowUsers.includes(userId);
    const autoApprove = config?.autoApproveFriendRequests === true && allowMatched;
    const remark = renderFriendRemarkTemplate(String(config?.friendAutoRemarkTemplate || ""), event);

    if (!autoApprove) {
        const status = config?.autoApproveFriendRequests === true && !allowMatched
            ? "pending_blocked_by_allowlist"
            : "pending";
        await appendFriendRequestLog(event, config, {
            status,
            autoApprove: false,
            allowMatched,
            remark,
        });
        console.log(`[NapCat] Friend request pending from ${userId} comment=${String(event?.comment || "").slice(0, 80)}`);
        return;
    }

    const payload: any = { flag, approve: true };
    if (remark) payload.remark = remark;

    try {
        await sendNapCatByTransport(config, "/set_friend_add_request", payload);
        await appendFriendRequestLog(event, config, {
            status: "approved",
            autoApprove: true,
            allowMatched: true,
            remark,
        });
        console.log(`[NapCat] Auto approved friend request from ${userId}`);
    } catch (err: any) {
        await appendFriendRequestLog(event, config, {
            status: "approve_failed",
            autoApprove: true,
            allowMatched: true,
            remark,
            error: String(err?.message || err || ""),
        });
        console.error(`[NapCat] Auto approve friend request failed for ${userId}:`, err);
    }
}
