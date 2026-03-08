import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export function sanitizeLogToken(raw: string): string {
    return String(raw || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getInboundLogFilePath(body: any, config: any): string {
    const isGroup = body?.message_type === "group";
    const baseDirRaw = String(config?.inboundLogDir || "./logs/napcat-inbound").trim() || "./logs/napcat-inbound";
    const baseDir = resolve(baseDirRaw);
    if (isGroup) {
        const groupId = sanitizeLogToken(String(body?.group_id || "unknown_group"));
        return resolve(baseDir, `group-${groupId}.log`);
    }
    const userId = sanitizeLogToken(String(body?.user_id || "unknown_user"));
    return resolve(baseDir, `qq-${userId}.log`);
}

export async function logInboundMessage(body: any, config: any): Promise<void> {
    if (config?.enableInboundLogging === false) return;
    if (body?.post_type !== "message" && body?.post_type !== "message_sent") return;

    const filePath = getInboundLogFilePath(body, config);
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        post_type: body.post_type,
        message_type: body.message_type,
        self_id: body.self_id,
        user_id: body.user_id,
        group_id: body.group_id,
        message_id: body.message_id,
        raw_message: body.raw_message || "",
        sender: body.sender || {},
    }) + "\n";

    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, line, "utf8");
}

export async function logInboundParseFailure(rawBody: string, config: any): Promise<void> {
    if (config?.enableInboundLogging === false) return;
    const baseDirRaw = String(config?.inboundLogDir || "./logs/napcat-inbound").trim() || "./logs/napcat-inbound";
    const filePath = resolve(baseDirRaw, "parse-error.log");
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        kind: "parse_error",
        raw_body: rawBody,
    }) + "\n";
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, line, "utf8");
}
