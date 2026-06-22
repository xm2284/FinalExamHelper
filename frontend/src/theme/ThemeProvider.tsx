import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  THEME_STORAGE_KEY,
  normalizeThemePreference,
  resolveTheme,
  type ThemePreference,
} from './theme'
import { ThemeContext } from './ThemeContext'

function readPreference() {
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system' as const
  }
}

function readSystemDark() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(readSystemDark)
  const resolvedTheme = resolveTheme(preference, systemDark)

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference)
    } catch {
      // Theme switching still works for the current session.
    }
  }, [preference, resolvedTheme])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
