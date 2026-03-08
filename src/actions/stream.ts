import {
    buildFileIdentityPayload,
    coerceBoolean,
    coerceInteger,
    coerceNonEmptyString,
    requireObjectPayload,
} from "../napcat-action-params.js";
import { getInboundAudioContext, getInboundImageContext, getInboundMediaContext, getInboundVideoContext } from "../napcat-media-context-store.js";
import { callNapCatAction } from "../napcat-transport.js";
import { maybeAutoCleanStreamTemp, runTrackedStreamAction } from "../napcat-stream-cleanup.js";
import { buildLocalContextStreamActionResult, pickContextId } from "../napcat-stream-local.js";

async function uploadFileStream(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "upload_file_stream");
    const streamId = coerceNonEmptyString(payload.stream_id ?? payload.streamId, "stream_id");
    const isCompleteRaw = payload.is_complete ?? payload.isComplete;
    if (isCompleteRaw !== undefined && coerceBoolean(isCompleteRaw, "is_complete")) {
        return runTrackedStreamAction(config, "upload_file_stream.complete", () => callNapCatAction(config, "upload_file_stream", {
            stream_id: streamId,
            is_complete: true,
        }));
    }

    const requestPayload: Record<string, any> = {
        stream_id: streamId,
        chunk_data: coerceNonEmptyString(payload.chunk_data ?? payload.chunkData, "chunk_data"),
        chunk_index: coerceInteger(payload.chunk_index ?? payload.chunkIndex, "chunk_index"),
        total_chunks: coerceInteger(payload.total_chunks ?? payload.totalChunks, "total_chunks"),
        file_size: coerceInteger(payload.file_size ?? payload.fileSize, "file_size"),
        expected_sha256: coerceNonEmptyString(payload.expected_sha256 ?? payload.expectedSha256, "expected_sha256"),
        filename: coerceNonEmptyString(payload.filename ?? payload.file_name ?? payload.fileName, "filename"),
    };
    const fileRetention = payload.file_retention ?? payload.fileRetention;
    if (fileRetention !== undefined) {
        requestPayload.file_retention = coerceInteger(fileRetention, "file_retention");
    }
    return callNapCatAction(config, "upload_file_stream", requestPayload);
}

async function downloadFileStream(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "download_file_stream");
    const contextVideoId = pickContextId(payload, "context_video_id", "contextVideoId", "video_context_id");
    const contextMediaId = pickContextId(payload, "context_media_id", "contextMediaId", "media_context_id");
    const chunkSize = payload.chunk_size ?? payload.chunkSize;
    const normalizedChunkSize = chunkSize !== undefined ? coerceInteger(chunkSize, "chunk_size") : undefined;

    if (contextVideoId || contextMediaId) {
        const context = contextVideoId ? getInboundVideoContext(contextVideoId) : getInboundMediaContext(contextMediaId);
        const requestedId = contextVideoId || contextMediaId;
        if (!context?.localPath) {
            throw new Error(`未找到媒体上下文标识或已过期: ${requestedId}`);
        }
        if (contextVideoId && context.type !== "video") {
            throw new Error(`上下文标识不是视频类型: ${requestedId}`);
        }
        return buildLocalContextStreamActionResult(context, {
            action: "download_file_stream",
            chunkSize: normalizedChunkSize,
        });
    }

    const requestPayload = buildFileIdentityPayload(payload);
    if (normalizedChunkSize !== undefined) {
        requestPayload.chunk_size = normalizedChunkSize;
    }
    return runTrackedStreamAction(config, "download_file_stream", () => callNapCatAction(config, "download_file_stream", requestPayload));
}

async function downloadFileImageStream(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "download_file_image_stream");
    const contextImageId = pickContextId(payload, "context_image_id", "contextImageId", "image_context_id");
    const contextMediaId = pickContextId(payload, "context_media_id", "contextMediaId", "media_context_id");
    const chunkSize = payload.chunk_size ?? payload.chunkSize;
    const normalizedChunkSize = chunkSize !== undefined ? coerceInteger(chunkSize, "chunk_size") : undefined;
    if (contextImageId || contextMediaId) {
        const context = contextImageId ? getInboundImageContext(contextImageId) : getInboundMediaContext(contextMediaId);
        const requestedId = contextImageId || contextMediaId;
        if (!context?.localPath) {
            throw new Error(`未找到图片上下文标识或已过期: ${requestedId}`);
        }
        if (context.type !== "image") {
            throw new Error(`上下文标识不是图片类型: ${requestedId}`);
        }
        return buildLocalContextStreamActionResult(context, {
            action: "download_file_image_stream",
            chunkSize: normalizedChunkSize,
        });
    }

    const requestPayload = buildFileIdentityPayload(payload);
    if (normalizedChunkSize !== undefined) {
        requestPayload.chunk_size = normalizedChunkSize;
    }
    return runTrackedStreamAction(config, "download_file_image_stream", () => callNapCatAction(config, "download_file_image_stream", requestPayload));
}

async function downloadFileRecordStream(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "download_file_record_stream");
    const contextAudioId = pickContextId(payload, "context_audio_id", "contextAudioId", "audio_context_id");
    const contextMediaId = pickContextId(payload, "context_media_id", "contextMediaId", "media_context_id");
    const chunkSize = payload.chunk_size ?? payload.chunkSize;
    const outFormat = payload.out_format ?? payload.outFormat;
    const normalizedChunkSize = chunkSize !== undefined ? coerceInteger(chunkSize, "chunk_size") : undefined;

    if (contextAudioId || contextMediaId) {
        const context = contextAudioId ? getInboundAudioContext(contextAudioId) : getInboundMediaContext(contextMediaId);
        const requestedId = contextAudioId || contextMediaId;
        if (!context?.localPath) {
            throw new Error(`未找到语音上下文标识或已过期: ${requestedId}`);
        }
        if (context.type !== "audio") {
            throw new Error(`上下文标识不是语音类型: ${requestedId}`);
        }
        return buildLocalContextStreamActionResult(context, {
            action: "download_file_record_stream",
            chunkSize: normalizedChunkSize,
            extraInfo: outFormat !== undefined
                ? { requested_out_format: coerceNonEmptyString(outFormat, "out_format") }
                : undefined,
        });
    }

    const requestPayload = buildFileIdentityPayload(payload);
    if (normalizedChunkSize !== undefined) {
        requestPayload.chunk_size = normalizedChunkSize;
    }
    if (outFormat !== undefined) {
        requestPayload.out_format = coerceNonEmptyString(outFormat, "out_format");
    }
    return runTrackedStreamAction(config, "download_file_record_stream", () => callNapCatAction(config, "download_file_record_stream", requestPayload));
}

async function cleanStreamTempFile(config: any, rawPayload: any) {
    requireObjectPayload(rawPayload, "clean_stream_temp_file");
    return callNapCatAction(config, "clean_stream_temp_file", {});
}

async function autoCleanStreamTempFile(config: any, rawPayload: any) {
    requireObjectPayload(rawPayload, "clean_stream_temp_file");
    return maybeAutoCleanStreamTemp(config, "manual.safe_cleanup");
}

export const streamActionHandlers: Record<string, (config: any, rawPayload: any) => Promise<any>> = {
    upload_file_stream: uploadFileStream,
    download_file_stream: downloadFileStream,
    download_file_image_stream: downloadFileImageStream,
    download_file_record_stream: downloadFileRecordStream,
    clean_stream_temp_file: cleanStreamTempFile,
    clean_stream_temp_file_safe: autoCleanStreamTempFile,
};
