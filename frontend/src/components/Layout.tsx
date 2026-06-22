import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Home,
  Info,
  Menu,
  Settings,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/banks', label: '题库', icon: BookOpen },
  { path: '/import', label: '导入与生成', icon: Upload },
  { path: '/practice', label: '练习', icon: BrainCircuit },
  { path: '/wrong', label: '错题本', icon: ClipboardList },
  { path: '/analytics', label: '学习分析', icon: BarChart3 },
  { path: '/tasks', label: '任务', icon: Sparkles },
  { path: '/settings', label: 'AI 设置', icon: Settings },
  { path: '/about', label: '关于', icon: Info },
]

const mobileItems = navItems.slice(0, 5)

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={cn('sidebar', collapsed && 'sidebar-collapsed')}>
        <Link to="/" className="brand">
          <span className="brand-mark">期</span>
          <span className="brand-copy">
            <strong>期末不挂科</strong>
            <small>AI 智能刷题系统</small>
          </span>
        </Link>
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <CircleUserRound size={32} />
            <div className="brand-copy">
              <strong>本地学习空间</strong>
              <small>数据保存在当前电脑</small>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <button
          className="collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <div className="mobile-topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">期</span>
          <strong>期末不挂科</strong>
        </Link>
        <div className="mobile-topbar-actions">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(true)} aria-label="打开菜单">
            <Menu />
          </button>
        </div>
      </div>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="mobile-nav">
        {mobileItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => cn(isActive && 'active')}
          >
            <Icon size={20} />
            <span>{label === '导入与生成' ? '导入' : label}</span>
          </NavLink>
        ))}
        <button onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
          <span>更多</span>
        </button>
      </nav>

      {mobileOpen ? (
        <div className="drawer-backdrop" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <strong>全部功能</strong>
              <button onClick={() => setMobileOpen(false)}><X /></button>
            </div>
            <ThemeToggle showLabel className="drawer-theme-toggle" />
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} onClick={() => setMobileOpen(false)} className="nav-item">
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
