export type ParsedNapCatTarget =
    | { kind: "action"; action: string }
    | { kind: "private"; targetId: string }
    | { kind: "group"; targetId: string };

export function normalizeNapCatTarget(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    const withoutProvider = trimmed.replace(/^napcat:/i, "");

    // 结构化 action 处理
    const actionMatch = withoutProvider.match(/^action:(.+)$/i);
    if (actionMatch) {
        return `action:${actionMatch[1].trim().toLowerCase()}`;
    }

    // 处理 OpenClaw 可能生成的嵌套或冗余前缀 (agent:*:session:napcat:* 或 agent:*:napcat:*)
    // 例如 agent:main:napcat:group:session:napcat:group:553083326 -> session:napcat:group:553083326
    const cleanSession = withoutProvider.replace(/^agent:[^:]+:(?:napcat:(?:private|group):)?/i, "");

    const sessionMatch = cleanSession.match(/^session:napcat:(private|group):(\d+)$/i);
    if (sessionMatch) {
        return `session:napcat:${sessionMatch[1].toLowerCase()}:${sessionMatch[2]}`;
    }

    const directMatch = cleanSession.match(/^(private|group):(\d+)$/i);
    if (directMatch) {
        return `${directMatch[1].toLowerCase()}:${directMatch[2]}`;
    }

    if (/^\d+$/.test(cleanSession)) {
        return cleanSession;
    }

    return cleanSession.toLowerCase();
}

export function looksLikeNapCatTargetId(raw: string, normalized?: string): boolean {
    const target = (normalized || raw).trim();
    return (
        /^action:[a-z0-9_.-]+$/i.test(target) ||
        /^agent:[^:]+:(?:napcat:(?:private|group):)?session:napcat:(private|group):\d+$/i.test(target) ||
        /^session:napcat:(private|group):\d+$/i.test(target) ||
        /^(private|group):\d+$/i.test(target) ||
        /^\d+$/.test(target)
    );
}

export function parseNapCatTarget(raw: string): ParsedNapCatTarget {
    const normalized = normalizeNapCatTarget(raw);
    const actionMatch = normalized.match(/^action:(.+)$/i);
    if (actionMatch) {
        return { kind: "action", action: actionMatch[1] };
    }
    if (normalized.startsWith("group:")) {
        return { kind: "group", targetId: normalized.replace("group:", "") };
    }
    if (normalized.startsWith("private:")) {
        return { kind: "private", targetId: normalized.replace("private:", "") };
    }
    if (normalized.startsWith("session:napcat:private:")) {
        return { kind: "private", targetId: normalized.replace("session:napcat:private:", "") };
    }
    if (normalized.startsWith("session:napcat:group:")) {
        return { kind: "group", targetId: normalized.replace("session:napcat:group:", "") };
    }
    return { kind: "private", targetId: normalized };
}
