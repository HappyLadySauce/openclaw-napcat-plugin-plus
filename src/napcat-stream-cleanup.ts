import { callNapCatAction } from "./napcat-transport.js";

let activeStreamActionCount = 0;
let pendingStreamTempCleanup: Promise<void> | null = null;

export function getStreamTempAutoCleanupMode(config: any): "off" | "safe" {
    const normalized = String(config?.streamTempAutoCleanupMode || "safe").trim().toLowerCase();
    return normalized === "safe" ? "safe" : "off";
}

export function isStreamTempAutoCleanupEnabled(config: any): boolean {
    return config?.streamTempAutoCleanupEnabled !== false && getStreamTempAutoCleanupMode(config) !== "off";
}

export async function maybeAutoCleanStreamTemp(config: any, reason: string): Promise<void> {
    if (!isStreamTempAutoCleanupEnabled(config)) {
        return;
    }
    if (activeStreamActionCount !== 0) {
        return;
    }
    if (pendingStreamTempCleanup) {
        return pendingStreamTempCleanup;
    }

    pendingStreamTempCleanup = (async () => {
        try {
            await Promise.resolve();
            if (activeStreamActionCount !== 0) {
                return;
            }
            await callNapCatAction(config, "clean_stream_temp_file", {});
            console.log(`[NapCat] Auto cleaned stream temp files after ${reason}`);
        } catch (err) {
            console.warn(`[NapCat] Auto clean_stream_temp_file failed after ${reason}:`, err);
        } finally {
            pendingStreamTempCleanup = null;
        }
    })();

    return pendingStreamTempCleanup;
}

export async function runTrackedStreamAction<T>(config: any, reason: string, runner: () => Promise<T>): Promise<T> {
    if (!isStreamTempAutoCleanupEnabled(config)) {
        return runner();
    }

    activeStreamActionCount += 1;
    let success = false;
    try {
        const result = await runner();
        success = true;
        return result;
    } finally {
        activeStreamActionCount = Math.max(0, activeStreamActionCount - 1);
        if (success) {
            void maybeAutoCleanStreamTemp(config, reason);
        }
    }
}
