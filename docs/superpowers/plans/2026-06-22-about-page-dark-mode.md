# 关于页与全站暗黑模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加作者关于页，并为现有 React 应用提供可持久化、跟随系统且覆盖所有主要界面的暗黑模式。

**Architecture:** 使用独立 `ThemeProvider` 管理 `light | dark | system` 偏好，将解析后的主题写入根元素 `data-theme`。关于页保持静态数据与局部复制状态；导航只消费主题上下文和路由配置。视觉颜色通过 CSS 变量集中切换，图表读取主题令牌，不在页面中复制暗色判断。

**Tech Stack:** React 19、TypeScript、React Router、Lucide、Recharts、CSS variables、Vitest、Browser/IAB

---

### Task 1: 主题核心状态

**Files:**
- Create: `frontend/src/theme/theme.ts`
- Create: `frontend/src/theme/ThemeProvider.tsx`
- Test: `frontend/src/theme/theme.test.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: 写失败测试**

覆盖三个纯函数行为：

```ts
expect(normalizeThemePreference('dark')).toBe('dark')
expect(normalizeThemePreference('invalid')).toBe('system')
expect(resolveTheme('system', true)).toBe('dark')
expect(nextThemePreference('system')).toBe('light')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --run src/theme/theme.test.ts`

Expected: FAIL，因为主题模块尚不存在。

- [ ] **Step 3: 实现主题模块与 Provider**

`theme.ts` 导出：

```ts
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'final-exam-helper-theme'
export function normalizeThemePreference(value: string | null): ThemePreference
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme
export function nextThemePreference(preference: ThemePreference): ThemePreference
```

`ThemeProvider`：

- 安全读取和写入 `localStorage`
- 监听 `(prefers-color-scheme: dark)`
- 将解析主题写到 `document.documentElement.dataset.theme`
- 通过 Context 提供 `preference`、`resolvedTheme`、`setPreference`

- [ ] **Step 4: 在 `main.tsx` 包裹应用并运行测试**

Run: `npm test -- --run src/theme/theme.test.ts`

Expected: PASS。

### Task 2: 导航主题控件与关于入口

**Files:**
- Create: `frontend/src/components/ThemeToggle.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 在导航配置中增加 `/about`**

使用 `Info` 图标，将“关于”紧接在“AI 设置”后；手机底部核心五项不变，因此入口自然出现在“更多”抽屉。

- [ ] **Step 2: 创建主题切换组件**

主题按钮按 `system → light → dark → system` 循环，使用 `Monitor`、`Sun`、`Moon` 图标并提供明确的 `aria-label` 与文字标题。

- [ ] **Step 3: 放置控件**

- 桌面：侧边栏底部本地空间信息旁。
- 手机：顶栏右侧，菜单按钮左侧。
- 抽屉：增加当前主题的整行切换入口。

- [ ] **Step 4: 增加懒加载路由**

在 `App.tsx` 增加：

```tsx
const About = lazy(() => import('./pages/About'))
<Route path="about" element={<About />} />
```

### Task 3: 关于页面

**Files:**
- Create: `frontend/src/pages/About.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 写页面结构**

页面包含：

- 作者主卡：小明、项目说明、现有品牌“期”标识。
- B站链接：`https://space.bilibili.com/570049863`
- GitHub 链接：`https://github.com/xm2284`
- QQ：`2284517861` 与复制按钮。
- 项目栈：React、TypeScript、FastAPI、SQLite。

外链使用 `target="_blank"` 和 `rel="noreferrer"`。

- [ ] **Step 2: 实现复制降级**

优先调用 `navigator.clipboard.writeText`；失败时将提示更新为“请手动复制：2284517861”，成功时显示“已复制”并在短暂延迟后复原。

- [ ] **Step 3: 实现页面样式**

使用一个宽作者主卡和三个联系入口，桌面两列、手机单列。禁止渐变、大型营销标题和远程图片。

### Task 4: CSS 主题令牌与全站覆盖

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 扩充基础令牌**

新增页面背景、浮层、悬停、输入框、弱边框、图表网格、遮罩等变量，并用现有变量替换主要硬编码白色和浅灰色。

- [ ] **Step 2: 增加暗色变量**

在 `:root[data-theme='dark']` 中定义：

- 页面背景 `#111315`
- 侧栏/主表面 `#171a1d`
- 次级表面 `#1d2125`
- 正文 `#edf0f2`
- 次要文字 `#9aa3ab`
- 边框 `#2a3035`
- 柔和橙色、绿、红、蓝状态底色

- [ ] **Step 3: 覆盖交互组件**

检查侧栏、导航、按钮、表单、分段控件、文件上传、选项、答案面板、抽屉、空状态和通知，确保无白块和低对比文字。

- [ ] **Step 4: 响应式检查**

手机端关于页单列；主题按钮不挤压品牌；抽屉与底部导航使用暗色表面；无水平滚动。

### Task 5: Recharts 主题适配

**Files:**
- Create: `frontend/src/theme/useChartTheme.ts`
- Modify: `frontend/src/pages/Analytics.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建图表主题 Hook**

从 `ThemeProvider` 的 `resolvedTheme` 派生：

```ts
{
  grid: string,
  text: string,
  tooltipBackground: string,
  tooltipBorder: string
}
```

- [ ] **Step 2: 替换硬编码图表颜色**

为 `CartesianGrid`、`XAxis`、`YAxis`、`Tooltip` 明确传入主题颜色，保留橙色数据线和柱。

- [ ] **Step 3: 构建验证**

Run: `npm run build`

Expected: TypeScript 与 Vite 构建成功。

### Task 6: 自动化与浏览器验收

**Files:**
- Test: `frontend/src/theme/theme.test.ts`
- Verify: all frontend source

- [ ] **Step 1: 完整自动检查**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: 所有命令退出码为 0。

- [ ] **Step 2: 桌面浏览器检查**

目标流程：

`AI 设置下方点击关于 → 外链与 QQ 卡片可见 → 切换暗色 → 刷新后仍为暗色`

检查 URL、标题、DOM、控制台、截图和至少一次交互。

- [ ] **Step 3: 手机浏览器检查**

使用 390×844：

`打开更多 → 点击关于 → 页面单列 → 顶栏切换主题`

确认底部导航、抽屉、卡片、文字无溢出。

- [ ] **Step 4: 跨页面视觉抽查**

在暗色主题下抽查首页、导入、练习、学习分析、AI 设置和关于页，修复所有白块、低对比、图表轴文字或状态色问题。

