import type { ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { getNapCatConfig } from "./runtime.js";

function getContentTypeByPath(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".gif") return "image/gif";
    if (ext === ".webp") return "image/webp";
    if (ext === ".bmp") return "image/bmp";
    if (ext === ".svg") return "image/svg+xml";
    if (ext === ".mp3") return "audio/mpeg";
    if (ext === ".wav") return "audio/wav";
    if (ext === ".ogg") return "audio/ogg";
    if (ext === ".mp4") return "video/mp4";
    if (ext === ".webm") return "video/webm";
    return "application/octet-stream";
}

export async function handleMediaProxyRequest(res: ServerResponse, url: string): Promise<boolean> {
    const config = getNapCatConfig();
    if (config.mediaProxyEnabled !== true) {
        res.statusCode = 404;
        res.end("not found");
        return true;
    }

    const parsed = new URL(url, "http://127.0.0.1");
    if (parsed.pathname !== "/napcat/media") {
        res.statusCode = 404;
        res.end("not found");
        return true;
    }

    const expectedToken = String(config.mediaProxyToken || "").trim();
    const token = String(parsed.searchParams.get("token") || "").trim();
    if (expectedToken && token !== expectedToken) {
        res.statusCode = 403;
        res.end("forbidden");
        return true;
    }

    const mediaUrl = String(parsed.searchParams.get("url") || "").trim();
    if (!mediaUrl) {
        res.statusCode = 400;
        res.end("missing url");
        return true;
    }

    try {
        if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
            const upstream = await fetch(mediaUrl);
            if (!upstream.ok) {
                res.statusCode = 502;
                res.end(`upstream fetch failed: ${upstream.status}`);
                return true;
            }
            const contentType = upstream.headers.get("content-type") || "application/octet-stream";
            res.statusCode = 200;
            res.setHeader("Content-Type", contentType);
            const buffer = Buffer.from(await upstream.arrayBuffer());
            res.setHeader("Content-Length", buffer.length);
            res.end(buffer);
            return true;
        }

        let filePath = mediaUrl;
        if (mediaUrl.startsWith("file://")) {
            filePath = decodeURIComponent(new URL(mediaUrl).pathname);
        }
        if (!filePath.startsWith("/")) {
            res.statusCode = 400;
            res.end("unsupported media url");
            return true;
        }

        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            res.statusCode = 404;
            res.end("file not found");
            return true;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", getContentTypeByPath(filePath));
        res.setHeader("Content-Length", fileStat.size);
        createReadStream(filePath).pipe(res);
        return true;
    } catch (err) {
        console.error("[NapCat] Media proxy error:", err);
        res.statusCode = 500;
        res.end("media proxy error");
        return true;
    }
}
