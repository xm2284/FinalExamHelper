# 期末不挂科系统全面重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前原型重构为可本地运行、桌面与手机均可使用的题库生产与智能刷题系统。

**Architecture:** 前端使用 React + Vite + TypeScript，通过类型化 API 客户端访问 FastAPI。后端按模型、Schema、服务和路由拆分；SQLite 保存题库、审核状态、练习会话、作答、收藏、错题、任务和 AI 配置。

**Tech Stack:** React 19、Vite、TypeScript、Tailwind CSS、Lucide、Recharts、FastAPI、SQLAlchemy、Pydantic、SQLite、PyMuPDF。

---

### Task 1: 后端基础模型与核心服务

- [ ] 为题目解析、答案判定、题目序列和会话恢复编写失败测试。
- [ ] 重建 SQLAlchemy 模型和 Pydantic API 类型。
- [ ] 实现题目解析、结构化 JSON、客观题判分和分页工具。
- [ ] 运行后端测试并修正失败。

### Task 2: 题库生产与审核 API

- [ ] 实现题库、题目草稿、发布、筛选、分页和导出接口。
- [ ] 实现文本、文件、DOCX、CSV、JSON、文字版 PDF 导入。
- [ ] 使用独立数据库会话和线程池记录后台任务。
- [ ] 实现 AI 学习资料出题及审核结果保存。

### Task 3: 练习闭环与分析 API

- [ ] 实现顺序、乱序、错题和收藏练习会话。
- [ ] 实现自动保存、客观题判分、主观题 AI 判分/待自评。
- [ ] 实现错题、收藏、AI 讲解与错因分析。
- [ ] 实现首页和完整学习分析聚合接口。

### Task 4: 前端设计系统与页面

- [ ] 重建应用壳、可折叠侧栏、移动底部导航和统一组件。
- [ ] 实现首页、题库、导入、审核、练习、错题、分析、任务和设置页面。
- [ ] 所有 API 使用显式 TypeScript 类型，补全加载、空、错误和成功状态。
- [ ] 按桌面概念图实现白灰底、橙色强调、细边框和低阴影。

### Task 5: 演示、联调与验收

- [ ] 实现演示数据一键载入和清空。
- [ ] 跑通导入审核、发布、练习、续刷、错题和统计流程。
- [ ] 运行后端测试、前端 lint、类型检查和生产构建。
- [ ] 使用内置浏览器验证桌面和手机视口并完成视觉对照。
