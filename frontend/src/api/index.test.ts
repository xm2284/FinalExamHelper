import { describe, expect, it } from 'vitest'
import { consumeTextStream } from './index'

describe('consumeTextStream', () => {
  it('reports accumulated text while response chunks arrive', async () => {
    const encoder = new TextEncoder()
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('考点：函数'))
        controller.enqueue(encoder.encode('。易错点：符号。'))
        controller.close()
      },
    }))
    const updates: string[] = []

    const result = await consumeTextStream(response, (text) => updates.push(text))

    expect(result).toBe('考点：函数。易错点：符号。')
    expect(updates.at(-1)).toBe(result)
    expect(updates.length).toBeGreaterThan(1)
  })
})
