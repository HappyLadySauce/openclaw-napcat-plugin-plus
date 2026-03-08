import {
    coerceBoolean,
    coerceGroupId,
    coerceInteger,
    coerceNonEmptyString,
    coerceUserId,
    requireObjectPayload,
} from "../napcat-action-params.js";
import { callNapCatAction } from "../napcat-transport.js";

async function getGroupList(config: any) {
    return callNapCatAction(config, "get_group_list", {});
}

async function getGroupInfo(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_group_info");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const requestPayload: Record<string, any> = { group_id: groupId };
    const noCacheRaw = payload.no_cache ?? payload.noCache;
    if (noCacheRaw !== undefined) {
        requestPayload.no_cache = coerceBoolean(noCacheRaw, "no_cache");
    }
    return callNapCatAction(config, "get_group_info", requestPayload);
}

async function getGroupMemberList(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_group_member_list");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    return callNapCatAction(config, "get_group_member_list", { group_id: groupId });
}

async function setGroupBan(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_group_ban");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    const durationRaw = payload.duration ?? 1800;
    const duration = coerceInteger(durationRaw, "duration");
    return callNapCatAction(config, "set_group_ban", {
        group_id: groupId,
        user_id: userId,
        duration,
    });
}

async function setGroupKick(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_group_kick");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    const requestPayload: Record<string, any> = {
        group_id: groupId,
        user_id: userId,
    };
    const rejectAddRequestRaw = payload.reject_add_request ?? payload.rejectAddRequest;
    if (rejectAddRequestRaw !== undefined) {
        requestPayload.reject_add_request = coerceBoolean(rejectAddRequestRaw, "reject_add_request");
    }
    return callNapCatAction(config, "set_group_kick", requestPayload);
}

async function setGroupCard(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_group_card");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    const card = String(payload.card ?? payload.group_card ?? "").trim();
    if (!card) {
        throw new Error("set_group_card 需要非空 card");
    }
    return callNapCatAction(config, "set_group_card", {
        group_id: groupId,
        user_id: userId,
        card,
    });
}

async function setGroupName(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_group_name");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const groupName = String(payload.group_name ?? payload.groupName ?? "").trim();
    if (!groupName) {
        throw new Error("set_group_name 需要非空 group_name");
    }
    return callNapCatAction(config, "set_group_name", {
        group_id: groupId,
        group_name: groupName,
    });
}

async function getGroupRootFiles(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_group_root_files");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    return callNapCatAction(config, "get_group_root_files", { group_id: groupId });
}

async function getGroupFilesByFolder(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_group_files_by_folder");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const folderId = coerceNonEmptyString(payload.folder_id ?? payload.folderId ?? payload.folder, "folder_id");
    return callNapCatAction(config, "get_group_files_by_folder", {
        group_id: groupId,
        folder_id: folderId,
    });
}

async function getGroupFileUrl(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_group_file_url");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const fileId = coerceNonEmptyString(payload.file_id ?? payload.fileId, "file_id");
    const requestPayload: Record<string, any> = { group_id: groupId, file_id: fileId };
    const busid = payload.busid ?? payload.bus_id ?? payload.busId;
    if (busid !== undefined) {
        requestPayload.busid = coerceInteger(busid, "busid");
    }
    return callNapCatAction(config, "get_group_file_url", requestPayload);
}

async function deleteGroupFile(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "delete_group_file");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const fileId = coerceNonEmptyString(payload.file_id ?? payload.fileId, "file_id");
    const requestPayload: Record<string, any> = { group_id: groupId, file_id: fileId };
    const busid = payload.busid ?? payload.bus_id ?? payload.busId;
    if (busid !== undefined) {
        requestPayload.busid = coerceInteger(busid, "busid");
    }
    return callNapCatAction(config, "delete_group_file", requestPayload);
}

async function moveGroupFile(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "move_group_file");
    const groupId = coerceGroupId(payload.group_id ?? payload.groupId);
    const fileId = coerceNonEmptyString(payload.file_id ?? payload.fileId, "file_id");
    const currentParentDirectory = coerceNonEmptyString(
        payload.current_parent_directory ?? payload.currentParentDirectory ?? payload.from_folder ?? payload.fromFolder,
        "current_parent_directory"
    );
    const targetParentDirectory = coerceNonEmptyString(
        payload.target_parent_directory ?? payload.targetParentDirectory ?? payload.to_folder ?? payload.toFolder,
        "target_parent_directory"
    );
    return callNapCatAction(config, "move_group_file", {
        group_id: groupId,
        file_id: fileId,
        current_parent_directory: currentParentDirectory,
        target_parent_directory: targetParentDirectory,
    });
}

export const groupActionHandlers: Record<string, (config: any, rawPayload: any) => Promise<any>> = {
    get_group_list: getGroupList,
    get_group_info: getGroupInfo,
    get_group_member_list: getGroupMemberList,
    set_group_ban: setGroupBan,
    set_group_kick: setGroupKick,
    set_group_card: setGroupCard,
    set_group_name: setGroupName,
    get_group_root_files: getGroupRootFiles,
    get_group_files_by_folder: getGroupFilesByFolder,
    get_group_file_url: getGroupFileUrl,
    delete_group_file: deleteGroupFile,
    move_group_file: moveGroupFile,
};
