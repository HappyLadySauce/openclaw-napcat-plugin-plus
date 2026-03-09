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
   openclaw plugins install openclaw-napcat-plugin-plus-1.0.1.tgz
   # 或从本地目录安装
   openclaw plugins install /path/to/openclaw-napcat-plugin-plus
   ```
3. 将 `skill/napcat-qq` 放入 OpenClaw 的 skill 目录中（若需使用配套 Skill）。
4. 在 `openclaw.json` 中配置 `channels.napcat` 与 `plugins.entries.napcat`（见 [配置方法](configuration.md)）。
5. 重启 OpenClaw Gateway：`openclaw gateway restart`

---

## 维护者发版说明

版本以 `package.json` 的 `version` 为准，会通过脚本同步到 `openclaw.plugin.json`。发版流程：

1. 更新代码后执行其一：
   - `npm run version:patch`（修订号 +1）
   - `npm run version:minor`（次版本 +1）
   - `npm run version:major`（主版本 +1）
2. 提交并打 tag（请将下面的 `vx.y.z` 替换为实际版本，或使用 `v$(node -p "require('./package.json').version")`）：
   ```bash
   git add .
   git commit -m "chore: release v$(node -p "require('./package.json').version")"
   git tag v$(node -p "require('./package.json').version")
   ```
3. 推送代码与 tag：
   ```bash
   git push origin main
   git push origin --tags
   ```
4. 在 GitHub 上等待 Actions 完成，Release 及 `.tgz`、`.zip` 将自动生成并上传。  
   **注意**：CI 会校验 tag 与 `package.json` 的 version 一致，不一致则构建失败。
