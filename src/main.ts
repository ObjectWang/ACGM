import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import router from "./router";
import "./styles/global.css";

import { initDataDir } from "./lib/paths";

// Initialize the app data dir path before mounting so assetUrl() is ready.
initDataDir()
  .catch(() => {
    /* running outside Tauri (e.g. plain browser dev) — assetUrl returns "" */
  })
  .finally(() => {
    createApp(App).use(ElementPlus).use(router).mount("#app");
  });
