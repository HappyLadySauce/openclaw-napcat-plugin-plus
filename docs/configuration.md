# 配置方法

在 `~/.openclaw/openclaw.json` 中添加或修改 `channels.napcat` 配置：

```json
{
  "channels": {
    "napcat": {
      "enabled": true,
      "agentId": "main",
      "transport": "http",
      "url": "http://127.0.0.1:3000",
      "token": "napcat",
      "wsUrl": "ws://127.0.0.1:3001/",
      "wsHost": "0.0.0.0",
      "wsPort": 3001,
      "wsPath": "/",
      "wsToken": "napcat",
      "wsHeartbeatMs": 30000,
      "wsReconnectMs": 30000,
      "wsRequestTimeoutMs": 10000,
      "actionTimeoutMs": 10000,
      "inboundMediaDir": "./workspace/napcat-inbound-media",
      "inboundMediaAutoCleanupEnabled": true,
      "inboundMediaTtlMs": 86400000,
      "inboundMediaCleanupMinIntervalMs": 300000,
      "streamTempAutoCleanupEnabled": true,
      "streamTempAutoCleanupMode": "safe",
      "inboundImageEnabled": true,
      "inboundImagePreferUrl": true,
      "autoApproveFriendRequests": false,
      "friendAutoRemarkTemplate": "",
      "friendRequestAllowUsers": [],
      "friendRequestLogDir": "./logs/napcat-friend-requests",
      "allowUsers": [
        "123456789",
        "987654321"
      ],
      "enableGroupMessages": true,
      "groupMentionOnly": true,
      "mediaProxyEnabled": true,
      "publicBaseUrl": "http://127.0.0.1:18789",
      "voiceBasePath": "/your/voice/path",
      "enableInboundLogging": true,
      "inboundLogDir": "/your/inbound/log/dir"
    }
  },
  "plugins": {
    "entries": {
      "napcat": {
        "enabled": true
      }
    }
  }
}
```

## 配置项说明

| 配置项 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `transport` | string | 传输模式：`http` / `ws-client` / `ws-server` | `http` |
| `url` | string | NapCat HTTP 服务地址 | `http://127.0.0.1:3000` |
| `token` | string | NapCat HTTP 访问令牌（自动以 Bearer + access_token 发送） | `""` |
| `wsUrl` | string | `ws-client` 模式连接地址（例如 `ws://127.0.0.1:3001/`） | `""` |
| `wsHost` | string | `ws-server` 监听地址（也作为 `ws-client` 的回退 host） | `0.0.0.0` |
| `wsPort` | number | `ws-server` 监听端口（也作为 `ws-client` 的回退 port） | `3001` |
| `wsPath` | string | WS 路径（例如 `/`、`/onebot/v11/ws`） | `/` |
| `wsToken` | string | WebSocket 鉴权令牌（Bearer + access_token） | `""` |
| `wsHeartbeatMs` | number | WS 心跳间隔（毫秒） | `30000` |
| `wsReconnectMs` | number | WS 重连间隔（毫秒，仅 `ws-client` 生效） | `30000` |
| `wsRequestTimeoutMs` | number | WS action 请求超时（毫秒） | `10000` |
| `actionTimeoutMs` | number | NapCat 通用 action 的超时提示配置（当前主要用于文档约定） | `10000` |
| `agentId` | string | 可选，固定将 NapCat 会话绑定到该 OpenClaw agent（如 `main`、`ops`） | `""`（空=按默认路由） |
| `allowUsers` | string[] | 允许接收消息的 QQ 用户 ID 列表 | `[]` (接收所有) |
| `enableGroupMessages` | boolean | 是否处理群消息 | `false` |
| `groupMentionOnly` | boolean | 群消息是否需要 @ 机器人 | `true` |
| `mediaProxyEnabled` | boolean | 启用 `/napcat/media` 媒体代理（跨设备发图推荐） | `false` |
| `publicBaseUrl` | string | OpenClaw 对 NapCat 可达的地址（如 `http://127.0.0.1:18789`） | `""` |
| `mediaProxyToken` | string | 媒体代理可选访问令牌 | `""` |
| `voiceBasePath` | string | 相对语音文件名的基础目录（例如 `/tmp/napcat-voice`） | `""` |
| `enableInboundLogging` | boolean | 是否记录入站消息日志 | `true` |
| `inboundLogDir` | string | 入站消息与 notice 审计日志目录 | `"./logs/napcat-inbound"` |
| `inboundImageEnabled` | boolean | 是否解析入站 CQ:image/CQ:record 为多模态输入 | `true` |
| `inboundImagePreferUrl` | boolean | 解析图片时是否优先使用 CQ 中的 `url` 字段（否则优先 `file`） | `true` |
| `inboundMediaDir` | string | 入站媒体本地缓存目录，插件会先下载到这里再交给 OpenClaw | `"./workspace/napcat-inbound-media"` |
| `inboundMediaAutoCleanupEnabled` | boolean | 是否自动清理过期的入站媒体本地缓存 | `true` |
| `inboundMediaTtlMs` | number | 入站媒体与 `context_*_id` 的保留时长（毫秒） | `86400000` |
| `inboundMediaCleanupMinIntervalMs` | number | 两次本地缓存扫描之间的最小间隔（毫秒） | `300000` |
| `streamTempAutoCleanupEnabled` | boolean | 是否在安全条件下自动清理 NapCat 流式临时目录 | `true` |
| `streamTempAutoCleanupMode` | string | 流式临时目录自动清理模式：`off` / `safe` | `"safe"` |
| `autoApproveFriendRequests` | boolean | 是否自动同意收到的好友申请 | `false` |
| `friendAutoRemarkTemplate` | string | 自动同意好友申请时的备注模板，支持 `{userId}` / `{nickname}` / `{comment}` | `""` |
| `friendRequestAllowUsers` | string[] | 自动同意好友申请的 QQ 白名单，空数组表示不限制 | `[]` |
| `friendRequestLogDir` | string | 好友 / 群申请审计日志目录 | `"./logs/napcat-friend-requests"` |

