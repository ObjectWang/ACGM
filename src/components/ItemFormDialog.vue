<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑条目' : '新建条目'"
    width="640px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    @open="handleOpen"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="82px" label-position="right">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="请输入标题" />
      </el-form-item>

      <el-form-item label="类型" prop="category">
        <el-select v-model="form.category" style="width: 160px">
          <el-option
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="创作者" prop="author">
        <el-input v-model="form.author" :placeholder="authorPlaceholder" />
      </el-form-item>

      <el-form-item label="评分" prop="rating">
        <el-rate v-model="form.rating" :max="5" allow-clear show-text :texts="rateTexts" />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" style="width: 160px">
          <el-option v-for="s in STATUS_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>

      <el-form-item label="本地路径" prop="local_path">
        <div class="path-input-row">
          <el-input v-model="form.local_path" placeholder="可选，留空表示不关联" clearable />
          <el-button-group>
            <el-button :icon="Folder" @click="pickFolder" title="选择文件夹" />
            <el-button :icon="Document" @click="pickFile" title="选择文件" />
          </el-button-group>
        </div>
        <div v-if="pathStatus !== 'none'" class="path-status">
          <el-text :type="pathStatus === 'valid' ? 'success' : 'warning'" size="small">
            {{ pathStatus === "valid" ? "✅ 路径有效" : "⚠️ 路径不存在（仍可保存）" }}
          </el-text>
        </div>
      </el-form-item>

      <el-form-item label="简介" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="2000" show-word-limit />
      </el-form-item>

      <el-form-item label="个人评价" prop="review">
        <el-input v-model="form.review" type="textarea" :rows="5" placeholder="支持 Markdown（后续步骤接入编辑器）" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { Folder, Document } from "@element-plus/icons-vue";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "../lib/constants";
import type { Category, Item, ItemInput, ItemStatus } from "../lib/types";
import { createItem, updateItem } from "../lib/items";
import { pickFilePath, pickFolderPath, checkPath } from "../lib/localpath";

const props = defineProps<{
  visible: boolean;
  item: Item | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  saved: [id: number];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);
const isEdit = computed(() => props.item != null);

// local_path validity indicator: 'none' | 'valid' | 'invalid'
const pathStatus = ref<"none" | "valid" | "invalid">("none");

async function refreshPathStatus() {
  const p = form.local_path?.trim();
  if (!p) {
    pathStatus.value = "none";
    return;
  }
  pathStatus.value = (await checkPath(p)) ? "valid" : "invalid";
}

watch(() => form.local_path, () => { pathStatus.value = "none"; });

async function pickFolder() {
  const p = await pickFolderPath();
  if (p) {
    form.local_path = p;
    await refreshPathStatus();
  }
}

async function pickFile() {
  const p = await pickFilePath();
  if (p) {
    form.local_path = p;
    await refreshPathStatus();
  }
}

const rateTexts = ["1 星", "2 星", "3 星", "4 星", "5 星"];

const form = reactive<ItemInput>({
  title: "",
  category: "anime",
  author: null,
  description: null,
  rating: null,
  review: null,
  status: "未开始",
  cover_path: null,
  local_path: null,
});

const rules: FormRules = {
  title: [{ required: true, message: "标题不能为空", trigger: "blur" }],
  category: [{ required: true, message: "请选择类型", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
};

const authorPlaceholder = computed(() => {
  switch (form.category) {
    case "anime": return "制作公司 / 导演";
    case "comic": return "作者";
    case "game": return "开发商";
    default: return "自定义";
  }
});

function handleOpen() {
  if (props.item) {
    Object.assign(form, {
      title: props.item.title,
      category: props.item.category,
      author: props.item.author,
      description: props.item.description,
      rating: props.item.rating,
      review: props.item.review,
      status: props.item.status,
      cover_path: props.item.cover_path,
      local_path: props.item.local_path,
    });
  } else {
    Object.assign(form, {
      title: "",
      category: "anime" as Category,
      author: null,
      description: null,
      rating: null,
      review: null,
      status: "未开始" as ItemStatus,
      cover_path: null,
      local_path: null,
    });
  }
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    // Validate local path — warn if not found but allow force-save.
    const p = form.local_path?.trim();
    if (p) {
      await refreshPathStatus();
      if (pathStatus.value === "invalid") {
        try {
          await ElMessageBox.confirm(
            "该本地路径当前不存在（可能是移动硬盘未插入等）。仍要保存吗？",
            "路径警告",
            { type: "warning", confirmButtonText: "仍然保存", cancelButtonText: "返回修改" }
          );
        } catch {
          return; // user chose to go back
        }
      }
    }

    saving.value = true;
    try {
      const payload: ItemInput = {
        ...form,
        author: form.author?.trim() || null,
        description: form.description?.trim() || null,
        review: form.review?.trim() || null,
        local_path: form.local_path?.trim() || null,
      };
      if (props.item) {
        await updateItem(props.item.id, payload);
        emit("saved", props.item.id);
        ElMessage.success("已更新");
      } else {
        const id = await createItem(payload);
        emit("saved", id);
        ElMessage.success("已创建");
      }
      emit("update:visible", false);
    } catch (e) {
      ElMessage.error("保存失败：" + String(e));
    } finally {
      saving.value = false;
    }
  });
}
</script>

<style scoped>
.path-input-row { display: flex; gap: 8px; align-items: center; }
.path-input-row :deep(.el-input) { flex: 1; }
.path-status { margin-top: 4px; }
</style>
