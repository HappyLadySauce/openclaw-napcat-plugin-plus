# 使用说明

## 入站媒体识别说明

当 QQ 通过 NapCat 发送图片（`[CQ:image,...]`）、语音（`[CQ:record,...]`）或视频（`[CQ:video,...]`）时：

- 插件会在入站阶段解析 CQ 段：
  - 提取 `url` / `file`，生成图片/音频 URL 列表
  - 将纯文本中的图片 CQ 片段剥离，只保留用户正文
- 为了兼容容器环境与远程模型取图限制，插件会优先把入站图片/语音/视频下载到 OpenClaw 本地缓存目录，再通过 `MediaPath` / `MediaPaths` / `MediaType` / `MediaTypes` 交给 OpenClaw。
- 注入到上下文中的 `MediaPath` / `MediaPaths` 会优先使用工作区相对路径（例如 `./napcat-inbound-media/xxx.png`），避免把容器内绝对路径直接暴露给模型而触发本地路径访问限制。
- 解析结果会注入到 OpenClaw 上下文中，例如：
  - `MediaUrls` / `MediaUrl`
  - `ImageUrls` / `Images`
  - `AudioUrls` / `Audios`
  - `VideoUrls` / `Videos`
  - `MediaPath` / `MediaPaths`
  - `MediaType` / `MediaTypes`
  - `ImageContexts` / `AudioContexts` / `VideoContexts`
  - `MediaContexts` / `MediaContextIds`
- 上层 agent 会把这些媒体作为多模态输入交给模型，从而真正看到图片/语音，而不是只看到 `[CQ:image,...]` 这一串文本。

自动清理说明：

- 本地入站媒体缓存默认保留 `24h`，超时后会在后续入站处理或上下文读取时惰性清理。
- 仍被 `context_*_id` 引用的本地文件不会被提前删除，避免上下文命中后出现 `ENOENT`。
- 超过 TTL 后，对应 `context_image_id` / `context_audio_id` / `context_video_id` 也会一并过期，需要从新的消息上下文重新获取。

相关配置：

- `inboundImageEnabled`: 控制是否启用入站 CQ 媒体解析（默认启用）
- `inboundImagePreferUrl`: 控制在 CQ 同时提供 `url` 和 `file` 时优先使用哪一个（默认优先 `url`）
- `inboundMediaAutoCleanupEnabled`: 控制是否自动清理过期的本地缓存
- `inboundMediaTtlMs`: 控制本地缓存和 `context_*_id` 的复用窗口
- `inboundMediaCleanupMinIntervalMs`: 控制本地缓存扫描的最小间隔

## 发送消息说明

为了确保正确路由，请明确指定 `channel: "napcat"`，并使用以下目标格式：

私聊目标
- `agent:<agentId>:session:napcat:private:<QQ号>`（当前会话优先）
- `private:<QQ号>`
- `session:napcat:private:<QQ号>`

群聊目标
- `agent:<agentId>:session:napcat:group:<群号>`（当前会话优先）
- `group:<群号>`
- `session:napcat:group:<群号>`

注意：

- 若当前上下文里已经给出 `ConversationLabel` / `SessionKey`，优先直接复用 `agent:<agentId>:session:napcat:*` 这个完整会话标签。
- 纯数字 `target` 会被当作私聊用户 ID，群聊请务必加上 `group:` 或 `session:napcat:group:` 前缀。
- 不要使用旧的 `agent:<agentId>:napcat:group:<群号>` / `agent:<agentId>:napcat:private:<QQ号>` 标签，它不代表当前 NapCat 会话上下文。
- 调用 `message` 工具发送时必须传 `target`；不要只传 `groupId` 或 `userId`。

## 跨设备图片发送（临时媒体 HTTP 服务）

当 OpenClaw 与 NapCat 在不同设备时，建议开启媒体代理，让 NapCat 通过 OpenClaw 提供的 HTTP 地址拉取图片：

```json
{
  "channels": {
    "napcat": {
      "url": "http://192.168.1.20:3000",
      "mediaProxyEnabled": true,
      "publicBaseUrl": "http://192.168.1.10:18789",
      "mediaProxyToken": "change-me"
    }
  }
}
```

- 插件会把 `mediaUrl` 自动改写为 `http://<OpenClaw>/napcat/media?...` 供 NapCat 访问。
- 若设置了 `mediaProxyToken`，NapCat 拉取时必须携带匹配令牌。
- 请确保 NapCat 设备能访问 `publicBaseUrl` 对应地址与端口。

## 语音发送（WAV）

- 当 `mediaUrl` 是音频后缀（如 `.wav`）时，插件会自动按语音消息发送（`CQ:record`）。
- 若 `mediaUrl` 是相对文件名（如 `test.wav`），会自动拼接 `voiceBasePath`（例如 `/tmp/napcat-voice/test.wav`）。
- 开启媒体代理后，语音文件也会走 `/napcat/media`，适合 OpenClaw 与 NapCat 分机部署。

## Skill（napcat-qq）

本仓库包含 Skill：`skill/napcat-qq`，用于强制使用本插件发送 QQ 消息并规范 sessionKey。
