# OpenClaw NapCat Plugin

[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue.svg)](https://openclaw.ai)

QQ 聊天通道插件 for OpenClaw，基于 NapCat (OneBot 11) 实现。部署完毕后，可通过 QQ 与 OpenClaw 对话、下达指令。

## 功能介绍

- **消息收发**：接收私聊与群组消息，支持文本、图片等媒体收发，群聊可配置「仅 @ 时回复」或全量处理。
- **会话路由**：群聊/私聊 sessionKey 路由，可配置接收用户白名单（`allowUsers`），与 OpenClaw 消息路由无缝对接。
- **NapCat Action**：通过 `action:<接口名>` 调用 NapCat 接口，涵盖好友列表/申请/备注、群列表/成员/禁言/踢人/群名片、文件上传下载、流式文件、群申请/邀请审批、状态/版本/OCR 等。
- **入站媒体**：入站图片/语音/视频解析为多模态上下文（如 `MediaPath`、`ImageContexts`），供模型使用；支持媒体代理与语音发送（WAV）。
- **日志与审计**：好友申请、群申请/邀请、Notice 事件可写日志，便于审批与风控。

完整说明见 [docs/usage.md](docs/usage.md) 与 [docs/actions.md](docs/actions.md)。

## 安装

**从 npm 安装（推荐）：**

```bash
openclaw plugins install openclaw-napcat-plugin-plus
```

或从 [GitHub Releases](https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus/releases) 下载 tgz 后执行 `openclaw plugins install ./openclaw-napcat-plugin-plus-1.0.1.tgz`。

详细步骤见 [docs/install.md](docs/install.md)。

## 配置与使用方法

在 `openclaw.json` 中配置 `channels.napcat` 与 `plugins.entries.napcat`。传输方式二选一：**HTTP**（推荐）或 **WebSocket**。

### HTTP（推荐）

发消息每次对 NapCat 的 HTTP 端口发起请求，不依赖长连接，**定时任务（cron）触发时投递稳定**。

**OpenClaw 配置示例：**

```json
{
  "channels": {
    "napcat": {
      "enabled": true,
      "transport": "http",
      "url": "http://127.0.0.1:3000",
      "token": "napcat"
    }
  },
  "plugins": { "entries": { "napcat": { "enabled": true } } }
}
```

**NapCat 侧**：启用「Http 服务器」（如 Host `0.0.0.0`、Port `3000`）和「Http 客户端」（Url 填 `http://<OpenClaw 地址>/napcat`，消息格式 String）。详见 [docs/napcat-setup.md](docs/napcat-setup.md)。

### WebSocket

- **ws-client**：OpenClaw 主动连 NapCat 的 WebSocket 服务器（NapCat 开「Websocket 服务器」，OpenClaw 配 `transport: "ws-client"`、`wsUrl`、`wsToken`）。
- **ws-server**：OpenClaw 开 WebSocket 服务，NapCat 用「Websocket 客户端」反向连接（OpenClaw 配 `transport: "ws-server"`、`wsHost`、`wsPort`、`wsToken`）。

**注意：WebSocket 与 cron 定时任务的兼容问题**

- 使用 **WebSocket**（`ws-client` 或 `ws-server`）时，发消息依赖与 NapCat 的 WS 长连接。网关的 health-monitor 在连接异常时会重启 napcat 通道，若 **cron 定时任务恰好在重启窗口或 WS 未就绪时执行，可能报错或投递失败**。
- **若你有通过 cron 触发的定时发消息/巡检等需求，请优先使用 HTTP 传输**，并在 NapCat 侧同时启用 HTTP 服务器与指向 OpenClaw `/napcat` 的 HTTP 客户端，以保证定时任务稳定执行。

完整配置项与传输模式说明见 [docs/configuration.md](docs/configuration.md)，NapCat 侧 HTTP/WebSocket 设置见 [docs/napcat-setup.md](docs/napcat-setup.md)。

## 许可证

MIT License

## 致谢

- [OpenClaw](https://openclaw.ai)
- [NapCat](https://github.com/NapCatQQ/NapCat)
