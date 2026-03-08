import {
    coerceInteger,
    coerceNonEmptyString,
    requireObjectPayload,
} from "../napcat-action-params.js";
import { callNapCatAction } from "../napcat-transport.js";

async function getStatus(config: any) {
    return callNapCatAction(config, "get_status", {});
}

async function getVersionInfo(config: any) {
    return callNapCatAction(config, "get_version_info", {});
}

async function getRecentContact(config: any) {
    return callNapCatAction(config, "get_recent_contact", {});
}

async function setOnlineStatus(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_online_status");
    const status = coerceInteger(payload.status, "status");
    const requestPayload: Record<string, any> = { status };
    if (payload.extStatus !== undefined) {
        requestPayload.extStatus = coerceInteger(payload.extStatus, "extStatus");
    }
    if (payload.batteryStatus !== undefined) {
        requestPayload.batteryStatus = coerceInteger(payload.batteryStatus, "batteryStatus");
    }
    return callNapCatAction(config, "set_online_status", requestPayload);
}

async function ocrImage(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "ocr_image");
    const image = coerceNonEmptyString(payload.image ?? payload.image_id ?? payload.file, "image");
    return callNapCatAction(config, "ocr_image", { image });
}

export const systemActionHandlers: Record<string, (config: any, rawPayload: any) => Promise<any>> = {
    get_status: getStatus,
    get_version_info: getVersionInfo,
    get_recent_contact: getRecentContact,
    set_online_status: setOnlineStatus,
    ocr_image: ocrImage,
};
