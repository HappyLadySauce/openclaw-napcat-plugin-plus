# 安装方法

## 方式一：从 npm 安装（推荐）

若插件已发布到 npm，可直接：

```bash
openclaw plugins install openclaw-napcat-plugin-plus
```

## 方式二：从 GitHub 下载安装

1. 在 [Releases](https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus/releases) 下载 `openclaw-napcat-plugin-plus-*.tgz`，或 clone 仓库后本地打包：
   ```bash
   git clone https://github.com/HappyLadySauce/openclaw-napcat-plugin-plus.git
   cd openclaw-napcat-plugin-plus
   npm pack
   ```
2. 安装插件（任选其一）：
   ```bash
   openclaw plugins install openclaw-napcat-plugin-plus-1.0.0.tgz
   # 或从本地目录安装
   openclaw plugins install /path/to/openclaw-napcat-plugin-plus
   ```
3. 将 `skill/napcat-qq` 放入 OpenClaw 的 skill 目录中（若需使用配套 Skill）。
4. 在 `openclaw.json` 中配置 `channels.napcat` 与 `plugins.entries.napcat`（见 [配置方法](configuration.md)）。
5. 重启 OpenClaw Gateway：`openclaw gateway restart`
