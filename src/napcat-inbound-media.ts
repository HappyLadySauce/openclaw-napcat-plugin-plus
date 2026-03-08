import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname, resolve } from "node:path";
import {
    buildInboundMediaContextId,
    getInboundMediaDir,
    InboundMediaContext,
    InboundMediaType,
    registerInboundMediaContext,
} from "./napcat-media-context-store.js";

export interface ParsedMedia {
    text: string;
    imageUrls: string[];
    audioUrls: string[];
    videoUrls: string[];
}

export interface DownloadedMedia {
    paths: string[];
    types: string[];
    records: Array<{ sourceUrl: string; path: string; type: string }>;
}

export interface NapCatMediaSegment {
    type: InboundMediaType;
    file: string;
    url: string;
    summary: string;
    fileSize: string;
    index: number;
}

export function decodeHtmlEntities(input: string): string {
    return String(input || "")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

export function parseCqMedia(rawText: string, config: any): ParsedMedia {
    const inboundImageEnabled = config.inboundImageEnabled !== false;
    if (!inboundImageEnabled || !rawText || typeof rawText !== "string") {
        return { text: rawText || "", imageUrls: [], audioUrls: [], videoUrls: [] };
    }

    const imageUrls: string[] = [];
    const audioUrls: string[] = [];
    const videoUrls: string[] = [];

    const cqRegex = /\[CQ:([a-zA-Z0-9_]+)([^\]]*)\]/g;
    let clean = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = cqRegex.exec(rawText)) !== null) {
        const before = rawText.slice(lastIndex, match.index);
        clean += before;
        lastIndex = cqRegex.lastIndex;

        const type = match[1].toLowerCase();
        const paramsRaw = (match[2] || "").replace(/^,/, "");
        const kv: Record<string, string> = {};
        if (paramsRaw) {
            for (const part of paramsRaw.split(",")) {
                const trimmed = part.trim();
                if (!trimmed) continue;
                const eqIndex = trimmed.indexOf("=");
                if (eqIndex <= 0) continue;
                const key = trimmed.slice(0, eqIndex).trim();
                const value = trimmed.slice(eqIndex + 1).trim();
                if (!key) continue;
                kv[key] = value;
            }
        }

        if (type === "image") {
            const preferUrl = config.inboundImagePreferUrl !== false;
            const urlCandidate = preferUrl ? (kv.url || kv.file) : (kv.file || kv.url);
            const url = decodeHtmlEntities(String(urlCandidate || "").trim());
            if (url) imageUrls.push(url);
        } else if (type === "record") {
            const url = decodeHtmlEntities(String(kv.url || kv.file || "").trim());
            if (url) audioUrls.push(url);
        } else if (type === "video") {
            const url = decodeHtmlEntities(String(kv.url || kv.file || "").trim());
            if (url) videoUrls.push(url);
        } else {
            clean += match[0];
        }
    }

    clean += rawText.slice(lastIndex);
    const normalizedText = clean.trim();
    if (imageUrls.length > 0 || audioUrls.length > 0 || videoUrls.length > 0) {
        console.log(`[NapCat] Parsed media from message: images=${imageUrls.length}, audios=${audioUrls.length}, videos=${videoUrls.length}`);
    }

    return {
        text: normalizedText,
        imageUrls,
        audioUrls,
        videoUrls,
    };
}

export function extractNapCatMediaSegments(event: any, type: InboundMediaType): NapCatMediaSegment[] {
    const segments = Array.isArray(event?.message) ? event.message : [];
    const targetSegmentType = type === "audio" ? "record" : type;
    const results: NapCatMediaSegment[] = [];
    let index = 0;
    for (const segment of segments) {
        if (!segment || segment.type !== targetSegmentType || typeof segment.data !== "object") continue;
        const file = decodeHtmlEntities(String(segment.data.file || "").trim());
        const url = decodeHtmlEntities(String(segment.data.url || "").trim());
        const summary = String(segment.data.summary || segment.data.name || "").trim();
        const fileSize = String(segment.data.file_size || segment.data.fileSize || segment.data.size || "").trim();
        results.push({ type, file, url, summary, fileSize, index });
        index++;
    }
    return results;
}

function extFromContentType(contentType: string): string {
    const normalized = String(contentType || "").toLowerCase();
    if (normalized.includes("image/png")) return ".png";
    if (normalized.includes("image/jpeg")) return ".jpg";
    if (normalized.includes("image/gif")) return ".gif";
    if (normalized.includes("image/webp")) return ".webp";
    if (normalized.includes("audio/wav")) return ".wav";
    if (normalized.includes("audio/mpeg")) return ".mp3";
    if (normalized.includes("audio/ogg")) return ".ogg";
    if (normalized.includes("audio/mp4") || normalized.includes("audio/x-m4a")) return ".m4a";
    if (normalized.includes("video/mp4")) return ".mp4";
    if (normalized.includes("video/webm")) return ".webm";
    if (normalized.includes("video/quicktime")) return ".mov";
    if (normalized.includes("video/x-msvideo")) return ".avi";
    return "";
}

