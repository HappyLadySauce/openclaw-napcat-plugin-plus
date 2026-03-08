import { readdir, rm, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { homedir } from "node:os";
import { getNapCatConfig } from "./runtime.js";

export type InboundMediaType = "image" | "audio" | "video";

export interface InboundMediaContext {
    id: string;
    type: InboundMediaType;
    createdAt: number;
    messageId: string;
    chatType: "group" | "direct";
    conversationId: string;
    senderId: string;
    groupId?: string;
    sourceIndex: number;
    file: string;
    url: string;
    summary: string;
    fileSize: string;
    localPath: string;
}

const inboundMediaContextCache = new Map<string, InboundMediaContext>();
const defaultInboundMediaContextTtlMs = 24 * 60 * 60 * 1000;
const defaultInboundMediaCleanupMinIntervalMs = 5 * 60 * 1000;
let lastInboundMediaCleanupAt = 0;
let pendingInboundMediaCleanup: Promise<void> | null = null;

function coercePositiveInteger(value: any, fallback: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
        return fallback;
    }
    return Math.floor(normalized);
}

function isInboundMediaAutoCleanupEnabled(config: any): boolean {
    return config?.inboundMediaAutoCleanupEnabled !== false;
}

function getInboundMediaContextTtlMs(config: any): number {
    return coercePositiveInteger(config?.inboundMediaTtlMs, defaultInboundMediaContextTtlMs);
}

function getInboundMediaCleanupMinIntervalMs(config: any): number {
    return coercePositiveInteger(config?.inboundMediaCleanupMinIntervalMs, defaultInboundMediaCleanupMinIntervalMs);
}

export function getInboundMediaDir(config: any): string {
    const baseDirRaw = String(config?.inboundMediaDir || "./workspace/napcat-inbound-media").trim() || "./workspace/napcat-inbound-media";
    if (baseDirRaw.startsWith("./workspace/")) {
        const relativeDir = baseDirRaw.slice("./workspace/".length).replace(/^\/+/, "");
        return resolve(homedir(), ".openclaw", "workspace", relativeDir);
    }
    if (baseDirRaw === "./workspace") {
        return resolve(homedir(), ".openclaw", "workspace");
    }
    return resolve(baseDirRaw);
}

export function toWorkspaceRelativeMediaPath(filePath: string, config: any): string {
    const absolutePath = resolve(String(filePath || ""));
    const baseDirRaw = String(config?.inboundMediaDir || "./workspace/napcat-inbound-media").trim() || "./workspace/napcat-inbound-media";
    const normalizedBaseRaw = baseDirRaw.replace(/\\/g, "/");
    const fileName = basename(absolutePath);

    if (normalizedBaseRaw.startsWith("./workspace/")) {
        const relativeDir = normalizedBaseRaw.slice("./workspace/".length).replace(/^\/+/, "").replace(/\/+$/, "");
        return relativeDir ? `./${relativeDir}/${fileName}` : `./${fileName}`;
    }

    const workspaceMarker = "/workspace/";
    const normalizedAbsolute = absolutePath.replace(/\\/g, "/");
    const markerIndex = normalizedAbsolute.indexOf(workspaceMarker);
    if (markerIndex >= 0) {
        return `./${normalizedAbsolute.slice(markerIndex + workspaceMarker.length)}`;
    }

    return `./${fileName}`;
}

function cleanupExpiredInboundMediaContexts(config: any, now = Date.now()) {
    const ttlMs = getInboundMediaContextTtlMs(config);
    for (const [key, entry] of inboundMediaContextCache) {
        if (now - entry.createdAt > ttlMs) {
            inboundMediaContextCache.delete(key);
        }
    }
}

function getReferencedInboundMediaPaths(): Set<string> {
    const referencedPaths = new Set<string>();
    for (const entry of inboundMediaContextCache.values()) {
        if (!entry.localPath) continue;
        referencedPaths.add(resolve(entry.localPath));
    }
    return referencedPaths;
}

export async function cleanupInboundMediaFiles(config: any, force = false): Promise<void> {
    cleanupExpiredInboundMediaContexts(config);
    if (!isInboundMediaAutoCleanupEnabled(config)) {
        return;
    }

    const now = Date.now();
    const minIntervalMs = getInboundMediaCleanupMinIntervalMs(config);
    if (!force && now - lastInboundMediaCleanupAt < minIntervalMs) {
        return;
    }
    if (pendingInboundMediaCleanup) {
        return pendingInboundMediaCleanup;
    }

    lastInboundMediaCleanupAt = now;
    pendingInboundMediaCleanup = (async () => {
        let deletedCount = 0;
        try {
            const mediaDir = getInboundMediaDir(config);
            const entries = await readdir(mediaDir, { withFileTypes: true });
            const ttlMs = getInboundMediaContextTtlMs(config);
            const referencedPaths = getReferencedInboundMediaPaths();

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                const filePath = resolve(mediaDir, entry.name);
                if (referencedPaths.has(filePath)) continue;

                let fileStats;
                try {
                    fileStats = await stat(filePath);
                } catch {
                    continue;
                }
                if (!fileStats.isFile()) continue;
                if (now - fileStats.mtimeMs < ttlMs) continue;

                try {
                    await rm(filePath, { force: true });
                    deletedCount += 1;
                } catch (err) {
                    console.warn(`[NapCat] Failed to remove expired inbound media: ${filePath}`, err);
                }
            }
        } catch (err: any) {
            if (err?.code !== "ENOENT") {
                console.warn("[NapCat] Failed to sweep inbound media cache:", err);
            }
        } finally {
            pendingInboundMediaCleanup = null;
        }

        if (deletedCount > 0) {
            console.log(`[NapCat] Removed expired inbound media files: ${deletedCount}`);
        }
    })();

    return pendingInboundMediaCleanup;
}

export function scheduleInboundMediaCleanup(config: any): void {
    cleanupExpiredInboundMediaContexts(config);
    void cleanupInboundMediaFiles(config).catch((err) => {
        console.warn("[NapCat] Inbound media cleanup task failed:", err);
    });
}

export function buildInboundMediaContextId(type: InboundMediaType, chatType: "group" | "direct", conversationId: string, messageId: string, sourceIndex: number): string {
    const safeConversation = conversationId.replace(/[^a-zA-Z0-9:_-]/g, "_");
    return `napcat-${type}:${chatType}:${safeConversation}:${messageId}:${sourceIndex}`;
}

export function registerInboundMediaContext(context: InboundMediaContext): void {
    inboundMediaContextCache.set(context.id, context);
}

export function getInboundMediaContext(id: string): InboundMediaContext | null {
    const config = getNapCatConfig();
    cleanupExpiredInboundMediaContexts(config);
    scheduleInboundMediaCleanup(config);
    const entry = inboundMediaContextCache.get(String(id || "").trim());
    return entry || null;
}

export function getInboundImageContext(id: string): InboundMediaContext | null {
    const entry = getInboundMediaContext(id);
    return entry?.type === "image" ? entry : null;
}

export function getInboundAudioContext(id: string): InboundMediaContext | null {
    const entry = getInboundMediaContext(id);
    return entry?.type === "audio" ? entry : null;
}

export function getInboundVideoContext(id: string): InboundMediaContext | null {
    const entry = getInboundMediaContext(id);
    return entry?.type === "video" ? entry : null;
}
