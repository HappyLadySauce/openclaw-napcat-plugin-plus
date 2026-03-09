#!/usr/bin/env node
/**
 * Sync version from package.json to openclaw.plugin.json.
 * Run from repo root (e.g. npm run version:patch or postversion).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const pluginPath = path.join(root, "openclaw.plugin.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;
if (!version) {
  console.error("sync-version: package.json has no version");
  process.exit(1);
}

const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
plugin.version = version;
fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
console.log("sync-version: openclaw.plugin.json set to version", version);
