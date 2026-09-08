# 期末不挂科

> 大学生期末复习、AI 题库生成与智能刷题平台

[![React](https://img.shields.io/badge/React-20232a.svg?logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个本地优先的单用户学习系统，把"整理资料 → 生成题目 → 人工审核 → 刷题 → 错题复盘 → 学习分析"连接成完整闭环。

系统支持解析已有试题，也可以通过 OpenAI-compatible API 根据课程资料生成题目。所有生成内容都会先进入审核区，不会未经确认直接发布。

![期末不挂科首页](docs/images/dashboard-light.png)

## 目录

- [项目简介](#项目简介)
- [核心流程](#核心流程)
- [功能特性](#功能特性)
  - [题库生产](#题库生产)
  - [智能练习](#智能练习)
  - [学习分析](#学习分析)
  - [界面体验](#界面体验)
- [支持的题型](#支持的题型)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [AI 配置](#ai-配置)
- [数据与密钥安全](#数据与密钥安全)
- [支持的题目格式](#支持的题目格式)
- [测试](#测试)
- [常见问题](#常见问题)
- [当前限制](#当前限制)
- [后续规划](#后续规划)
- [作者](#作者)

---

## 项目简介

"期末不挂科"面向大学生期末复习场景，帮助你把零散的课程资料整理成可练习、可统计、可追踪的题库，并用 AI 与数据分析辅助复习效率的提升。

它与普通刷题 App 的区别在于：

- **资料到题目的一体化流程**——导入课件、笔记、旧试卷即可自动解析出题目，不需要手工录入
- **AI 辅助而不失控**——AI 负责生成与整理，人负责审核与发布，所有内容先过审核后上线
- **本地优先、数据私密**——单机运行，API Key 与课程资料只存在本机数据库，适合日常与课程项目使用
- **完整的复习闭环**——刷题、收藏、错题、分析相互衔接，薄弱点一眼可见

![导入与生成](docs/images/import-light.png)

## 核心流程

```text
课程资料（TXT/MD/DOCX/CSV/JSON/PDF）
      │
      ▼
┌─────────────┐   ┌──────────────────────────┐
│   导入解析    │──▶│  审核区（逐题编辑/批量通过）  │
└─────────────┘   └────────────┬───────────────┘
      │                        │
      │  AI 生成复习题 ◀── AI 配置（OpenAI-compatible）
      │                        │
      ▼                        ▼
  题库发布 ──────▶ 顺序/乱序/错题/收藏练习
                       │
                       ▼
            即时判分 / AI 评分 / AI 讲解
                       │
                       ▼
            错题复盘 → 学习分析 → 薄弱点再练
```

## 功能特性

### 题库生产

- 支持 **TXT、Markdown、DOCX、CSV、JSON** 和**文字版 PDF**
- 支持**粘贴文本**或**上传文件**两种导入方式
- 自动根据课程名或上传文件名生成题库名称
- 支持**有序号与无序号**题目识别
- 本地规则低置信度时使用 **AI 辅助整理**题目边界和排版
- AI 根据课程大纲、课堂笔记和教材章节生成复习题
- 所有解析与生成结果先进入**人工审核区**
- 支持逐题**编辑、删除、批量通过、发布**和 **JSON 导出**
- 题库支持完整状态流转（见下方"支持的题型"与"题库生命周期"）

### 智能练习

- 四种练习模式：**顺序练习、乱序练习、错题练习、收藏题练习**
- 自动保存题目顺序、当前位置和完成状态，中断后可从原处继续
- 客观题（单选/多选/判断）**即时判分**
- 主观题（填空/简答）支持 **AI 评分和反馈**
- AI 不可用时进入**待自评**状态，不阻塞练习
- AI 讲解采用**流式输出**，减少长时间空白等待
- 单题**收藏**、错题**累计**和针对性重练

### 学习分析

- **近七天作答趋势**：每日作答量与正确率曲线
- **课程正确率对比**：各课程掌握情况一目了然
- **题型表现**：单选/多选/判断/填空/简答分别统计
- **知识点掌握度**：薄弱知识点与高频错题自动统计
- 练习时长、累计作答和活跃天数汇总
- 登录后数据面板即可看到今日作答、正确率、错题数与收藏数摘要

### 界面体验

- 桌面端**可折叠侧边栏**，移动端**底部导航 + 更多抽屉**
- **浅色、暗色、跟随系统**三种主题，偏好自动保存在浏览器
- 卡片、表单、题目选项、状态反馈和图表均适配暗色模式
- 基于 React 19 的响应式单页应用，路由划分清晰

![暗色关于页](docs/images/about-dark.png)

## 支持的题型

系统内置五种题型，覆盖常见考试形式：

| 题型 | 表示 | 判分方式 |
| --- | --- | --- |
| 单选题 | `single` | 即时判分 |
| 多选题 | `multiple` | 即时判分 |
| 判断题 | `judge` | 即时判分 |
| 填空题 | `fill` | AI 评分 / 待自评 |
| 简答题 | `essay` | AI 评分 / 待自评 |

每道题可附带**解析（explanation）**与**知识点标签（knowledge_points）**，供练习讲解与学习分析使用。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端框架 | React 19、TypeScript、Vite |
| 路由与请求 | React Router、Axios |
| UI | Tailwind CSS、CSS Variables、Lucide Icons、Radix UI |
| 图表 | Recharts |
| 后端框架 | FastAPI、SQLAlchemy、Pydantic |
| 数据库 | SQLite |
| 文件解析 | python-docx、PyMuPDF（PDF 文字提取） |
| AI 集成 | OpenAI-compatible Chat Completions（异步流式） |
| 测试 | Pytest（后端）、Vitest、ESLint（前端） |

## 项目结构

```text
.
├─ backend/
│  ├─ app/
│  │  ├─ api/          # FastAPI 路由（题库、练习、任务、AI 设置等）
│  │  ├─ models/       # SQLAlchemy 模型
│  │  ├─ schemas/      # Pydantic 数据结构
│  │  └─ services/     # 服务层
│  │     ├─ ai_service.py       # AI 生成、评分、讲解
│  │     ├─ question_parser.py  # 题目文本解析
│  │     ├─ import_service.py   # 文件导入
│  │     ├─ practice_service.py # 练习会话
│  │     ├─ task_runner.py      # 后台任务线程池
│  │     ├─ demo_service.py     # 演示数据
│  │     └─ serialization.py    # 数据序列化
│  ├─ tests/           # 后端测试
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ api/          # 前端 API 客户端
│  │  ├─ pages/        # 页面（看板、题库、练习、分析、设置等）
│  │  ├─ components/   # 通用组件
│  │  └─ theme/        # 主题系统（浅色/暗色/跟随系统）
│  └─ package.json
├─ docs/
│  ├─ images/          # README 界面截图
│  └─ design/          # 设计文档
└─ README.md
```

## 快速开始

### 环境要求

- Python 3.11 或更高版本
- Node.js 20 或更高版本
- npm

### 1. 克隆项目

```bash
git clone https://github.com/xm2284/FinalExamHelper.git
cd FinalExamHelper
```

### 2. 启动后端

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

后端接口文档：

```text
http://127.0.0.1:8000/docs
```

### 3. 启动前端

新开一个终端：

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

浏览器访问：

```text
http://localhost:5173
```

## AI 配置

进入系统中的"AI 设置"，填写：

- API Base URL
- API Key
- 模型名称
- Temperature

接口需兼容 OpenAI Chat Completions：

```text
POST {API_BASE_URL}/chat/completions
```

项目支持自定义服务地址和模型，不绑定特定 AI 平台。未配置 AI 时，客观题仍可正常判分，主观题进入"待自评"状态，系统功能不受阻塞。

## 数据与密钥安全

- API Key 只写入本机 SQLite 数据库
- 前端接口仅返回脱敏后的 Key
- SQLite 数据库不会提交到 GitHub
- 上传的课程资料不会提交到 GitHub
- `.env`、本地配置、构建产物和依赖目录均已加入 `.gitignore`
- 发布仓库前已清除开发数据库中保存的 API Key

请勿把真实 API Key 写入源码、README、Issue 或提交记录。

## 支持的题目格式

推荐文本格式：

```text
HTML 的主要作用是什么？
A. 描述网页结构
B. 管理数据库
C. 编译操作系统
D. 训练模型
答案：A
解析：HTML 用于描述网页结构。
知识点：HTML 基础、网页结构
```

题目可以带题号，也可以不带题号。解析器会结合选项、答案、解析、空行和题目结构判断边界；当本地识别不完整且已配置 AI 时，会尝试进行结构化整理。

支持导入的文件类型：

| 类型 | 说明 |
| --- | --- |
| TXT / Markdown | 纯文本与 Markdown 题目 |
| DOCX | Word 文档题目 |
| CSV / JSON | 结构化题目数据 |
| PDF | 文字版 PDF（扫描版暂不支持 OCR） |

## 测试

后端：

```powershell
cd backend
python -m pytest -q
```

前端：

```powershell
cd frontend
npm test
npm run lint
npm run build
```

当前验证结果：

- 后端：17 项测试通过
- 前端：10 项测试通过
- ESLint：通过
- TypeScript + Vite 生产构建：通过

## 常见问题

**Q：AI 生成题目需要付费吗？**
A：系统本身免费，仅在你配置了 OpenAI-compatible 服务后产生调用费用。你也可以完全离线使用导入/解析功能，不配置 AI 也不影响客观题练习。

**Q：支持多人同时使用吗？**
A：当前定位为本地单用户系统，不包含注册登录与多账号。团队或大规模使用可参考"后续规划"中的迁移建议。

**Q：数据存在哪里？**
A：所有数据（题库、练习记录、错题、AI 设置）保存在本机 SQLite 数据库中，不会上传到任何服务器。

**Q：扫描版 PDF 能导入吗？**
A：暂不支持 OCR。请使用文字版 PDF，或先转换为文本后粘贴导入。

## 当前限制

- 扫描版 PDF 暂不支持 OCR
- 当前定位为本地单用户系统，不包含注册登录
- 后台任务使用本地线程池，不依赖 Redis 或 Celery
- SQLite 适合课程项目与本地使用，大规模多人部署建议迁移 PostgreSQL

## 后续规划

- 多用户与协作：增加账号体系与课程共享
- 更强的导入能力：支持图片 OCR、Anki/Quizlet 格式导入
- 移动端打包：基于现有响应式界面打包为 PWA 或移动应用
- 导出与备份：一站式导出练习记录与错题本
- 学习计划：自动生成每日推荐练习与复习提醒

## 作者

- Bilibili：[小明同学鸭](https://space.bilibili.com/570049863)
- GitHub：[xm2284](https://github.com/xm2284)
- QQ：2284517861