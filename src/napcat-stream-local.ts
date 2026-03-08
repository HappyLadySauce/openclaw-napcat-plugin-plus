import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";

export function pickContextId(payload: Record<string, any>, ...keys: string[]): string {
    for (const key of keys) {
        const normalized = String(payload?.[key] ?? "").trim();
        if (normalized) {
            return normalized;
        }
    }
    return "";
}

export async function buildLocalStreamActionResult(filePath: string, options?: {
    action?: string;
    chunkSize?: number;
    fileName?: string;
    extraInfo?: Record<string, any>;
}) {
    const action = String(options?.action || "stream_action");
    const chunkSize = Math.max(1, Number(options?.chunkSize || 64 * 1024));
    const fileStats = await stat(filePath);
    const fileName = String(options?.fileName || basename(filePath));
    const streamChunks: any[] = [{
        type: "stream",
        data_type: "file_info",
        file_name: fileName,
        file_size: fileStats.size,
        chunk_size: chunkSize,
        ...(options?.extraInfo || {}),
    }];

    let index = 0;
    let bytesRead = 0;
    for await (const chunk of createReadStream(filePath, { highWaterMark: chunkSize })) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytesRead += buffer.length;
        const base64Chunk = buffer.toString("base64");
        streamChunks.push({
            type: "stream",
            data_type: "file_chunk",
            index,
            data: base64Chunk,
            size: buffer.length,
            progress: Math.round((bytesRead / fileStats.size) * 100),
            base64_size: base64Chunk.length,
        });
        index += 1;
    }

    return {
        status: "ok",
        retcode: 0,
        data: {
            type: "response",
            data_type: "file_complete",
            total_chunks: index,
            total_bytes: bytesRead,
            message: "Download completed",
        },
        message: "",
        wording: "",
        echo: `openclaw-local-${action}-${Date.now()}`,
        stream: "stream-action",
        stream_chunks: streamChunks,
        stream_chunk_count: streamChunks.length,
    };
}

export async function buildLocalContextStreamActionResult(
    context: { id: string; type: string; localPath: string; file?: string },
    options?: {
        action?: string;
        chunkSize?: number;
        extraInfo?: Record<string, any>;
    }
) {
    const extraInfo: Record<string, any> = {
        source: `openclaw-inbound-${context.type}-context`,
        context_media_id: context.id,
        media_type: context.type,
        ...(options?.extraInfo || {}),
    };
    extraInfo[`context_${context.type}_id`] = context.id;
    return buildLocalStreamActionResult(context.localPath, {
        action: options?.action,
        chunkSize: options?.chunkSize,
        fileName: context.file || undefined,
        extraInfo,
    });
}
