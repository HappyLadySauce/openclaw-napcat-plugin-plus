import { Agent as HttpAgent, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { isWsTransport, sendNapCatActionOverWs } from "./ws.js";

const napcatHttpAgent = new HttpAgent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 20,
    maxFreeSockets: 10,
});

const napcatHttpsAgent = new HttpsAgent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 20,
    maxFreeSockets: 10,
});

export function appendAccessToken(rawUrl: string, token: string): string {
    const trimmedToken = String(token || "").trim();
    if (!trimmedToken) return rawUrl;
    try {
        const target = new URL(rawUrl);
        if (!target.searchParams.has("access_token")) {
            target.searchParams.set("access_token", trimmedToken);
        }
        return target.toString();
    } catch {
        return rawUrl;
    }
}

function isRetryableNapCatError(err: any): boolean {
    const code = String(err?.cause?.code || err?.code || "");
    return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "UND_ERR_SOCKET", "ECONNABORTED"].includes(code);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJsonWithNodeHttp(
    url: string,
    payload: any,
    timeoutMs: number,
    opts?: { connectionClose?: boolean; token?: string }
): Promise<{ statusCode: number; statusText: string; bodyText: string }> {
    const authedUrl = appendAccessToken(url, String(opts?.token || ""));
    const target = new URL(authedUrl);
    const isHttps = target.protocol === "https:";
    const body = JSON.stringify(payload);
    const transport = isHttps ? httpsRequest : httpRequest;
    const connectionClose = opts?.connectionClose === true;
    const agent = connectionClose ? undefined : (isHttps ? napcatHttpsAgent : napcatHttpAgent);
    const token = String(opts?.token || "").trim();

    return new Promise((resolve, reject) => {
        const req = transport(
            {
                protocol: target.protocol,
                hostname: target.hostname,
                port: target.port || (isHttps ? 443 : 80),
                path: `${target.pathname}${target.search}`,
                method: "POST",
                agent,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                    "Connection": connectionClose ? "close" : "keep-alive",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on("end", () => {
                    const bodyText = Buffer.concat(chunks).toString("utf8");
                    resolve({
                        statusCode: res.statusCode || 0,
                        statusText: res.statusMessage || "",
                        bodyText,
                    });
                });
            }
        );

        req.setTimeout(timeoutMs, () => {
            req.destroy(Object.assign(new Error(`NapCat request timeout after ${timeoutMs}ms`), { code: "ETIMEDOUT" }));
        });

        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

export async function sendToNapCat(url: string, payload: any, config: any) {
    const maxAttempts = 3;
    const timeoutsMs = [5000, 7000, 9000];
    const connectionClose = config?.connectionClose !== false;
    const token = String(config?.token || config?.accessToken || "").trim();
    const target = new URL(url);
    const targetInfo = `${target.protocol}//${target.hostname}:${target.port || (target.protocol === "https:" ? "443" : "80")}${target.pathname}`;

    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const startedAt = Date.now();
        try {
            const timeoutMs = timeoutsMs[Math.min(attempt - 1, timeoutsMs.length - 1)];
            const res = await postJsonWithNodeHttp(url, payload, timeoutMs, { connectionClose, token });
            if (res.statusCode < 200 || res.statusCode >= 300) {
                throw new Error(`NapCat API Error: ${res.statusCode} ${res.statusText}${res.bodyText ? ` | ${res.bodyText.slice(0, 300)}` : ""}`);
            }

            const elapsedMs = Date.now() - startedAt;
            console.log(`[NapCat] sendToNapCat success attempt ${attempt}/${maxAttempts} ${targetInfo} in ${elapsedMs}ms (connection=${connectionClose ? "close" : "keep-alive"})`);

            if (!res.bodyText) return { status: "ok" };
            try {
                return JSON.parse(res.bodyText);
            } catch {
                return { status: "ok", raw: res.bodyText };
            }
        } catch (err: any) {
            lastErr = err;
            const retryable = isRetryableNapCatError(err);
            const elapsedMs = Date.now() - startedAt;
            if (!retryable || attempt >= maxAttempts) {
                console.error(`[NapCat] sendToNapCat failed attempt ${attempt}/${maxAttempts} ${targetInfo} in ${elapsedMs}ms: ${err?.cause?.code || err?.code || err}`);
                break;
            }
            const backoffMs = attempt * 400;
            console.warn(`[NapCat] sendToNapCat retry ${attempt}/${maxAttempts} ${targetInfo} in ${elapsedMs}ms; backoff ${backoffMs}ms; reason=${err?.cause?.code || err?.code || err}`);
            await sleep(backoffMs);
        }
    }

    throw lastErr;
}

export function endpointToAction(endpoint: string): string {
    return endpoint.replace(/^\/+/, "").trim();
}

export async function sendNapCatByTransport(config: any, endpoint: string, payload: any) {
    if (isWsTransport(config)) {
        const action = endpointToAction(endpoint);
        return sendNapCatActionOverWs(action, payload, Number(config?.wsRequestTimeoutMs || 10000));
    }
    const baseUrl = config?.url || "http://127.0.0.1:3000";
    return sendToNapCat(`${baseUrl}${endpoint}`, payload, config);
}

export async function callNapCatAction(config: any, action: string, payload: any = {}) {
    const normalizedAction = String(action || "").replace(/^\/+/, "").trim();
    if (!normalizedAction) {
        throw new Error("NapCat action is required");
    }
    return sendNapCatByTransport(config, `/${normalizedAction}`, payload || {});
}
