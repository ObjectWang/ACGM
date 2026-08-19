<template>
  <div class="detail" v-loading="loading">
    <header class="detail-top">
      <el-button :icon="ArrowLeft" text @click="router.back()">返回</el-button>
      <div class="detail-actions">
        <el-button :icon="Edit" @click="openEdit">编辑</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDelete">删除</el-button>
      </div>
    </header>

    <div v-if="item" class="detail-body">
      <!-- 封面区（Step 3 接入图片） -->
      <div class="cover-area" :style="{ background: coverGradient(item.category) }">
        <el-icon class="cover-icon"><component :is="categoryIcon(item.category)" /></el-icon>
        <span class="cover-cat">{{ categoryLabel(item.category) }}</span>
      </div>

      <!-- 标题 / 元信息 -->
      <section class="info-section">
        <h1 class="detail-title">{{ item.title }}</h1>
        <div class="meta-row">
          <span class="cat-badge" :style="{ background: categoryColor(item.category) + '22', color: categoryColor(item.category) }">
            {{ categoryLabel(item.category) }}
          </span>
          <span v-if="item.author" class="meta-text">创作者：{{ item.author }}</span>
          <el-rate :model-value="item.rating ?? 0" disabled show-text :texts="rateTexts" />
          <span class="status-tag" :class="statusClass(item.status)">{{ item.status }}</span>
        </div>
      </section>

      <!-- 本地路径（Step 4 接入跳转） -->
      <section v-if="item.local_path" class="info-section">
        <div class="path-row">
          <span class="section-label">本地路径</span>
          <code class="path-text">{{ item.local_path }}</code>
        </div>
      </section>

      <!-- 标签（Step 5 接入） -->
      <section class="info-section">
        <span class="section-label">标签</span>
        <span class="muted">（将在标签系统步骤接入）</span>
      </section>

      <!-- 截图画廊（Step 3 接入） -->
      <section class="info-section">
        <span class="section-label">截图</span>
        <span class="muted">（将在图片管理步骤接入）</span>
      </section>

      <!-- 简介 -->
      <section v-if="item.description" class="info-section">
        <h2 class="section-heading">简介</h2>
        <p class="description-text">{{ item.description }}</p>
      </section>

      <!-- 个人评价（Step 7 接入 Markdown 渲染） -->
      <section v-if="item.review" class="info-section">
        <h2 class="section-heading">个人评价</h2>
        <pre class="review-text">{{ item.review }}</pre>
      </section>
    </div>

    <el-empty v-else-if="!loading" description="条目不存在或已删除" />

    <ItemFormDialog v-model:visible="dialogVisible" :item="item" @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowLeft, Edit, Delete, VideoPlay, Reading, Monitor, FolderOpened,
} from "@element-plus/icons-vue";
import type { Component } from "vue";
import { categoryLabel, categoryColor } from "../lib/constants";
import type { Category, Item, ItemStatus } from "../lib/types";
import { getItem, deleteItem } from "../lib/items";
import { deleteItemImages } from "../lib/api";
import ItemFormDialog from "../components/ItemFormDialog.vue";

const props = defineProps<{ id: string }>();
const router = useRouter();

const item = ref<Item | null>(null);
const loading = ref(true);
const dialogVisible = ref(false);

const rateTexts = ["1 星", "2 星", "3 星", "4 星", "5 星"];

const categoryIcon = (cat: Category): Component => {
  switch (cat) {
    case "anime": return VideoPlay;
    case "comic": return Reading;
    case "game": return Monitor;
    default: return FolderOpened;
  }
};

const coverGradient = (cat: Category): string => {
  const c = categoryColor(cat);
  return `linear-gradient(135deg, ${c}33, ${c}11)`;
};

const statusClass = (s: ItemStatus): string => {
  switch (s) {
    case "已完成": return "st-done";
    case "进行中": return "st-doing";
    case "已弃坑": return "st-dropped";
    default: return "st-todo";
  }
};

async function load() {
  loading.value = true;
  try {
    const id = Number(props.id);
    item.value = await getItem(id);
  } catch (e) {
    ElMessage.error("加载失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

function openEdit() {
  dialogVisible.value = true;
}

function handleSaved() {
  load();
}

async function confirmDelete() {
  if (!item.value) return;
  try {
    await ElMessageBox.confirm(`确定删除「${item.value.title}」吗？关联的图片将被一并清理。`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
    await deleteItem(item.value.id);
    try { await deleteItemImages(item.value.id); } catch { /* ignore */ }
    ElMessage.success("已删除");
    router.push("/");
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败：" + String(e));
  }
}

onMounted(load);
</script>

<style scoped>
.detail { display: flex; flex-direction: column; height: 100%; overflow-y: auto; background: #f5f6f8; }
.detail-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 24px; background: #fff; border-bottom: 1px solid #ebeef5;
  position: sticky; top: 0; z-index: 10;
}
.detail-actions { display: flex; gap: 8px; }

.detail-body { max-width: 760px; margin: 0 auto; padding: 24px; width: 100%; }

.cover-area {
  width: 220px; aspect-ratio: 3 / 4; border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; margin-bottom: 20px;
}
.cover-icon { font-size: 56px; color: #6b7280; }
.cover-cat { font-size: 14px; color: #6b7280; }

.info-section { margin-bottom: 22px; }
.detail-title { margin: 0 0 12px; font-size: 24px; font-weight: 700; }
.meta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.meta-text { font-size: 14px; color: #6b7280; }
.cat-badge { font-size: 13px; padding: 2px 10px; border-radius: 4px; }
.status-tag { font-size: 12px; padding: 2px 10px; border-radius: 4px; }
.st-todo { background: #f3f4f6; color: #6b7280; }
.st-doing { background: #ecf5ff; color: #409eff; }
.st-done { background: #f0f9eb; color: #67c23a; }
.st-dropped { background: #fef0f0; color: #f56c6c; }

.section-label { font-size: 13px; color: #6b7280; margin-right: 8px; }
.section-heading { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
.muted { color: #c0c4cc; font-size: 13px; }
.path-text { font-size: 13px; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
.description-text { margin: 0; font-size: 14px; line-height: 1.7; white-space: pre-wrap; color: #374151; }
.review-text { margin: 0; font-size: 14px; line-height: 1.7; white-space: pre-wrap; color: #374151; font-family: inherit; background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #ebeef5; }
</style>
