# ACGM

ACGM（Anime / Comic / Game / Media）是一个纯本地运行的桌面应用，用于统一管理个人动画、漫画、游戏及其它媒体资源。数据全部存储在本机，无需联网、无需部署服务器。

## 功能规划

- 条目管理：新增、编辑、删除，卡片 / 列表视图
- 封面与截图：本地上传、自动缩略图、预览
- 标签系统：多标签分类、筛选、独立管理
- 本地路径：关联文件 / 文件夹、一键打开
- 检索排序：标题搜索，类型 / 状态 / 标签 / 评分 / 路径筛选
- 评价撰写：Markdown 编辑与实时预览

> 当前进度：Step 1（项目初始化 + 数据库设计）已完成，后续按分步计划继续实现。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面外壳 | Tauri 2（Rust） |
| 前端框架 | Vue 3 + TypeScript（Composition API + `<script setup>`） |
| UI 组件库 | Element Plus |
| 构建工具 | Vite |
| 数据库 | SQLite（tauri-plugin-sql，单文件） |
| 系统交互 | tauri-plugin-opener |

## 环境要求

- Node.js 20+
- Rust stable（本仓库开发环境：1.97.1）
- Windows：Visual Studio 2022（MSVC C++ 工具链）、Windows 10/11 SDK、WebView2 Runtime
- macOS：Xcode Command Line Tools

## 本地开发

```bash
npm install
npm run tauri dev
```

仅启动前端（不含 Tauri 能力）：

```bash
npm run dev
```

## 构建与打包

```bash
npm run tauri build
```

安装包输出到 `src-tauri/target/release/bundle/`。

## 项目结构

```text
ACGM/
├─ src/                      # Vue 3 前端
│  ├─ lib/db.ts              # SQLite 连接与初始化
│  ├─ App.vue
│  └─ main.ts
├─ src-tauri/                # Tauri / Rust 后端
│  ├─ migrations/            # SQLite 迁移脚本（首次启动自动建表）
│  ├─ src/                   # Rust 入口与插件装配
│  ├─ capabilities/          # 前端能力权限
│  ├─ tauri.conf.json        # Tauri 配置
│  └─ Cargo.toml
├─ docs/database.md          # 数据库设计文档
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 数据存储

- 数据库文件：应用数据目录下的 `acgm.db`
  - Windows：`%APPDATA%\com.acgm.app\`
  - macOS：`~/Library/Application Support/com.acgm.app/`
- 图片目录：应用数据目录下的 `images/{item_id}/`
- 首次启动自动执行数据库迁移并创建图片目录
- 数据库详细设计见 [docs/database.md](docs/database.md)
