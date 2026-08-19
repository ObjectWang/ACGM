import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import router from "./router";
import "./styles/global.css";

import { initDataDir } from "./lib/paths";
import { getDbUrl } from "./lib/api";
import { setDbUrl } from "./lib/db";

// Initialize the app data dir path before mounting so assetUrl() is ready.
async function bootstrap() {
  try {
    await initDataDir();
    // Use the exact same URL string the Rust backend registered migrations for.
    const url = await getDbUrl();
    setDbUrl(url);
  } catch {
    /* running outside Tauri (e.g. plain browser dev) — keep default URL */
  }
  createApp(App).use(ElementPlus).use(router).mount("#app");
}

bootstrap();
