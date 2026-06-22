import axios from 'axios'
import type {
  AISettings,
  AnalyticsData,
  AnswerResult,
  DashboardData,
  Paginated,
  PracticeSession,
  Question,
  QuestionBank,
  Task,
  WrongQuestion,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
})

export async function consumeTextStream(
  response: Response,
  onUpdate: (text: string) => void,
) {
  if (!response.body) throw new Error('浏览器未收到可读取的 AI 响应')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onUpdate(text)
  }
  text += decoder.decode()
  onUpdate(text)
  return text
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail ?? error.response?.data?.error?.message
    return typeof detail === 'string' ? detail : '请求失败，请稍后再试'
  }
  return error instanceof Error ? error.message : '发生未知错误'
}

export const apiClient = {
  dashboard: async () => (await api.get<DashboardData>('/api/dashboard')).data,
  analytics: async () => (await api.get<AnalyticsData>('/api/analytics')).data,
  banks: async (params?: Record<string, string | number | undefined>) =>
    (await api.get<Paginated<QuestionBank>>('/api/banks', { params })).data,
  bank: async (id: number) => (await api.get<QuestionBank>(`/api/banks/${id}`)).data,
  courses: async () => (await api.get<string[]>('/api/banks/courses')).data,
  deleteBank: async (id: number) => api.delete(`/api/banks/${id}`),
  publishBank: async (id: number) =>
    (await api.post<QuestionBank>(`/api/banks/${id}/publish`)).data,
  approveQuestions: async (bankId: number, questionIds?: number[]) =>
    (
      await api.post<{ approved: number }>(
        `/api/banks/${bankId}/questions/approve`,
        questionIds ?? null,
      )
    ).data,
  questions: async (bankId: number, params?: Record<string, string | number | undefined>) =>
    (
      await api.get<Paginated<Question>>(`/api/banks/${bankId}/questions`, {
        params: { page_size: 500, ...params },
      })
    ).data.items,
  updateQuestion: async (id: number, payload: Partial<Question>) =>
    (await api.put<Question>(`/api/questions/${id}`, payload)).data,
  deleteQuestion: async (id: number) => api.delete(`/api/questions/${id}`),
  toggleFavorite: async (id: number) =>
    (await api.post<{ question_id: number; is_favorite: boolean }>(`/api/questions/${id}/favorite`)).data,
  importText: async (payload: {
    bank_name: string
    course_name: string
    text: string
    default_type: string
    import_mode: 'questions' | 'material'
    question_count: number
  }) => (await api.post<{ bank_id: number; task_id: number }>('/api/imports/text', payload)).data,
  importFile: async (data: FormData) =>
    (await api.post<{ bank_id: number; task_id: number }>('/api/imports/file', data)).data,
  tasks: async () => (await api.get<Task[]>('/api/tasks')).data,
  retryTask: async (id: number) => (await api.post<Task>(`/api/tasks/${id}/retry`)).data,
  createSession: async (bank_id: number, mode: string) =>
    (await api.post<PracticeSession>('/api/practice/sessions', { bank_id, mode })).data,
  activeSession: async () =>
    (await api.get<PracticeSession | null>('/api/practice/sessions/active')).data,
  session: async (id: number) =>
    (await api.get<PracticeSession>(`/api/practice/sessions/${id}`)).data,
  saveProgress: async (id: number, current_index: number, status?: string) =>
    (await api.patch<PracticeSession>(`/api/practice/sessions/${id}`, { current_index, status })).data,
  submitAnswer: async (
    sessionId: number,
    payload: { question_id: number; user_answer: string; time_spent_seconds: number },
  ) => (await api.post<AnswerResult>(`/api/practice/sessions/${sessionId}/answers`, payload)).data,
  wrongQuestions: async (sort_by = 'last_error_at') =>
    (await api.get<WrongQuestion[]>('/api/wrong-questions', { params: { sort_by } })).data,
  removeWrong: async (id: number) => api.delete(`/api/wrong-questions/${id}`),
  explain: async (questionId: number, userAnswer = '') =>
    (
      await api.post<{ explanation: string }>(`/api/ai/explain/${questionId}`, null, {
        params: { user_answer: userAnswer },
      })
    ).data,
  explainStream: async (
    questionId: number,
    userAnswer: string,
    onUpdate: (text: string) => void,
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ user_answer: userAnswer })
    const response = await fetch(
      `${API_BASE_URL}/api/ai/explain/${questionId}/stream?${params}`,
      { method: 'POST', signal },
    )
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.detail ?? `AI 请求失败（${response.status}）`)
    }
    return consumeTextStream(response, onUpdate)
  },
  analyzeWrong: async (wrongId: number) =>
    (await api.post<{ analysis: string }>(`/api/ai/analyze-wrong/${wrongId}`)).data,
  settings: async () => (await api.get<AISettings>('/api/ai-settings')).data,
  saveSettings: async (payload: Partial<AISettings> & { api_key?: string }) =>
    (await api.put<AISettings>('/api/ai-settings', payload)).data,
  testSettings: async () =>
    (await api.post<{ status: string; message: string }>('/api/ai-settings/test')).data,
  loadDemo: async () => api.post('/api/demo/load'),
  clearDemo: async () => api.delete('/api/demo'),
}

export default api
