# 日志与审计

## 好友申请日志与自动处理

NapCat 上报 `post_type=request` + `request_type=friend` 时，插件会：

- 把好友申请写入 `friendRequestLogDir`
- 若 `autoApproveFriendRequests=true`，会直接调用 `set_friend_add_request`
- 若配置了 `friendRequestAllowUsers`，仅对白名单 QQ 生效

默认日志目录：

- `./logs/napcat-friend-requests/requests.log`
- `./logs/napcat-friend-requests/qq-<QQ号>.log`

## 群申请 / 群邀请日志

NapCat 上报 `post_type=request` + `request_type=group` 时，插件会：

- 把群申请和群邀请写入 `friendRequestLogDir`
- 在 `requests.log` 中保留总览，便于统一检索最近待处理项
- 同时按群和按用户拆分文件，便于审批前回看上下文

默认日志文件：

- `./logs/napcat-friend-requests/requests.log`
- `./logs/napcat-friend-requests/group-<群号>.log`
- `./logs/napcat-friend-requests/qq-<QQ号>.log`

常用字段：

- `ts`、`group_id`、`user_id`、`sub_type`、`comment`、`flag`、`status`

## Notice 事件审计

NapCat 上报 `post_type=notice` 时，插件会把事件写入 `inboundLogDir` 下的 notice 日志。

首批重点覆盖：

- `group_increase`
- `group_decrease`
- `group_recall`
- `group_ban`
- `group_admin`

默认日志文件：

- `./logs/napcat-inbound/notices.log`
- `./logs/napcat-inbound/notices/group-<群号>.log`
- `./logs/napcat-inbound/notices/qq-<QQ号>.log`

说明：

- 当前阶段以统一审计和后续工作流衔接为主，默认不会自动执行群治理动作。
- 每条记录会保留 `notice_type`、`sub_type`、`operator_id`、`message_id`、`duration` 等关键字段，便于后续 skill/agent 做审批、回溯或风控。
