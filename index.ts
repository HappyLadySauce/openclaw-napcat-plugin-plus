import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { napcatPlugin } from "./src/channel.js";
import { handleNapCatWebhook, handleNapCatInboundBody } from "./src/webhook.js";
import { setNapCatRuntime } from "./src/runtime.js";
import { startNapCatWs, stopNapCatWs } from "./src/ws.js";

const plugin = {
  id: "napcat",
  name: "NapCatQQ",
  description: "QQ channel via NapCat (OneBot 11)",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setNapCatRuntime(api.runtime);
    api.registerChannel({ plugin: napcatPlugin as any });

    // Compatibility: old SDKs expose registerHttpHandler, newer SDKs prefer registerHttpRoute.
    const anyApi = api as any;
    if (typeof anyApi.registerHttpRoute === "function") {
      anyApi.registerHttpRoute({
        path: "/napcat",
        handler: handleNapCatWebhook,
        auth: "plugin",
      });
    } else if (typeof anyApi.registerHttpHandler === "function") {
      anyApi.registerHttpHandler(handleNapCatWebhook);
    } else {
      throw new Error("NapCat plugin: no HTTP registration API found (registerHttpRoute/registerHttpHandler)");
    }

    const loadNapCatConfig = () => {
      const cfg = (api as any)?.runtime?.config?.loadConfig?.() || {};
      return cfg?.channels?.napcat || {};
    };

    startNapCatWs(loadNapCatConfig(), handleNapCatInboundBody).catch((err) => {
      console.error("[NapCat][WS] initial start failed:", err);
    });

    const pollTimer = setInterval(() => {
      startNapCatWs(loadNapCatConfig(), handleNapCatInboundBody).catch((err) => {
        console.error("[NapCat][WS] start/update failed:", err);
      });
    }, 10000);

    const anyApiWithDispose = api as any;
    if (typeof anyApiWithDispose.onDispose === "function") {
      anyApiWithDispose.onDispose(async () => {
        clearInterval(pollTimer);
        await stopNapCatWs();
      });
    }
  },
};

export default plugin;
