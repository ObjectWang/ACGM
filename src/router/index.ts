import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import DetailView from "../views/DetailView.vue";
import TagsView from "../views/TagsView.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/items/:id", name: "detail", component: DetailView, props: true },
    { path: "/tags", name: "tags", component: TagsView },
  ],
});

export default router;
