<template>
  <div class="tags-page">
    <header class="tags-top">
      <el-button :icon="ArrowLeft" text @click="router.push('/')">返回</el-button>
      <h2 class="page-title">标签管理</h2>
    </header>
    <div class="tags-body">
      <el-empty description="标签系统将在 Step 5 接入" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ArrowLeft } from "@element-plus/icons-vue";

const router = useRouter();
</script>

<style scoped>
.tags-page { display: flex; flex-direction: column; height: 100%; }
.tags-top { display: flex; align-items: center; gap: 12px; padding: 10px 24px; background: #fff; border-bottom: 1px solid #ebeef5; }
.page-title { margin: 0; font-size: 18px; font-weight: 600; }
.tags-body { flex: 1; display: flex; align-items: center; justify-content: center; }
</style>
