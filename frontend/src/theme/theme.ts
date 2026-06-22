export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'final-exam-helper-theme'

export function normalizeThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : 'system'
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

export function nextThemePreference(
  preference: ThemePreference,
): ThemePreference {
  if (preference === 'system') return 'light'
  if (preference === 'light') return 'dark'
  return 'system'
}
