# OpenClaw NapCat Plugin

[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue.svg)](https://openclaw.ai)

QQ 聊天通道插件 for OpenClaw，基于 NapCat (OneBot 11) 实现。部署完毕后，可通过 QQ 与 OpenClaw 对话、下达指令。

## 功能特性

- 接收私聊和群组消息，支持文本与图片等媒体收发
- 支持群聊/私聊 sessionKey 路由与可配置接收白名单
- 支持 `action:<接口名>` 方式调用 NapCat 通用接口（好友、群管理、文件、流式、请求与通知等）
- 与 OpenClaw 无缝集成，完整消息路由与会话管理

完整功能说明见 [docs/usage.md](docs/usage.md) 与 [docs/actions.md](docs/actions.md)。

## 安装

**从 npm 安装（推荐）：**

```bash
openclaw plugins install openclaw-napcat-plugin-plus
```

或从 [GitHub Releases](https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus/releases) 下载 tgz 后执行 `openclaw plugins install ./openclaw-napcat-plugin-plus-*.tgz`。

详细步骤见 [docs/install.md](docs/install.md)。

## 配置

在 `openclaw.json` 中配置 `channels.napcat` 与 `plugins.entries.napcat`。完整配置项与传输模式说明见 [docs/configuration.md](docs/configuration.md)，NapCat 侧 HTTP/WebSocket 设置见 [docs/napcat-setup.md](docs/napcat-setup.md)。

## 源码结构

重构后的 `src/` 目录按“入口层 + 共享模块 + 领域模块”组织，后续继续扩展接口时建议优先复用 barrel 入口：

- `src/channel.ts`：NapCat channel 入口，保留插件声明、配置接入、`sendText`、`sendMedia`
- `src/webhook.ts`：NapCat webhook 入口，保留 HTTP 入口、事件分发、兼容导出
- `src/index.ts`：共享模块 barrel，统一导出 target、transport、message format、action params、媒体上下文、日志、消息事件等公共能力
- `src/actions/index.ts`：action handler barrel，统一导出 `friend` / `group` / `request-notice` / `system` / `file` / `stream` handlers
- `src/runtime.ts`：插件运行时与当前 channel 配置的全局访问入口
- `src/ws.ts`：NapCat WebSocket transport、连接管理、心跳、`stream-action` 聚合
- `src/napcat-transport.ts`：HTTP/WS 发送、token 注入、通用 `callNapCatAction`
- `src/napcat-message-format.ts`：CQ 媒体格式化、媒体代理 URL、回复消息拼装
- `src/napcat-media-context-store.ts`：`context_*_id`、TTL、本地缓存清理
- `src/napcat-inbound-media.ts`：CQ 媒体解析、本地下载、上下文构建
- `src/napcat-message-event.ts`：入站消息主流程、session 路由、多模态上下文注入、reply dispatcher
- `src/napcat-friend-request.ts`：好友申请日志与自动处理
- `src/napcat-group-request.ts`：群申请 / 群邀请事件审计
- `src/napcat-notice-event.ts`：高价值 notice 事件审计
- `src/napcat-media-proxy.ts`：`/napcat/media` 代理处理
- `src/napcat-inbound-log.ts`：入站日志与 parse-error 日志

维护约定：

- 入口文件优先从 `src/index.ts` 或 `src/actions/index.ts` 导入，减少零散相对路径
- `runtime.ts` 与 `ws.ts` 也已经纳入 `src/index.ts` 统一导出；上层编排模块可直接经由 barrel 使用
- 叶子模块尽量直接依赖具体文件，避免从总 barrel 反向导入导致循环依赖
- 若新增 NapCat action，优先放到 `src/actions/` 下对应领域文件，再由 `src/actions/index.ts` 和 `src/napcat-action-dispatch.ts` 注册

## 开发

### 项目结构

```
openclaw-napcat-plugin/
├── index.ts              # 插件入口
├── openclaw.plugin.json  # 插件元数据
├── package.json          # npm 配置
├── src/
│   ├── channel.ts        # 通道实现（发送消息）
│   ├── runtime.ts        # 运行时状态管理
│   ├── webhook.ts        # HTTP 入站处理（接收消息）
│   └── ws.ts             # WebSocket 传输层（client/server）
```

## 发布到网上（维护者）

方便他人通过 npm 或 GitHub 下载安装：

1. **发布到 npm**（需先 [npm 登录](https://www.npmjs.com/)）：
   ```bash
   npm publish
   ```
   发布后用户可执行：`openclaw plugins install openclaw-napcat-plugin-plus`

2. **或通过 GitHub Releases 提供 tgz**：
   ```bash
   npm pack
   ```
   将生成的 `openclaw-napcat-plugin-plus-1.0.0.tgz` 上传到 [Releases](https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus/releases)，用户下载后执行：
   `openclaw plugins install ./openclaw-napcat-plugin-plus-1.0.0.tgz`

3. **可选：加入 OpenClaw 插件目录**  
   若希望出现在 OpenClaw 的渠道/插件目录中，可将本包信息加入目录 JSON（见 [文档 - 发现和优先级](https://docs.openclaw.ai/zh-CN/tools/plugin) 中的「包集合」与 `OPENCLAW_PLUGIN_CATALOG_PATHS`）。

## 许可证

MIT License

## 致谢

- [OpenClaw](https://openclaw.ai)
- [NapCat](https://github.com/NapCatQQ/NapCat)
