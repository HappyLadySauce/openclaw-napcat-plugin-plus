# NapCat 配置

## HTTP

在 NapCat 网络配置界面新建以下网络配置并启用：

Http 服务器
- Host: 0.0.0.0
- Port: 3000

Http 客户端
- Url: `http://127.0.0.1:18789/napcat`
- 消息格式: String

如果 OpenClaw 运行在不同的机器上，请在 Http 客户端中使用实际 IP 地址。

## WebSocket

### 方式 A：OpenClaw 使用 `ws-client`（连接 NapCat WS 服务器）

NapCat 新建并启用 `Websocket 服务器`：
- Host: `0.0.0.0`
- Port: `3001`
- Token: `napcat`（与 `wsToken` 对应）
- 心跳间隔：建议 `30000`
- 消息格式：建议 `Array`

OpenClaw 示例：

```json
{
  "channels": {
    "napcat": {
      "transport": "ws-client",
      "wsUrl": "ws://1Panel-localnapcat-sGYW:3001/",
      "wsToken": "napcat",
      "wsHeartbeatMs": 30000,
      "wsReconnectMs": 30000
    }
  }
}
```

### 方式 B：OpenClaw 使用 `ws-server`（NapCat WS 客户端反向连接）

NapCat 新建并启用 `Websocket 客户端`：
- URL: `ws://<OpenClaw可达地址>:3001/`
- Token: `napcat`（与 `wsToken` 对应）
- 心跳间隔：建议 `30000`
- 重连间隔：建议 `30000`
- 消息格式：建议 `Array`

OpenClaw 示例：

```json
{
  "channels": {
    "napcat": {
      "transport": "ws-server",
      "wsHost": "0.0.0.0",
      "wsPort": 3001,
      "wsPath": "/",
      "wsToken": "napcat",
      "wsHeartbeatMs": 30000
    }
  }
}
```

两种方式都建议先确保容器间网络互通，再切换生产配置。
