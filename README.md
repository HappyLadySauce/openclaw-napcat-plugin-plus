# OpenClaw NapCat Plugin Plus

[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue.svg)](https://openclaw.ai)

本仓库是 **openclaw-napcat-plugin-plus**（Plus 版），在 [原版 openclaw-napcat-plugin](https://github.com/ProperSAMA/openclaw-napcat-plugin) 基础上做了功能增强与扩展。本文档描述的是 **Plus 版** 的安装、配置与使用；若你只关心基础 QQ 通道接入，也可参考原版 README。

---

## 这是什么插件？

这是一个给 **OpenClaw** 用的 **QQ 通道插件**。  
它通过 **NapCat（OneBot 11）** 把 QQ 私聊、群聊接进 OpenClaw，让你可以直接在 QQ 里和 OpenClaw 对话。

你可以把它理解成：

- **OpenClaw** = 大脑
- **NapCat** = QQ 适配器
- **这个插件（Plus 版）** = 把两边接起来的桥，并额外提供更多 NapCat 能力

配好以后，你就可以：

- 在 QQ 私聊里直接找 OpenClaw
- 在 QQ 群里 @ 它让它回复
- 发图片、语音，通过 Action 调用好友/群管理、文件、流式文件、群申请审批等

---

## Plus 版有什么特点？

在基础 QQ 通道之上，Plus 版重点增强了这些能力：

- **传输方式**：支持 **HTTP**（推荐）和 **WebSocket**（`ws-client` / `ws-server`）两种方式，可按部署与定时任务需求选择。
- **NapCat Action**：通过 `action:<接口名>` 统一调用 NapCat 接口，包括好友列表/申请/备注、群列表/成员/禁言/踢人/群名片、文件上传下载、**流式文件**、群申请/邀请审批、状态/版本/OCR 等（详见 [docs/actions.md](docs/actions.md)）。
- **多模态入站**：入站图片/语音/视频解析为多模态上下文（如 `MediaPath`、`ImageContexts`），供模型直接使用。
- **媒体与语音**：支持媒体代理（跨设备发图）、语音发送（WAV 等）。
- **日志与审计**：好友申请、群申请/群邀请、Notice 事件可写日志，便于审批与风控（详见 [docs/logs-and-audit.md](docs/logs-and-audit.md)）。

适合既需要「QQ 上直接对话」，又需要「通过 OpenClaw 调用更多 QQ/NapCat 能力」的场景。

---

## 一句话理解安装流程

你需要把三件事接起来：

1. **NapCat 正常运行**
2. **OpenClaw 安装本插件（Plus 版）**
3. **NapCat 把消息转发给 OpenClaw**（HTTP 或 WebSocket）

只要这三步通了，基本就能用。

---

## 开始前，你需要准备什么

在安装前，最好先确认你已经有：

- 一个能正常运行的 **OpenClaw**
- 一个能正常运行的 **NapCat**
- 能编辑 `~/.openclaw/openclaw.json`
- 能重启 OpenClaw Gateway

如果你对 NapCat 还不熟，可以先把 NapCat 单独跑起来，确认它本身没问题，再来接 OpenClaw。

---

## 最简单上手方式（推荐 HTTP）

如果你只想尽快跑通，先按这个最小方案来，用 **HTTP** 传输（推荐，且定时任务更稳定）。

### 第 1 步：安装插件

**方式 A：从 npm 安装（推荐）**

```bash
openclaw plugins install openclaw-napcat-plugin-plus
```

**方式 B：从 GitHub 或本地安装**

在 [Releases](https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus/releases) 下载 `openclaw-napcat-plugin-plus-*.tgz`，或 clone 后打包：

```bash
git clone https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus.git
cd openclaw-napcat-plugin-plus
npm pack
openclaw plugins install ./openclaw-napcat-plugin-plus-1.0.2.tgz
```

也可以直接安装目录：`openclaw plugins install /path/to/openclaw-napcat-plugin-plus`。

---

### 第 2 步：放入 Skill（可选但推荐）

项目里有一个 `skill/napcat-qq`。  
把它放到 OpenClaw 的 skill 目录里，可以让 OpenClaw 更稳定地使用这个 QQ 通道。

---

### 第 3 步：修改 OpenClaw 配置

打开：

```text
~/.openclaw/openclaw.json
```

加入或修改下面这段（**HTTP 最小可用配置**）：

```json
{
  "channels": {
    "napcat": {
      "enabled": true,
      "transport": "http",
      "url": "http://127.0.0.1:3000",
      "token": "napcat",
      "enableGroupMessages": true,
      "groupMentionOnly": true
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

意思是：

- 启用 `napcat` 通道，用 **HTTP** 和 NapCat 通信
- NapCat 的 HTTP 服务地址是 `http://127.0.0.1:3000`
- 访问令牌是 `napcat`（若 NapCat 侧启用了 token，需一致）
- 允许处理群消息，但群里必须 **@ 机器人** 才会回复

---

### 第 4 步：重启 OpenClaw Gateway

```bash
openclaw gateway restart
```

---

### 第 5 步：在 NapCat 里添加网络配置

去 NapCat 的网络配置界面，新增并启用下面两项：

**A. Http 服务器**

- Host: `0.0.0.0`
- Port: `3000`

**B. Http 客户端**

- Url: `http://127.0.0.1:18789/napcat`
- 消息格式: `String`

如果 **OpenClaw 和 NapCat 不在同一台机器上**，这里要改成 OpenClaw 那台机器的真实 IP，例如：`http://192.168.1.10:18789/napcat`。

详见 [docs/napcat-setup.md](docs/napcat-setup.md)。

---

### 第 6 步：测试

**私聊测试**：直接给对应 QQ 发消息。

**群聊测试**：在群里发：

```text
@机器人 你好
```

如果配置正确，OpenClaw 就会开始处理消息。

---

## HTTP 和 WebSocket 怎么选？

Plus 版支持 **HTTP** 和 **WebSocket** 两种传输方式。

### 推荐：HTTP

- 发消息时每次对 NapCat 的 HTTP 端口发起请求，不依赖长连接
- **定时任务（cron）触发时投递稳定**，不会因连接状态导致漏发
- 配置简单：`transport: "http"`、`url`、`token`，并在 NapCat 侧开 Http 服务器 + Http 客户端即可

### 可选：WebSocket

- **ws-client**：OpenClaw 主动连 NapCat 的 WebSocket 服务器（NapCat 开「Websocket 服务器」，OpenClaw 配 `transport: "ws-client"`、`wsUrl`、`wsToken`）
- **ws-server**：OpenClaw 开 WebSocket 服务，NapCat 用「Websocket 客户端」反向连接（OpenClaw 配 `transport: "ws-server"`、`wsHost`、`wsPort`、`wsToken`）

**重要：WebSocket 与 cron 定时任务的兼容问题**

- 使用 **WebSocket** 时，发消息依赖与 NapCat 的 WS 长连接。网关在连接异常时会重启 napcat 通道，若 **cron 定时任务恰好在重启窗口或 WS 未就绪时执行，可能报错或投递失败**。
- **若你有通过 cron 触发的定时发消息、巡检等需求，请优先使用 HTTP 传输**，并在 NapCat 侧同时启用 HTTP 服务器与指向 OpenClaw `/napcat` 的 HTTP 客户端。

完整传输模式与配置项见 [docs/configuration.md](docs/configuration.md)、[docs/napcat-setup.md](docs/napcat-setup.md)。

---

## 如果只想让特定 QQ 号能用

可以加白名单：

```json
{
  "channels": {
    "napcat": {
      "enabled": true,
      "transport": "http",
      "url": "http://127.0.0.1:3000",
      "token": "napcat",
      "allowUsers": ["123456789", "987654321"],
      "enableGroupMessages": true,
      "groupMentionOnly": true
    }
  }
}
```

只有这两个 QQ 号发来的消息会触发机器人，其他人会被忽略。建议在意权限时开启。

---

## 群聊怎么工作？

| 模式 | 配置 | 适合 |
|------|------|------|
| 不处理群消息 | `"enableGroupMessages": false` | 只做私聊助手 |
| 处理群消息，但必须 @ 机器人（推荐） | `"enableGroupMessages": true`, `"groupMentionOnly": true` | 大多数群聊场景 |
| 处理所有群消息 | `"enableGroupMessages": true`, `"groupMentionOnly": false` | 确定需要全群监听时（一般不推荐） |

---

## 发消息时，目标怎么写？

要让 OpenClaw 主动往 QQ 发消息，请明确写目标格式。

**私聊**：`private:<QQ号>` 或 `session:napcat:private:<QQ号>`，例如 `private:123456789`。

**群聊**：`group:<群号>` 或 `session:napcat:group:<群号>`，例如 `group:123456789`。

**容易踩坑**：只写纯数字会被当成 **私聊 QQ 号**。要发到群，**一定要加 `group:` 前缀**。

![消息格式](image/消息格式.png)

更多格式见 [docs/usage.md](docs/usage.md)。

---

## 图片、语音、跨设备怎么处理？

- **图片 / 语音**：插件支持把图片、语音（如 WAV）当 QQ 消息发送；相对路径的语音会按 `voiceBasePath` 拼接。
- **跨设备**：OpenClaw 和 NapCat 不在同一台机器时，常出现「文字能发、图片发不出去」。建议开启 **媒体代理**：`mediaProxyEnabled: true`、`publicBaseUrl` 填 NapCat 能访问到的 OpenClaw 地址。详见 [docs/usage.md](docs/usage.md)。

---

## Plus 版增强能力一览

除基础消息收发外，Plus 版还提供：

- **好友**：好友列表、陌生人信息、好友申请处理、好友备注、删除好友
- **群管理**：群列表、群信息、成员列表、禁言、踢人、群名片、群名
- **系统/增强**：状态、版本、最近联系人、在线状态、图片 OCR
- **文件**：私聊/群文件上传、群文件列表、文件 URL、删除/移动群文件、私聊文件直链、本地文件获取、语音转码
- **流式文件**：流式上传/下载、图片/语音/视频流、入站媒体上下文字段（如 `context_image_id`）
- **请求与通知**：群申请/邀请审批、群系统消息、忽略加群设置

完整 Action 列表与参数见 [docs/actions.md](docs/actions.md)。

---

## 常见问题

**1. 私聊能用，群里没反应**  
检查：`enableGroupMessages` 是否为 `true`，是否在群里真的 @ 了机器人，`allowUsers` 是否把发消息的人排除在外。

**2. 消息到了 NapCat，但 OpenClaw 没回复**  
检查：NapCat 的 Http 客户端 URL 是否指向正确的 OpenClaw 地址、Gateway 是否在运行、插件是否已安装并启用；可查看 `inboundLogDir` 日志确认消息是否进入插件。

**3. 文字能发，图片发不出去**  
多为跨机器部署且未开媒体代理。请开启 `mediaProxyEnabled`，并确保 `publicBaseUrl` 是 NapCat 能访问的 OpenClaw 地址。

**4. 纯数字 target 发错地方了**  
纯数字会被当成私聊。要发群消息请写 `group:<群号>`。

**5. 定时任务（cron）发消息失败或不稳定**  
请改用 **HTTP** 传输（`transport: "http"`），并在 NapCat 侧启用 HTTP 服务器与 HTTP 客户端，避免依赖 WebSocket 长连接。

---

## 进阶文档

| 文档 | 说明 |
|------|------|
| [docs/install.md](docs/install.md) | 安装方式（npm / GitHub / 本地）、维护者发版流程 |
| [docs/configuration.md](docs/configuration.md) | 完整配置项与传输模式 |
| [docs/napcat-setup.md](docs/napcat-setup.md) | NapCat 侧 HTTP / WebSocket 配置 |
| [docs/usage.md](docs/usage.md) | 入站媒体、发送消息、跨设备、语音、Skill |
| [docs/actions.md](docs/actions.md) | NapCat Action 调用（好友/群/文件/流式/审批等） |
| [docs/logs-and-audit.md](docs/logs-and-audit.md) | 好友申请、群申请与 Notice 日志审计 |

---

## License

MIT License

---

## 致谢

- [OpenClaw](https://openclaw.ai)
- [NapCat](https://github.com/NapCatQQ/NapCat)
- [原版 openclaw-napcat-plugin](https://github.com/ProperSAMA/openclaw-napcat-plugin)
