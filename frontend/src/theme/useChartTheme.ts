import { useTheme } from './useTheme'

export function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return {
    grid: dark ? '#2a3035' : '#edf0f2',
    text: dark ? '#9aa3ab' : '#75808b',
    tooltipBackground: dark ? '#202429' : '#ffffff',
    tooltipBorder: dark ? '#353c42' : '#e5e8eb',
  }
}