function normalizeInboundMediaType(contentType: string): string {
    const normalized = String(contentType || "").toLowerCase();
    if (normalized.startsWith("image/")) return "image";
    if (normalized.startsWith("audio/")) return "audio";
    if (normalized.startsWith("video/")) return "video";
    return normalized || "file";
}

export async function downloadInboundMedia(urls: string[], kind: InboundMediaType, config: any): Promise<DownloadedMedia> {
    const result: DownloadedMedia = { paths: [], types: [], records: [] };
    if (!Array.isArray(urls) || urls.length === 0) return result;

    const mediaDir = getInboundMediaDir(config);
    await mkdir(mediaDir, { recursive: true });

    for (const rawUrl of urls) {
        const mediaUrl = String(rawUrl || "").trim();
        if (!mediaUrl || (!mediaUrl.startsWith("http://") && !mediaUrl.startsWith("https://"))) continue;

        try {
            const response = await fetch(mediaUrl);
            if (!response.ok) {
                console.warn(`[NapCat] Failed to download inbound ${kind}: ${response.status} ${mediaUrl}`);
                continue;
            }

            const contentType = response.headers.get("content-type") || (kind === "image" ? "image/png" : "application/octet-stream");
            const fallbackExt = kind === "image" ? ".img" : (kind === "audio" ? ".bin" : ".mp4");
            const ext = extFromContentType(contentType) || extname(new URL(mediaUrl).pathname) || fallbackExt;
            const filePath = resolve(mediaDir, `${Date.now()}-${randomUUID()}${ext}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(filePath, buffer);
            result.paths.push(filePath);
            const detectedType = normalizeInboundMediaType(contentType);
            const normalizedType = detectedType === "file" ? kind : detectedType;
            result.types.push(normalizedType);
            result.records.push({ sourceUrl: mediaUrl, path: filePath, type: normalizedType });
        } catch (err) {
            console.warn(`[NapCat] Failed to download inbound ${kind}: ${mediaUrl}`, err);
        }
    }

    return result;
}

export function buildInboundMediaContexts(
    type: InboundMediaType,
    segments: NapCatMediaSegment[],
    records: DownloadedMedia["records"],
    base: {
        messageId: string;
        chatType: "group" | "direct";
        conversationId: string;
        senderId: string;
        groupId?: string;
    }
): InboundMediaContext[] {
    const downloadedByUrl = new Map(records.map((record) => [record.sourceUrl, record]));
    const contexts: InboundMediaContext[] = [];
    for (const segment of segments) {
        const sourceUrl = segment.url || segment.file;
        const downloaded = downloadedByUrl.get(sourceUrl);
        if (!downloaded?.path) continue;

        const context: InboundMediaContext = {
            id: buildInboundMediaContextId(type, base.chatType, base.conversationId, base.messageId, segment.index),
            type,
            createdAt: Date.now(),
            messageId: base.messageId,
            chatType: base.chatType,
            conversationId: base.conversationId,
            senderId: base.senderId,
            groupId: base.groupId,
            sourceIndex: segment.index,
            file: segment.file,
            url: segment.url,
            summary: segment.summary,
            fileSize: segment.fileSize,
            localPath: downloaded.path,
        };
        registerInboundMediaContext(context);
        contexts.push(context);
    }
    return contexts;
}

export function buildMediaContextPayload(context: InboundMediaContext) {
    let downloadTarget = "action:download_file_stream";
    let downloadPayload: Record<string, any> = { context_media_id: context.id };
    if (context.type === "image") {
        downloadTarget = "action:download_file_image_stream";
        downloadPayload = { context_image_id: context.id };
    } else if (context.type === "audio") {
        downloadTarget = "action:download_file_record_stream";
        downloadPayload = { context_audio_id: context.id };
    } else if (context.type === "video") {
        downloadTarget = "action:download_file_stream";
        downloadPayload = { context_video_id: context.id };
    }

    return {
        id: context.id,
        type: context.type,
        url: context.url,
        file: context.file,
        summary: context.summary,
        fileSize: context.fileSize,
        localPath: context.localPath,
        messageId: context.messageId,
        chatType: context.chatType,
        conversationId: context.conversationId,
        sourceIndex: context.sourceIndex,
        downloadTarget,
        downloadPayload,
    };
}
