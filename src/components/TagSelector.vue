<template>
  <el-select
    v-model="selectedIds"
    multiple
    filterable
    allow-create
    default-first-option
    :reserve-keyword="false"
    placeholder="选择或输入标签名"
    style="width: 100%"
    :popper-append-to-body="true"
    @change="handleChange"
  >
    <el-option
      v-for="tag in tags"
      :key="tag.id"
      :label="tag.name"
      :value="tag.id"
    >
      <span class="tag-dot" :style="{ background: tag.color || '#909399' }"></span>
      <span>{{ tag.name }}</span>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import type { Tag } from "../lib/types";
import { listTags, createTag } from "../lib/tags";

const props = defineProps<{
  modelValue: number[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number[]];
}>();

const tags = ref<Tag[]>([]);
const selectedIds = ref<number[]>([...props.modelValue]);

async function loadTags() {
  tags.value = await listTags();
}

async function handleChange(val: Array<number | string>) {
  const result: number[] = [];
  for (const v of val) {
    if (typeof v === "number") {
      result.push(v);
    } else {
      // Newly typed tag name — create it immediately.
      const name = v.trim();
      if (!name) continue;
      const existing = tags.value.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (!result.includes(existing.id)) result.push(existing.id);
        continue;
      }
      try {
        const id = await createTag(name, null);
        await loadTags();
        result.push(id);
      } catch (e) {
        ElMessage.error("创建标签失败：" + String(e));
      }
    }
  }
  selectedIds.value = result;
  emit("update:modelValue", result);
}

watch(() => props.modelValue, (v) => {
  selectedIds.value = [...v];
});

onMounted(loadTags);
</script>

<style scoped>
.tag-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  margin-right: 6px; vertical-align: middle;
}
</style>
