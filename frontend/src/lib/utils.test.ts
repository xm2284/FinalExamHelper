import { describe, expect, it } from 'vitest'
import {
  cleanAiMarkdown,
  deriveBankName,
  formatPercent,
  formatRelativeTime,
  toggleAnswer,
} from './utils'

describe('formatPercent', () => {
  it('keeps one decimal only when needed', () => {
    expect(formatPercent(73.8)).toBe('73.8%')
    expect(formatPercent(80)).toBe('80%')
  })
})

describe('toggleAnswer', () => {
  it('keeps multiple choice labels sorted', () => {
    expect(toggleAnswer('C', 'A')).toBe('A,C')
    expect(toggleAnswer('A,C', 'A')).toBe('C')
  })
})

describe('formatRelativeTime', () => {
  it('returns a readable fallback for empty values', () => {
    expect(formatRelativeTime(null)).toBe('暂无记录')
  })
})

describe('deriveBankName', () => {
  it('uses the uploaded filename without its extension', () => {
    expect(deriveBankName('高等数学期末复习题.docx', '')).toBe('高等数学期末复习题')
  })

  it('falls back to the course name for pasted text', () => {
    expect(deriveBankName(undefined, '数据结构')).toBe('数据结构期末复习题库')
  })
})

describe('cleanAiMarkdown', () => {
  it('removes model formatting markers while preserving readable text', () => {
    expect(cleanAiMarkdown(`**考点**
### 易错点
- 注意符号`)).toBe(
      `考点
易错点
注意符号`,
    )
    expect(cleanAiMarkdown(String.raw`函数 \(f(x)\) 在 \[a,b\] 上连续`)).toBe(
      '函数 f(x) 在 a,b 上连续',
    )
  })
})
