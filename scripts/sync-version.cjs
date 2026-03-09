#!/usr/bin/env node
/**
 * Sync version from package.json to openclaw.plugin.json,
 * then pack to .tgz in dist/.
 * Run from repo root (e.g. npm run version:patch or postversion).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const pluginPath = path.join(root, "openclaw.plugin.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;
const name = pkg.name;
if (!version) {
  console.error("sync-version: package.json has no version");
  process.exit(1);
}

const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
plugin.version = version;
fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
console.log("sync-version: openclaw.plugin.json set to version", version);

// Pack to dist/
const distDir = path.join(root, "dist");
fs.mkdirSync(distDir, { recursive: true });
const tgzName = `${name}-${version}.tgz`;
execSync(`npm pack --pack-destination="${distDir}"`, { cwd: root, stdio: "inherit" });
console.log("sync-version: dist/", tgzName);
