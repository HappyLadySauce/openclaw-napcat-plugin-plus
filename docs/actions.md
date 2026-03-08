# 通用 NapCat Action 调用

为了让 OpenClaw 直接调用 NapCat 的更多接口，插件新增了统一调用面：

- `channel: "napcat"`
- `target: "action:<NapCat接口名>"`
- `text`: JSON 参数对象

示例：

```json
{
  "channel": "napcat",
  "target": "action:get_friend_list",
  "text": "{}"
}
```

```json
{
  "channel": "napcat",
  "target": "action:get_stranger_info",
  "text": "{\"user_id\":\"123456789\"}"
}
```

说明：

- `text` 必须是合法 JSON；也支持用 ```json fenced code block``` 包裹。
- 未知 action 也会透传到 NapCat，但建议优先使用已在 skill 中约定的接口。
- `sendMedia` 不支持 `action:*` 目标，action 调用只能走 `text` 参数。

## 第一批好友接口

当前已优先适配：

- `action:get_friend_list`
- `action:get_stranger_info`
- `action:set_friend_add_request`
- `action:set_friend_remark`
- `action:delete_friend`

其中：

- `set_friend_add_request` 需要 JSON：`{"flag":"<flag>","approve":true,"remark":"张三"}`
- `set_friend_remark` 需要 JSON：`{"user_id":"123456789","remark":"新备注"}`
- `get_stranger_info` 需要 JSON：`{"user_id":"123456789"}`，可选 `no_cache`

## 第二批群管理接口

当前已优先适配：

- `action:get_group_list`
- `action:get_group_info`
- `action:get_group_member_list`
- `action:set_group_ban`
- `action:set_group_kick`
- `action:set_group_card`
- `action:set_group_name`

其中：

- `get_group_info` 需要 JSON：`{"group_id":"123456789"}`，可选 `no_cache`
- `get_group_member_list` 需要 JSON：`{"group_id":"123456789"}`
- `set_group_ban` 需要 JSON：`{"group_id":"123456789","user_id":"10001","duration":1800}`
- `set_group_kick` 需要 JSON：`{"group_id":"123456789","user_id":"10001","reject_add_request":false}`
- `set_group_card` 需要 JSON：`{"group_id":"123456789","user_id":"10001","card":"新群名片"}`
- `set_group_name` 需要 JSON：`{"group_id":"123456789","group_name":"新群名"}`

建议：

- 查询类接口可直接由 agent 调用
- `set_group_ban` / `set_group_kick` / `set_group_card` / `set_group_name` 属于有副作用操作，建议由 skill 先确认参数再调用

## 第三批系统/增强接口

当前已优先适配：

- `action:get_status`
- `action:get_version_info`
- `action:get_recent_contact`
- `action:set_online_status`
- `action:ocr_image`

其中：

- `get_status` 需要 JSON：`{}`
- `get_version_info` 需要 JSON：`{}`
- `get_recent_contact` 需要 JSON：`{}`
- `set_online_status` 需要 JSON：`{"status":10}`，可选 `extStatus`、`batteryStatus`
- `ocr_image` 需要 JSON：`{"image":"<NapCat图片ID或图片标识>"}`

说明：

