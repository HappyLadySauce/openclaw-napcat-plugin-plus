import {
    coerceBoolean,
    coerceUserId,
    requireObjectPayload,
} from "../napcat-action-params.js";
import { callNapCatAction } from "../napcat-transport.js";

async function getFriendList(config: any) {
    return callNapCatAction(config, "get_friend_list", {});
}

async function approveFriendRequest(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_friend_add_request");
    const flag = String(payload.flag || "").trim();
    if (!flag) {
        throw new Error("set_friend_add_request 需要 flag");
    }
    const approve = coerceBoolean(payload.approve, "approve");
    const remark = String(payload.remark || "").trim();
    const requestPayload: Record<string, any> = { flag, approve };
    if (remark) requestPayload.remark = remark;
    return callNapCatAction(config, "set_friend_add_request", requestPayload);
}

async function setFriendRemark(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "set_friend_remark");
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    const remark = String(payload.remark || "").trim();
    if (!remark) {
        throw new Error("set_friend_remark 需要非空 remark");
    }
    return callNapCatAction(config, "set_friend_remark", {
        user_id: userId,
        remark,
    });
}

async function getStrangerInfo(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "get_stranger_info");
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    const noCacheRaw = payload.no_cache ?? payload.noCache;
    const requestPayload: Record<string, any> = { user_id: userId };
    if (noCacheRaw !== undefined) {
        requestPayload.no_cache = coerceBoolean(noCacheRaw, "no_cache");
    }
    return callNapCatAction(config, "get_stranger_info", requestPayload);
}

async function deleteFriend(config: any, rawPayload: any) {
    const payload = requireObjectPayload(rawPayload, "delete_friend");
    const userId = coerceUserId(payload.user_id ?? payload.userId);
    return callNapCatAction(config, "delete_friend", { user_id: userId });
}

export const friendActionHandlers: Record<string, (config: any, rawPayload: any) => Promise<any>> = {
    get_friend_list: getFriendList,
    set_friend_add_request: approveFriendRequest,
    set_friend_remark: setFriendRemark,
    get_stranger_info: getStrangerInfo,
    delete_friend: deleteFriend,
};
