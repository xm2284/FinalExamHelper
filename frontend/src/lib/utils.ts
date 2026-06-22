import clsx, { type ClassValue } from 'clsx'

export function cn(...values: ClassValue[]) {
  return clsx(values)
}

export function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return '暂无记录'
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.round(diff / 60000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

export function toggleAnswer(current: string, label: string) {
  const values = current.split(',').filter(Boolean)
  const next = values.includes(label)
    ? values.filter((item) => item !== label)
    : [...values, label]
  return next.sort().join(',')
}

export function deriveBankName(filename?: string, courseName = '') {
  if (filename) {
    const withoutExtension = filename.replace(/\.[^.]+$/, '')
    const cleaned = withoutExtension.replace(/[_-]+/g, ' ').trim()
    if (cleaned) return cleaned
  }
  const course = courseName.trim()
  return course ? `${course}期末复习题库` : '未命名题库'
}

export function cleanAiMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
    .trim()
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  fill: '填空题',
  essay: '简答题',
}

export const MODE_LABELS: Record<string, string> = {
  sequential: '顺序练习',
  random: '乱序练习',
  wrong: '错题练习',
  favorite: '收藏题练习',
}
