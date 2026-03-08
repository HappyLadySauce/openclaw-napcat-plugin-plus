export function unwrapJsonCodeFence(text: string): string {
    const trimmed = String(text || "").trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : trimmed;
}

export function parseNapCatActionPayload(text: string): any {
    const normalized = unwrapJsonCodeFence(text);
    if (!normalized) return {};
    try {
        return JSON.parse(normalized);
    } catch (err: any) {
        throw new Error(`NapCat action 参数必须是合法 JSON: ${err?.message || err}`);
    }
}

export function requireObjectPayload(payload: any, action: string): Record<string, any> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error(`${action} 参数必须是 JSON 对象`);
    }
    return payload as Record<string, any>;
}

export function coerceBoolean(value: any, fieldName: string): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(lowered)) return true;
        if (["false", "0", "no", "n"].includes(lowered)) return false;
    }
    throw new Error(`${fieldName} 必须是 boolean`);
}

export function coerceUserId(value: any, fieldName = "user_id"): number {
    const normalized = String(value ?? "").trim();
    if (!/^\d+$/.test(normalized)) {
        throw new Error(`${fieldName} 必须是 QQ 数字 ID`);
    }
    return Number(normalized);
}

export function coerceGroupId(value: any, fieldName = "group_id"): number {
    const normalized = String(value ?? "").trim();
    if (!/^\d+$/.test(normalized)) {
        throw new Error(`${fieldName} 必须是群号数字 ID`);
    }
    return Number(normalized);
}

export function coerceInteger(value: any, fieldName: string): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || !Number.isInteger(normalized)) {
        throw new Error(`${fieldName} 必须是整数`);
    }
    return normalized;
}

export function coerceNonEmptyString(value: any, fieldName: string): string {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
        throw new Error(`${fieldName} 不能为空`);
    }
    return normalized;
}

export function buildFileIdentityPayload(payload: Record<string, any>, fieldName = "file"): Record<string, any> {
    const fileIdRaw = payload.file_id ?? payload.fileId;
    const fileRaw = payload.file;
    const requestPayload: Record<string, any> = {};
    if (fileIdRaw !== undefined && String(fileIdRaw).trim()) {
        requestPayload.file_id = String(fileIdRaw).trim();
    }
    if (fileRaw !== undefined && String(fileRaw).trim()) {
        requestPayload.file = String(fileRaw).trim();
    }
    if (!requestPayload.file_id && !requestPayload.file) {
        throw new Error(`至少需要提供 file_id 或 ${fieldName}`);
    }
    return requestPayload;
}
