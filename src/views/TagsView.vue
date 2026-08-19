<template>
  <div class="tags-page">
    <header class="tags-top">
      <el-button :icon="ArrowLeft" text @click="router.push('/')">返回</el-button>
      <h2 class="page-title">标签管理</h2>
      <el-button type="primary" :icon="Plus" class="add-btn" @click="openCreate">新建标签</el-button>
    </header>

    <div class="tags-body" v-loading="loading">
      <el-table v-if="tags.length > 0" :data="tags" stripe>
        <el-table-column label="颜色" width="70">
          <template #default="{ row }">
            <span class="color-dot" :style="{ background: row.color || '#909399' }"></span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="标签名" min-width="180" />
        <el-table-column label="使用条目数" width="120">
          <template #default="{ row }">
            <span>{{ usage[row.id] ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button text size="small" type="danger" :icon="Delete" @click="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="还没有标签，点击「新建标签」开始" />
    </div>

    <!-- 新建/编辑标签弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTag ? '编辑标签' : '新建标签'"
      width="380px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="62px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="30" show-word-limit placeholder="标签名" />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <div class="color-picker-row">
            <el-color-picker v-model="form.color" show-alpha />
            <el-button v-if="form.color" text size="small" @click="form.color = null">清除</el-button>
            <span class="color-hint">可选</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, Plus, Edit, Delete } from "@element-plus/icons-vue";
import type { Tag } from "../lib/types";
import { listTags, createTag, updateTag, deleteTag, countTagUsage } from "../lib/tags";

const router = useRouter();

const tags = ref<Tag[]>([]);
const usage = ref<Record<number, number>>({});
const loading = ref(false);

const dialogVisible = ref(false);
const editingTag = ref<Tag | null>(null);
const formRef = ref<FormInstance>();
const saving = ref(false);

const form = reactive<{ name: string; color: string | null }>({
  name: "",
  color: null,
});

const rules: FormRules = {
  name: [{ required: true, message: "标签名不能为空", trigger: "blur" }],
};

async function load() {
  loading.value = true;
  try {
    const [t, u] = await Promise.all([listTags(), countTagUsage()]);
    tags.value = t;
    usage.value = u;
  } catch (e) {
    ElMessage.error("加载标签失败：" + String(e));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingTag.value = null;
  form.name = "";
  form.color = null;
  dialogVisible.value = true;
}

function openEdit(tag: Tag) {
  editingTag.value = tag;
  form.name = tag.name;
  form.color = tag.color;
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      const name = form.name.trim();
      const color = form.color?.trim() || null;
      if (editingTag.value) {
        await updateTag(editingTag.value.id, name, color);
        ElMessage.success("已更新");
      } else {
        await createTag(name, color);
        ElMessage.success("已创建");
      }
      dialogVisible.value = false;
      load();
    } catch (e) {
      ElMessage.error("保存失败：" + String(e));
    } finally {
      saving.value = false;
    }
  });
}

async function confirmDelete(tag: Tag) {
  const count = usage.value[tag.id] ?? 0;
  const hint = count > 0 ? `该标签已关联 ${count} 个条目，删除后将自动解除关联。` : "";
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.name}」吗？${hint}`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
    await deleteTag(tag.id);
    ElMessage.success("已删除");
    load();
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败：" + String(e));
  }
}

onMounted(load);
</script>

<style scoped>
.tags-page { display: flex; flex-direction: column; height: 100%; }
.tags-top {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 24px; background: #fff; border-bottom: 1px solid #ebeef5;
}
.page-title { margin: 0; font-size: 18px; font-weight: 600; }
.add-btn { margin-left: auto; }

.tags-body { flex: 1; overflow-y: auto; padding: 20px; }

.color-dot {
  display: inline-block; width: 16px; height: 16px;
  border-radius: 50%; vertical-align: middle;
}

.color-picker-row { display: flex; align-items: center; gap: 10px; }
.color-hint { font-size: 12px; color: #909399; }
</style>
