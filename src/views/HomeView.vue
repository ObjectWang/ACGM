<template>
  <div class="home">
    <!-- 顶部栏 -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="app-brand">ACGM</span>
        <el-input
          v-model="searchText"
          class="search-input"
          placeholder="搜索标题…"
          :prefix-icon="Search"
          clearable
        />
      </div>
      <div class="topbar-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="card"><el-icon><Grid /></el-icon></el-radio-button>
          <el-radio-button value="list"><el-icon><List /></el-icon></el-radio-button>
        </el-radio-group>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建条目</el-button>
      </div>
    </header>

    <div class="body">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <nav class="nav-list">
          <a
            class="nav-item"
            :class="{ active: activeCategory === 'all' }"
            @click="activeCategory = 'all'"
          >
            <el-icon><Files /></el-icon>
            <span>全部</span>
            <em class="count">{{ counts.all ?? 0 }}</em>
          </a>
          <a
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            class="nav-item"
            :class="{ active: activeCategory === opt.value }"
            @click="activeCategory = opt.value"
          >
            <span class="cat-dot" :style="{ background: opt.color }"></span>
            <span>{{ opt.label }}</span>
            <em class="count">{{ counts[opt.value] ?? 0 }}</em>
          </a>
        </nav>
        <div class="sidebar-divider"></div>
        <a class="nav-item" @click="router.push('/tags')">
          <el-icon><PriceTag /></el-icon>
          <span>标签管理</span>
        </a>
      </aside>

      <!-- 主内容区 -->
      <main class="content">
        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" v-loading="loading" class="card-grid">
          <article
            v-for="item in items"
            :key="item.id"
            class="item-card"
            @click="goDetail(item.id)"
          >
            <div class="card-cover" :style="cardCoverStyle(item)">
              <el-image
                v-if="coverUrl(item)"
                :src="coverUrl(item)"
                fit="cover"
                class="cover-img"
              />
              <template v-else>
                <el-icon class="cover-icon"><component :is="categoryIcon(item.category)" /></el-icon>
                <span class="cover-cat">{{ categoryLabel(item.category) }}</span>
              </template>
           </div>
            <div class="card-body">
              <h3 class="card-title">{{ item.title }}</h3>
              <p v-if="item.author" class="card-author">{{ item.author }}</p>
              <div class="card-meta">
                <el-rate :model-value="item.rating ?? 0" disabled size="small" />
                <span class="status-tag" :class="statusClass(item.status)">{{ item.status }}</span>
                <el-button
                  v-if="item.local_path"
                  text
                  size="small"
                  :icon="FolderOpened"
                  class="path-btn"
                  @click.stop="openPath(item)"
                />
              </div>
              <div v-if="cardTags[item.id]?.length" class="card-tags">
                <el-tag
                  v-for="tag in cardTags[item.id]"
                  :key="tag.id"
                  size="small"
                  :color="tag.color || undefined"
                  :style="tag.color ? { color: tagTextColor(tag.color), borderColor: tag.color } : {}"
                >{{ tag.name }}</el-tag>
              </div>
            </div>
            <div class="card-actions" @click.stop>
              <el-button text size="small" :icon="Edit" @click="openEdit(item)">编辑</el-button>
              <el-button text size="small" type="danger" :icon="Delete" @click="confirmDelete(item)">删除</el-button>
            </div>
          </article>
          <div v-if="!loading && items.length === 0" class="empty-state">
            <el-empty description="还没有条目，点击「新建条目」开始" />
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else v-loading="loading" class="list-wrap">
          <el-table :data="items" stripe @row-click="(row: Item) => goDetail(row.id)">
            <el-table-column label="标题" min-width="180">
              <template #default="{ row }">
                <span class="row-title">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <span class="cat-badge" :style="{ background: categoryColor(row.category) + '22', color: categoryColor(row.category) }">
                  {{ categoryLabel(row.category) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="author" label="创作者" min-width="140" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="90" />
            <el-table-column label="评分" width="140">
              <template #default="{ row }">
                <el-rate :model-value="row.rating ?? 0" disabled size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="170" />
            <el-table-column label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <el-button text size="small" @click.stop="openEdit(row)">编辑</el-button>
                <el-button text size="small" type="danger" @click.stop="confirmDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 底部：筛选 + 分页 -->
       <footer class="bottombar">
          <div class="filter-group">
            <el-select v-model="statusFilter" placeholder="状态" clearable size="small" style="width: 100px">
              <el-option v-for="s in STATUS_OPTIONS" :key="s" :label="s" :value="s" />
            </el-select>
            <el-select
              v-model="tagFilter"
              multiple
              collapse-tags
              collapse-tags-tooltip
              filterable
              placeholder="标签"
              size="small"
              style="width: 140px"
            >
              <el-option v-for="t in allTags" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
            <el-radio-group v-if="tagFilter.length > 1" v-model="tagLogic" size="small">
              <el-radio-button value="and">AND</el-radio-button>
              <el-radio-button value="or">OR</el-radio-button>
            </el-radio-group>
            <el-input-number
              v-model="ratingMin"
              :min="1"
              :max="5"
              :controls="false"
              placeholder="最低分"
              size="small"
              style="width: 72px"
            />
            <span class="filter-sep">~</span>
            <el-input-number
              v-model="ratingMax"
              :min="1"
              :max="5"
              :controls="false"
              placeholder="最高分"
              size="small"
              style="width: 72px"
            />
            <el-select v-model="localPathFilter" size="small" style="width: 110px">
              <el-option label="全部路径" value="all" />
              <el-option label="有本地路径" value="yes" />
              <el-option label="无本地路径" value="no" />
            </el-select>
            <el-select v-model="sortBy" size="small" style="width: 110px">
              <el-option label="更新时间" value="updated_at" />
              <el-option label="创建时间" value="created_at" />
              <el-option label="评分" value="rating" />
              <el-option label="标题" value="title" />
            </el-select>
            <el-button size="small" :icon="sortOrder === 'desc' ? SortDown : SortUp" @click="toggleSort" />
            <el-button text size="small" @click="resetFilters">重置</el-button>
          </div>
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            background
            small
          />
        </footer>
      </main>
    </div>

    <ItemFormDialog
      v-model:visible="dialogVisible"
      :item="editingItem"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search, Plus, Grid, List, Files, PriceTag, Edit, Delete,
  SortDown, SortUp, VideoPlay, Reading, Monitor, FolderOpened,
} from "@element-plus/icons-vue";
import type { Component } from "vue";
import { CATEGORY_OPTIONS, STATUS_OPTIONS, categoryLabel, categoryColor, tagTextColor } from "../lib/constants";
import type { Category, Item, ItemStatus, LocalPathFilter, SortField, SortOrder } from "../lib/types";
import { listItems, deleteItem, countByCategory, getTagsForItems } from "../lib/items";
import { listTags } from "../lib/tags";
import type { Tag } from "../lib/types";
import { deleteItemImages } from "../lib/api";
import { assetUrl } from "../lib/paths";
import { openLocalPath } from "../lib/localpath";
import ItemFormDialog from "../components/ItemFormDialog.vue";

const router = useRouter();

const searchText = ref("");
const viewMode = ref<"card" | "list">("card");
const activeCategory = ref<Category | "all">("all");
const statusFilter = ref<ItemStatus | "">("");
const tagFilter = ref<number[]>([]);
const tagLogic = ref<"and" | "or">("and");
const ratingMin = ref<number | null>(null);
const ratingMax = ref<number | null>(null);
const localPathFilter = ref<LocalPathFilter>("all");
const sortBy = ref<SortField>("updated_at");
const sortOrder = ref<SortOrder>("desc");
const page = ref(1);
const pageSize = 20;

const items = ref<Item[]>([]);
const total = ref(0);
const loading = ref(false);
const counts = reactive<Record<string, number>>({});

// Tags for each item card, keyed by item id.
const cardTags = ref<Record<number, Tag[]>>({});

// All available tags for the filter dropdown.
const allTags = ref<Tag[]>([]);

const dialogVisible = ref(false);
const editingItem = ref<Item | null>(null);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

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

function coverUrl(item: Item): string {
  return item.cover_path ? assetUrl(item.cover_path) : "";
}

function cardCoverStyle(item: Item): Record<string, string> {
  return coverUrl(item) ? {} : { background: coverGradient(item.category) };
}

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
    const res = await listItems({
     filters: {
       search: searchText.value.trim() || undefined,
       category: activeCategory.value,
       status: statusFilter.value || "all",
        tagIds: tagFilter.value.length ? tagFilter.value : undefined,
        tagLogic: tagLogic.value,
        ratingMin: ratingMin.value,
        ratingMax: ratingMax.value,
        hasLocalPath: localPathFilter.value,
     },
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      page: page.value,
      pageSize,
    });
   items.value = res.items;
   total.value = res.total;
    // Fetch tags for all loaded items in one query.
    if (res.items.length > 0) {
      cardTags.value = await getTagsForItems(res.items.map((i) => i.id));
    } else {
      cardTags.value = {};
    }
  } catch (e) {
    ElMessage.error("加载失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

async function loadCounts() {
  try {
    const c = await countByCategory();
    Object.keys(counts).forEach((k) => delete counts[k]);
    Object.assign(counts, c);
    const all = Object.values(c).reduce((a, b) => a + b, 0);
    counts.all = all;
  } catch {
    /* ignore */
  }
}

function goDetail(id: number) {
  router.push(`/items/${id}`);
}

async function openPath(item: Item) {
  try {
    await openLocalPath(item.local_path!);
  } catch (e) {
    ElMessage.warning(String(e));
  }
}

function openCreate() {
  editingItem.value = null;
  dialogVisible.value = true;
}

function openEdit(item: Item) {
  editingItem.value = item;
  dialogVisible.value = true;
}

function handleSaved() {
  load();
  loadCounts();
}

async function confirmDelete(item: Item) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.title}」吗？关联的图片将被一并清理。`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
    await deleteItem(item.id);
    try { await deleteItemImages(item.id); } catch { /* DB rows gone, dir may not exist */ }
    ElMessage.success("已删除");
    load();
    loadCounts();
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败：" + String(e));
  }
}

function toggleSort() {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
}

function resetFilters() {
  searchText.value = "";
  activeCategory.value = "all";
  statusFilter.value = "";
  tagFilter.value = [];
  tagLogic.value = "and";
  ratingMin.value = null;
  ratingMax.value = null;
  localPathFilter.value = "all";
  page.value = 1;
  load();
}

watch(searchText, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; load(); }, 300);
});

watch(activeCategory, () => { page.value = 1; load(); });
watch(statusFilter, () => { page.value = 1; load(); });
watch(tagFilter, () => { page.value = 1; load(); });
watch(tagLogic, () => { page.value = 1; load(); });
watch(ratingMin, () => { page.value = 1; load(); });
watch(ratingMax, () => { page.value = 1; load(); });
watch(localPathFilter, () => { page.value = 1; load(); });
watch(sortBy, () => { page.value = 1; load(); });
watch(sortOrder, () => load());
watch(page, () => load());

onMounted(() => {
  load();
  loadCounts();
  listTags().then((t) => { allTags.value = t; }).catch(() => { /* ignore */ });
});
</script>

<style scoped>
.home { display: flex; flex-direction: column; height: 100%; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #fff; border-bottom: 1px solid #ebeef5;
}
.app-brand {
  font-size: 18px; font-weight: 800; letter-spacing: 1px;
  color: #409eff; margin-right: 16px; flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; }
.search-input { width: 320px; }
.topbar-right { display: flex; align-items: center; gap: 12px; }

.body { flex: 1; display: flex; overflow: hidden; }

.sidebar {
  width: 188px; flex-shrink: 0; padding: 12px 8px;
  background: #fff; border-right: 1px solid #ebeef5;
  display: flex; flex-direction: column;
}
.nav-list { display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: 8px; cursor: pointer;
  font-size: 14px; color: #4b5563; user-select: none;
}
.nav-item:hover { background: #f3f4f6; }
.nav-item.active { background: #ecf5ff; color: #409eff; font-weight: 600; }
.nav-item .count { margin-left: auto; font-style: normal; font-size: 12px; color: #9ca3af; }
.cat-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.sidebar-divider { height: 1px; background: #ebeef5; margin: 10px 12px; }

.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.card-grid {
  flex: 1; overflow-y: auto; padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px; align-content: start;
}
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
.item-card {
  background: #fff; border: 1px solid #ebeef5; border-radius: 10px;
  overflow: hidden; cursor: pointer; display: flex; flex-direction: column;
  transition: box-shadow .18s, transform .18s;
}
.item-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.card-cover {
  aspect-ratio: 3 / 4; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
}
.cover-icon { font-size: 40px; color: #6b7280; }
.cover-cat { font-size: 13px; color: #6b7280; }
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.card-body { padding: 10px 12px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.card-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-author { margin: 0; font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: auto; }
.status-tag { font-size: 11px; padding: 1px 7px; border-radius: 4px; white-space: nowrap; }
.st-todo { background: #f3f4f6; color: #6b7280; }
.st-doing { background: #ecf5ff; color: #409eff; }
.st-done { background: #f0f9eb; color: #67c23a; }
.st-dropped { background: #fef0f0; color: #f56c6c; }
.card-actions { display: flex; justify-content: flex-end; border-top: 1px solid #f2f3f5; padding: 2px 4px; }
.path-btn { margin-left: auto; padding: 2px; height: auto; min-height: 0; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; }

.list-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; }
.row-title { font-weight: 600; cursor: pointer; }
.cat-badge { font-size: 12px; padding: 1px 8px; border-radius: 4px; }

.bottombar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px; background: #fff; border-top: 1px solid #ebeef5;
}
.filter-group { display: flex; align-items: center; gap: 8px; overflow-x: auto; flex-wrap: nowrap; }
.filter-sep { color: #909399; font-size: 12px; }
</style>