**群消息说明：**
- `enableGroupMessages: false`（默认）：完全忽略群消息
- `enableGroupMessages: true, groupMentionOnly: true`：只有 @ 机器人时才处理
- `enableGroupMessages: true, groupMentionOnly: false`：处理所有群消息（不推荐）

## 传输模式说明

- `transport: "http"`：兼容原有 HTTP Server + HTTP Client 方式（默认推荐）
- `transport: "ws-client"`：OpenClaw 主动连接 NapCat 的 WebSocket Server
- `transport: "ws-server"`：OpenClaw 提供 WebSocket Server，NapCat 以 WebSocket Client 反向连接

说明：
- HTTP/WS 均支持 `token` 鉴权（同时发送 `Authorization: Bearer <token>` 与 `access_token` 查询参数）。
- `wsReconnectMs` 仅 `ws-client` 使用；`ws-server` 模式无重连参数（由 NapCat 客户端负责重连）。

## 定时任务与传输模式

- **`transport: "http"`**：发消息时每次对 NapCat 的 HTTP 端口（如 3000）发起独立请求，不依赖长连接。网关侧对 napcat 通道的健康检查也与连接状态解耦，定时任务（cron）触发时通常能稳定投递。
- **`transport: "ws-client"`**：发消息走 WebSocket，依赖 OpenClaw 到 NapCat 的 WS 长连接。网关的 health-monitor 会因“通道进程/连接停止”而反复重启 napcat 通道（日志中可见 `[napcat] [default] auto-restart attempt N/10`）。若定时任务恰好在重启窗口或 WS 未就绪时执行，可能报错或投递失败。
- **建议**：若定时任务必须稳定成功，优先使用 `transport: "http"`，并在 NapCat 侧同时启用 HTTP 服务器（如 3000）和 HTTP 客户端（指向 OpenClaw 的 `/napcat`）。若需使用 `ws-client`，可排查网关侧为何将 napcat 判为 stopped（例如 WS 断开或通道进程退出），待通道稳定后再依赖定时任务。
