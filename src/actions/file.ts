import {
    buildFileIdentityPayload,
    coerceGroupId,
    coerceInteger,
    coerceNonEmptyString,
    coerceUserId,
    requireObjectPayload,
} from "../napcat-action-params.js";
import { callNapCatAction } from "../napcat-transport.js";

async function uploadPrivateFile(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "upload_private_file");
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    const file = coerceNonEmptyString(payload.file ?? payload.path ?? payload.url, "file");
    const requestPayload: Record<string, any> = {
        user_id: userId,
        file,
    };
    if (payload.name !== undefined) {
        requestPayload.name = coerceNonEmptyString(payload.name, "name");
    }
    return callNapCatAction(config, "upload_private_file", requestPayload);
}

async function uploadGroupFile(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "upload_group_file");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const file = coerceNonEmptyString(payload.file ?? payload.path ?? payload.url, "file");
    const requestPayload: Record<string, any> = {
        group_id: groupId,
        file,
    };
    if (payload.name !== undefined) {
        requestPayload.name = coerceNonEmptyString(payload.name, "name");
    }
    const folder = payload.folder ?? payload.folder_id ?? payload.folderId;
    if (folder !== undefined && String(folder).trim()) {
        requestPayload.folder = String(folder).trim();
    }
    return callNapCatAction(config, "upload_group_file", requestPayload);
}

async function getPrivateFileUrl(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_private_file_url");
    const fileId = coerceNonEmptyString(payload.file_id ?? payload.fileId, "file_id");
    return callNapCatAction(config, "get_private_file_url", { file_id: fileId });
}

async function getFile(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_file");
    return callNapCatAction(config, "get_file", buildFileIdentityPayload(payload));
}

async function getRecord(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_record");
    const requestPayload = buildFileIdentityPayload(payload);
    if (payload.out_format !== undefined) {
        requestPayload.out_format = coerceNonEmptyString(payload.out_format, "out_format");
    } else if (payload.outFormat !== undefined) {
        requestPayload.out_format = coerceNonEmptyString(payload.outFormat, "outFormat");
    }
    return callNapCatAction(config, "get_record", requestPayload);
}

export const fileActionHandlers: Record<string, (config: any, rawPayload: any) => Promise<any>> = {
    upload_private_file: uploadPrivateFile,
    upload_group_file: uploadGroupFile,
    get_private_file_url: getPrivateFileUrl,
    get_file: getFile,
    get_record: getRecord,
};