- `get_status` / `get_version_info` / `get_recent_contact` 属于只读查询，适合直接作为运行状态检查。
- `set_online_status` 会改变机器人 QQ 账号状态，请谨慎使用。
- `ocr_image` 依赖 NapCat 可识别的图片标识，通常更适合处理已存在于 QQ/NapCat 上下文中的图片资源。参考 [NapCat Apifox OCR 文档](https://napcat.apifox.cn/226658231e0) 和 [NapCat 接口兼容情况](https://napneko.github.io/develop/api)。

## 第四批文件接口

当前已优先适配：

- `action:upload_private_file`
- `action:upload_group_file`
- `action:get_group_root_files`
- `action:get_group_files_by_folder`
- `action:get_group_file_url`
- `action:delete_group_file`

其中：

- `upload_private_file` 需要 JSON：`{"user_id":"123456789","file":"/tmp/test.txt","name":"test.txt"}`
- `upload_group_file` 需要 JSON：`{"group_id":"123456789","file":"/tmp/test.txt","name":"test.txt"}`，可选 `folder`
- `get_group_root_files` 需要 JSON：`{"group_id":"123456789"}`
- `get_group_files_by_folder` 需要 JSON：`{"group_id":"123456789","folder_id":"/资料"}`
- `get_group_file_url` 需要 JSON：`{"group_id":"123456789","file_id":"<file_id>","busid":102}`，`busid` 视 NapCat 返回结构决定是否必传
- `delete_group_file` 需要 JSON：`{"group_id":"123456789","file_id":"<file_id>","busid":102}`，`busid` 视 NapCat 返回结构决定是否必传

说明：

- 列表/查询类接口可直接由 agent 调用。
- 上传和删除属于有副作用操作，建议由 skill 先确认目标群号、QQ 号、文件路径和 `file_id`。
- 若用户没有提供 `file_id` / `busid`，可先调用 `get_group_root_files` 或 `get_group_files_by_folder` 获取群文件元数据后再执行。

## 第五批补充文件接口

当前已优先适配：

- `action:move_group_file`
- `action:get_private_file_url`
- `action:get_file`
- `action:get_record`

其中：

- `move_group_file` 需要 JSON：`{"group_id":"123456789","file_id":"<file_id>","current_parent_directory":"/old","target_parent_directory":"/new"}`
- `get_private_file_url` 需要 JSON：`{"file_id":"<file_id>"}`
- `get_file` 需要 JSON：`{"file_id":"<file_id>"}` 或 `{"file":"<file>"}`
- `get_record` 需要 JSON：`{"file_id":"<file_id>","out_format":"mp3"}`，也可改用 `file`

说明：

- `move_group_file` 属于有副作用操作，建议先通过 `get_group_root_files` / `get_group_files_by_folder` 获取 `file_id` 和目录 ID，再确认移动目标。
- `get_private_file_url` 适合拿私聊文件直链；`get_group_file_url` 则用于群文件。
- `get_file` / `get_record` 至少需要 `file_id` 或 `file` 之一。`get_record` 适合把收到的语音转成 `mp3`、`wav` 等通用格式。

## 第六批流式文件接口

当前已优先适配：

- `action:upload_file_stream`
- `action:download_file_stream`
- `action:download_file_image_stream`
- `action:download_file_record_stream`
- `action:clean_stream_temp_file`

其中：

- `upload_file_stream` 分片阶段需要 JSON：`{"stream_id":"<stream_id>","chunk_data":"<base64>","chunk_index":0,"total_chunks":10,"file_size":12345,"expected_sha256":"<sha256>","filename":"big.bin"}`
- `upload_file_stream` 完成阶段需要 JSON：`{"stream_id":"<stream_id>","is_complete":true}`
- `download_file_stream` 需要 JSON：`{"file_id":"<file_id>"}`、`{"file":"<file>"}`，或 `{"context_video_id":"<VideoContextId>"}` / `{"context_media_id":"<MediaContextId>"}`，可选 `chunk_size`
- `download_file_image_stream` 需要 JSON：`{"file_id":"<file_id>"}`、`{"file":"<file>"}`，或 `{"context_image_id":"<ImageContextId>"}` / `{"context_media_id":"<MediaContextId>"}`，可选 `chunk_size`
- `download_file_record_stream` 需要 JSON：`{"file_id":"<file_id>"}`、`{"file":"<file>"}`，或 `{"context_audio_id":"<AudioContextId>"}` / `{"context_media_id":"<MediaContextId>"}`，可选 `chunk_size`、`out_format`
- `clean_stream_temp_file` 需要 JSON：`{}`

说明：

- 插件现已兼容 NapCat `stream-action` 多段返回：会等待同一 `echo` 的最终 `response` / `error`，并把中间分段附加到返回值中的 `stream_chunks`。
- `upload_file_stream` 适用于大文件和跨设备部署，但需要外部先准备好分片后的 base64 数据与 SHA256。
- `download_file_stream` 的官方参数是 `file` / `file_id` / `chunk_size`。插件会返回首段 `file_info`、后续 `file_chunk` 分段，以及最终 `file_complete` 汇总。
- `download_file_image_stream` 与 `download_file_stream` 类似，但插件额外支持 `context_image_id`：当图片来自当前会话的入站消息上下文时，优先用这个稳定标识，不必依赖 NapCat 内部 UUID。普通 CQ 图片文件名或原始 URL 不一定能被 `resolveDownload()` 识别。
- `download_file_record_stream` 除了普通 `file_id` / `file` 外，还支持 `context_audio_id`，可直接复用本地语音缓存；若走本地上下文快捷路径，返回的是缓存文件流，不经过 NapCat 转码临时目录。
- `download_file_stream` 还支持 `context_video_id` 与通用 `context_media_id`，适合复用当前消息中的本地视频缓存。
- `clean_stream_temp_file` 的官方行为是清空 NapCat 流式传输临时目录，不是按单个 `stream_id` 精确删除。插件现在默认启用 `safe` 模式的保守自动清理，只会在流式下载/上传成功完成且当前没有并发流式任务时自动触发；手动调用仍然可用。

建议工作流：

1. 若是当前会话刚收到的图片/语音/视频，优先从上下文中的 `ImageContexts` / `AudioContexts` / `VideoContexts` / `MediaContexts` 取稳定标识
2. 图片优先用 `{"context_image_id":"<ImageContextId>"}` 调 `action:download_file_image_stream`
3. 语音优先用 `{"context_audio_id":"<AudioContextId>"}` 调 `action:download_file_record_stream`
4. 视频优先用 `{"context_video_id":"<VideoContextId>"}` 调 `action:download_file_stream`
5. 若不是当前上下文媒体，再通过 `get_group_root_files`、`get_group_files_by_folder`、`get_file` 等方式拿稳定的 `file_id` 或 `file`
6. 消费返回中的 `stream_chunks`
7. 默认情况下，插件会在安全条件满足时自动调用 `clean_stream_temp_file`；只有需要人工兜底时，再手动调用 `action:clean_stream_temp_file`

入站媒体上下文字段：

- `ImageContextIds`: 当前消息提取到的稳定图片标识数组
- `ImageContextId`: 第一张图片的稳定标识
- `ImageContexts`: 详细数组，内含 `id`、`file`、`url`、`localPath`、`messageId`、`downloadTarget`、`downloadPayload`
- `AudioContextIds` / `AudioContextId` / `AudioContexts`: 当前消息提取到的稳定语音标识
- `VideoContextIds` / `VideoContextId` / `VideoContexts`: 当前消息提取到的稳定视频标识
- `MediaContextIds` / `MediaContextId` / `MediaContexts`: 图片/语音/视频统一视图

示例：

```json
{
  "channel": "napcat",
  "target": "action:download_file_image_stream",
  "text": "{\"context_image_id\":\"napcat-image:group:group:514572748:7613633388475457095:0\",\"chunk_size\":65536}"
}
```

## 第七批请求 / 通知接口

当前已优先适配：

- `action:set_group_add_request`
- `action:get_group_system_msg`
- `action:get_group_ignore_add_request`

其中：

- `set_group_add_request` 需要 JSON：`{"flag":"<flag>","sub_type":"add","approve":true,"reason":"欢迎加入"}`
- `get_group_system_msg` 需要 JSON：`{}`
- `get_group_ignore_add_request` 需要 JSON：`{}`

说明：

- `set_group_add_request` 用于处理群申请或群邀请；`sub_type` 当前要求显式传 `add` 或 `invite`。
- `approve=false` 时可选传 `reason` 作为拒绝说明；为兼容旧调用，也接受把 `remark` 当作 `reason` 传入。
- 推荐先调用 `get_group_system_msg` 查看待处理系统消息，再结合 webhook 记录到的 `flag` 做审批。
- 这批接口都有副作用或会影响待处理队列，建议在执行前再次确认 `flag`、`sub_type` 与目标群。
