<template>
  <div class="gallery" v-loading="loading">
    <!-- 封面区 -->
    <div class="cover-row">
      <div class="cover-preview" :style="!coverUrl ? { background: '#f0f1f3' } : {}">
        <el-image
          v-if="coverUrl"
          :src="coverUrl"
          fit="cover"
          :preview-src-list="previewList"
          :initial-index="coverPreviewIndex"
          preview-teleported
          class="cover-img"
        />
        <el-icon v-else class="cover-placeholder-icon"><Picture /></el-icon>
      </div>
      <div class="cover-side">
        <el-button size="small" :icon="Picture" @click="pickCover">
          {{ cover ? "替换封面" : "上传封面" }}
        </el-button>
        <p class="cover-hint">JPG / PNG / WebP，≤ 10MB</p>
      </div>
    </div>

    <!-- 截图区 -->
    <div class="shots-section">
      <div class="shots-header">
        <span class="shots-title">截图（{{ screenshots.length }}/5）</span>
        <el-button
          size="small"
          :icon="Plus"
          :disabled="screenshots.length >= 5"
          @click="pickScreenshot"
        >添加截图</el-button>
      </div>

      <div v-if="allImages.length === 0" class="shots-empty">
        <el-text type="info" size="small">还没有图片，上传封面或截图来丰富条目</el-text>
      </div>

      <div class="shots-grid">
        <div
          v-for="img in allImages"
          :key="img.id"
          class="shot-card"
        >
          <el-image
            :src="thumbUrl(img)"
            fit="cover"
            :preview-src-list="previewList"
            :initial-index="previewIndex(img.id)"
            preview-teleported
            class="shot-img"
          />
          <span v-if="img.is_cover" class="cover-badge">封面</span>
          <div class="shot-overlay">
            <el-button
              v-if="!img.is_cover"
              text
              size="small"
              @click="handleSetCover(img)"
            >设为封面</el-button>
            <el-button
              text
              size="small"
              type="danger"
              :icon="Delete"
              @click="handleDelete(img)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { ElMessage, ElMessageBox } from "element-plus";
import { Picture, Plus, Delete } from "@element-plus/icons-vue";
import { assetUrl } from "../lib/paths";
import type { ItemImage } from "../lib/types";
import {
  listImages,
  uploadCoverImage,
  uploadScreenshot,
  setCoverImage,
  deleteImageComplete,
} from "../lib/images";

const props = defineProps<{ itemId: number }>();
const emit = defineEmits<{ "cover-changed": [] }>();

const allImages = ref<ItemImage[]>([]);
const loading = ref(false);

const cover = computed(() => allImages.value.find((img) => img.is_cover === 1) ?? null);
const screenshots = computed(() => allImages.value.filter((img) => img.is_cover === 0));

const coverUrl = computed(() => (cover.value ? assetUrl(cover.value.file_path) : ""));

// Full-size URLs for the el-image lightbox, ordered cover-first then screenshots.
const previewList = computed(() => {
  const urls: string[] = [];
  if (cover.value) urls.push(assetUrl(cover.value.file_path));
  for (const img of screenshots.value) urls.push(assetUrl(img.file_path));
  return urls;
});

const coverPreviewIndex = computed(() => 0);

function thumbUrl(img: ItemImage): string {
  return assetUrl(img.thumb_path ?? img.file_path);
}

function previewIndex(imgId: number): number {
  return previewList.value.indexOf(
    assetUrl(allImages.value.find((i) => i.id === imgId)?.file_path ?? "")
  );
}

const IMAGE_FILTERS = [{ name: "图片", extensions: ["jpg", "jpeg", "png", "webp"] }];

async function loadImages() {
  loading.value = true;
  try {
    allImages.value = await listImages(props.itemId);
  } catch (e) {
    ElMessage.error("加载图片失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

async function pickCover() {
  const selected = await open({ multiple: false, filters: IMAGE_FILTERS });
  if (!selected || typeof selected !== "string") return;

  // Replace: remove old cover first so we don't accumulate stale covers.
  if (cover.value) {
    await deleteImageComplete(props.itemId, cover.value.id);
  }

  loading.value = true;
  try {
    await uploadCoverImage(props.itemId, selected);
    await loadImages();
    emit("cover-changed");
    ElMessage.success("封面上传成功");
  } catch (e) {
    ElMessage.error("上传封面失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

async function pickScreenshot() {
  if (screenshots.value.length >= 5) {
    ElMessage.warning("最多 5 张截图");
    return;
  }
  const selected = await open({ multiple: false, filters: IMAGE_FILTERS });
  if (!selected || typeof selected !== "string") return;

  loading.value = true;
  try {
    await uploadScreenshot(props.itemId, selected);
    await loadImages();
    ElMessage.success("截图上传成功");
  } catch (e) {
    ElMessage.error("上传截图失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

async function handleSetCover(img: ItemImage) {
  loading.value = true;
  try {
    await setCoverImage(props.itemId, img.id, img.file_path);
    await loadImages();
    emit("cover-changed");
    ElMessage.success("已设为封面");
  } catch (e) {
    ElMessage.error("设置封面失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

async function handleDelete(img: ItemImage) {
  try {
    await ElMessageBox.confirm("确定删除这张图片吗？", "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
    await deleteImageComplete(props.itemId, img.id);
    await loadImages();
    if (img.is_cover) emit("cover-changed");
    ElMessage.success("已删除");
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败：" + String(e));
  }
}

watch(() => props.itemId, loadImages);
onMounted(loadImages);
</script>

<style scoped>
.gallery { display: flex; flex-direction: column; gap: 20px; }

.cover-row { display: flex; gap: 20px; align-items: flex-start; }
.cover-preview {
  width: 200px; aspect-ratio: 3 / 4; border-radius: 10px;
  overflow: hidden; flex-shrink: 0; border: 1px solid #ebeef5;
  display: flex; align-items: center; justify-content: center;
}
.cover-img { width: 100%; height: 100%; }
.cover-placeholder-icon { font-size: 40px; color: #c0c4cc; }
.cover-side { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.cover-hint { margin: 0; font-size: 12px; color: #909399; }

.shots-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.shots-title { font-size: 14px; font-weight: 600; }
.shots-empty { padding: 12px 0; }

.shots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.shot-card {
  position: relative; aspect-ratio: 4 / 3; border-radius: 8px;
  overflow: hidden; border: 1px solid #ebeef5; cursor: pointer;
}
.shot-img { width: 100%; height: 100%; }
.cover-badge {
  position: absolute; top: 4px; left: 4px;
  font-size: 11px; padding: 1px 7px; border-radius: 4px;
  background: rgba(64,158,255,.85); color: #fff;
}
.shot-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; justify-content: center; gap: 4px;
  background: linear-gradient(transparent 50%, rgba(0,0,0,.45));
  opacity: 0; transition: opacity .18s;
  padding-bottom: 4px;
}
.shot-card:hover .shot-overlay { opacity: 1; }
</style>
