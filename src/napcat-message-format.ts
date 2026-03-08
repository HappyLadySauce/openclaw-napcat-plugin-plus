export function buildMediaProxyUrl(mediaUrl: string, config: any): string {
    const enabled = config?.mediaProxyEnabled === true;
    const baseUrl = String(config?.publicBaseUrl || "").trim().replace(/\/+$/, "");
    if (!enabled || !baseUrl) return mediaUrl;

    const token = String(config?.mediaProxyToken || "").trim();
    const query = new URLSearchParams({ url: mediaUrl });
    if (token) query.set("token", token);
    return `${baseUrl}/napcat/media?${query.toString()}`;
}

export function isAudioMedia(mediaUrl: string): boolean {
    return /\.(wav|mp3|amr|silk|ogg|m4a|flac|aac)(?:\?.*)?$/i.test(mediaUrl);
}

export function resolveVoiceMediaUrl(mediaUrl: string, config: any): string {
    const trimmed = mediaUrl.trim();
    if (!trimmed) return trimmed;
    if (/^(https?:\/\/|file:\/\/)/i.test(trimmed) || trimmed.startsWith("/")) {
        return trimmed;
    }
    const voiceBasePath = String(config?.voiceBasePath || "").trim().replace(/\/+$/, "");
    if (!voiceBasePath) return trimmed;
    return `${voiceBasePath}/${trimmed.replace(/^\/+/, "")}`;
}

export function buildNapCatMediaCq(mediaUrl: string, config: any, forceVoice = false): string {
    const shouldUseVoice = forceVoice || isAudioMedia(mediaUrl);
    const resolvedUrl = shouldUseVoice ? resolveVoiceMediaUrl(mediaUrl, config) : mediaUrl;
    const proxiedMediaUrl = buildMediaProxyUrl(resolvedUrl, config);
    const type = shouldUseVoice ? "record" : "image";
    return `[CQ:${type},file=${proxiedMediaUrl}]`;
}

export function buildNapCatMessageFromReply(
    payload: { text?: string; mediaUrl?: string; mediaUrls?: string[]; audioAsVoice?: boolean },
    config: any
) {
    const text = payload.text?.trim() || "";
    const mediaCandidates = [
        ...(payload.mediaUrls || []),
        ...(payload.mediaUrl ? [payload.mediaUrl] : []),
    ];
    const mediaSegments = mediaCandidates
        .map((url) => String(url || "").trim())
        .filter(Boolean)
        .map((url) => buildNapCatMediaCq(url, config, payload.audioAsVoice === true));

    if (text && mediaSegments.length > 0) return `${text}\n${mediaSegments.join("\n")}`;
    if (text) return text;
    return mediaSegments.join("\n");
}
