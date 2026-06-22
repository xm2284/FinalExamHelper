import { Monitor, Moon, Sun } from 'lucide-react'
import { nextThemePreference } from '../theme/theme'
import { useTheme } from '../theme/useTheme'
import { cn } from '../lib/utils'

const themeMeta = {
  system: { label: '跟随系统', icon: Monitor },
  light: { label: '浅色模式', icon: Sun },
  dark: { label: '暗色模式', icon: Moon },
}

export default function ThemeToggle({
  showLabel = false,
  className,
}: {
  showLabel?: boolean
  className?: string
}) {
  const { preference, setPreference } = useTheme()
  const meta = themeMeta[preference]
  const Icon = meta.icon
  const next = nextThemePreference(preference)

  return (
    <button
      className={cn('theme-toggle', showLabel && 'theme-toggle-labeled', className)}
      type="button"
      aria-label={`当前${meta.label}，点击切换为${themeMeta[next].label}`}
      title={`当前：${meta.label}`}
      onClick={() => setPreference(next)}
    >
      <Icon size={18} strokeWidth={1.8} />
      {showLabel ? <span>{meta.label}</span> : null}
    </button>
  )
}
