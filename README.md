# ACGM

ACGM（Anime / Comic / Game / Media）是一个纯本地运行的桌面应用，用于统一管理个人动画、漫画、游戏及其它媒体资源。数据全部存储在本机，无需联网、无需部署服务器。

## 功能一览

- **条目管理**：新增、编辑、删除四种类型（动画 / 漫画 / 游戏 / 其它），卡片视图与列表视图可切换
- **图片管理**：每条目 1 张封面 + 最多 5 张截图，自动生成 300px 缩略图，支持预览、替换、删除、设为封面
- **本地路径**：关联本地文件或文件夹，实时验证有效性，一键用系统默认方式打开
- **标签系统**：多标签分类、多选筛选（AND / OR 逻辑）、独立管理页（增删改查、颜色标记、使用统计）
- **检索与筛选**：标题模糊搜索（防抖）、按类型 / 状态 / 标签 / 评分范围 / 本地路径筛选，多字段排序
- **评价撰写**：Markdown 编辑器（md-editor-v3），编辑时实时编写，详情页渲染展示
- **数据安全**：外键级联删除，删除条目时同步清理关联图片文件和数据库记录

## 页面结构

- **主页**：顶部搜索框 + 新建按钮 + 视图切换；左侧栏分类导航 + 标签管理入口；主内容区卡片/列表；底部筛选栏 + 分页
- **详情页**：封面 + 标题/元信息并排展示，本地路径状态与跳转，标签展示，图片管理，简介，Markdown 评价渲染
- **标签管理页**：标签列表表格，颜色选择器，使用条目数统计，新建/编辑/删除

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面外壳 | Tauri 2（Rust） |
| 前端框架 | Vue 3 + TypeScript（Composition API + `<script setup>`） |
| UI 组件库 | Element Plus |
| 构建工具 | Vite |
| 数据库 | SQLite（tauri-plugin-sql，单文件） |
| 图片处理 | Rust image crate（缩略图生成） |
| Markdown 编辑器 | md-editor-v3 |
| 系统交互 | tauri-plugin-opener |
| 文件选择 | tauri-plugin-dialog |

## 环境要求

- Node.js 20+
- Rust stable（本仓库开发环境：1.97.1）
- Windows：Visual Studio 2022 Build Tools（MSVC C++ 工具链）、Windows 10/11 SDK、WebView2 Runtime
- macOS：Xcode Command Line Tools

## 本地开发

```bash
npm install
npm run tauri dev
```

启动后 Vite 开发服务器运行在 `http://localhost:1420`，Tauri 窗口自动打开。

仅启动前端（不含 Tauri 原生能力，图片/路径功能不可用）：

```bash
npm run dev
```

## 构建与打包

### 非安装版（便携 exe，推荐）

```bash
npm run tauri:portable
```

构建完成后，可执行文件位于：

```
src-tauri/target/release/acgm.exe       # Windows
src-tauri/target/release/acgm           # macOS
```

直接双击运行即可，无需安装。数据库和图片会在首次启动时自动创建。

### 安装版（NSIS / MSI 安装包）

```bash
npm run tauri:build
```

安装包输出到 `src-tauri/target/release/bundle/`。

> **注意**：首次构建时 Rust 会编译所有依赖，可能需要较长时间。后续增量构建会快很多。

## 项目结构

```text
ACGM/
├─ src/                      # Vue 3 前端
│  ├─ components/            # 可复用组件
│  │  ├─ ItemFormDialog.vue  # 条目新建/编辑弹窗
│  │  ├─ ImageGallery.vue    # 封面与截图管理
│  │  └─ TagSelector.vue     # 标签多选（支持即时创建）
│  ├─ lib/                   # 数据访问层与工具
│  │  ├─ api.ts              # Tauri invoke 封装（Rust 命令）
│  │  ├─ constants.ts        # 类型/状态选项与颜色
│  │  ├─ db.ts               # SQLite 连接、初始化、事务
│  │  ├─ images.ts           # 图片 CRUD + 上传编排
│  │  ├─ items.ts            # 条目 CRUD + 筛选/排序/分页
│  │  ├─ localpath.ts        # 本地路径选择/验证/打开
│  │  ├─ paths.ts            # 资源 URL 转换
│  │  ├─ tags.ts             # 标签 CRUD + 使用统计
│  │  └─ types.ts            # TypeScript 类型定义
│  ├─ views/                 # 页面视图
│  │  ├─ HomeView.vue        # 主页（列表/卡片 + 筛选）
│  │  ├─ DetailView.vue      # 条目详情页
│  │  └─ TagsView.vue        # 标签管理页
│  ├─ router/index.ts        # Vue Router 路由
│  ├─ styles/global.css      # 全局样式
│  ├─ App.vue                # 根组件
│  └─ main.ts                # 应用入口
├─ src-tauri/                # Tauri / Rust 后端
│  ├─ migrations/            # SQLite 建表迁移（首次启动自动执行）
│  ├─ src/lib.rs             # Rust 命令（图片导入/缩略图/删除/路径验证）
│  ├─ src/main.rs            # Rust 程序入口
│  ├─ capabilities/          # 前端能力权限配置
│  ├─ tauri.conf.json        # Tauri 应用配置
│  └─ Cargo.toml             # Rust 依赖配置
├─ docs/database.md          # 数据库设计文档
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 数据库表结构

| 表名 | 说明 |
| --- | --- |
| `items` | 条目主表（标题、类型、评分、状态、简介、评价、封面路径、本地路径、时间戳） |
| `tags` | 标签表（名称唯一、颜色） |
| `item_tags` | 条目-标签多对多关联表（级联删除） |
| `images` | 图片表（文件路径、缩略图路径、排序、是否封面） |

建表 SQL 见 [src-tauri/migrations/20260819000000_init.sql](src-tauri/migrations/20260819000000_init.sql)，数据库设计文档见 [docs/database.md](docs/database.md)。

## 数据存储

- 数据库文件：exe 同目录下的 `acgm.db`
- 图片目录：exe 同目录下的 `images/{item_id}/`
- 首次启动自动执行数据库迁移并创建图片目录
- 删除条目时同步清理 `images/{item_id}/` 目录（不删除 `local_path` 指向的外部文件）
- 便携版直接将 exe 拷贝到任意目录即可使用，数据跟随 exe 一起移动
- 数据库详细设计见 [docs/database.md](docs/database.md)
