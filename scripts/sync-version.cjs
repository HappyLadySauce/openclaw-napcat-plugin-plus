#!/usr/bin/env node
/**
 * Sync version from package.json to openclaw.plugin.json,
 * then pack to .tgz in dist/.
 * Run from repo root.
 * Usage:
 *   node scripts/sync-version.cjs           # use version from package.json
 *   node scripts/sync-version.cjs 1.0.3      # set version to 1.0.3
 *   npm run version:set -- 1.0.3
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const pluginPath = path.join(root, "openclaw.plugin.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const name = pkg.name;

let version = process.argv[2] ? process.argv[2].trim() : pkg.version;
if (!version) {
  console.error("sync-version: package.json has no version and none given");
  process.exit(1);
}
// basic semver-like check (x.y.z)
if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version)) {
  console.error("sync-version: invalid version (expected e.g. 1.0.3):", version);
  process.exit(1);
}

if (process.argv[2]) {
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("sync-version: package.json set to version", version);
}

const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
plugin.version = version;
fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
console.log("sync-version: openclaw.plugin.json set to version", version);

// Pack to dist/
const distDir = path.join(root, "dist");
fs.mkdirSync(distDir, { recursive: true });
// Remove previous tgz in dist
try {
  for (const f of fs.readdirSync(distDir)) {
    if (f.endsWith(".tgz")) fs.unlinkSync(path.join(distDir, f));
  }
} catch (_) {}
const tgzName = `${name}-${version}.tgz`;
execSync(`npm pack --pack-destination="${distDir}"`, { cwd: root, stdio: "inherit" });
console.log("sync-version: dist/", tgzName);
