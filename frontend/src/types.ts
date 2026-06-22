export interface QuestionOption {
  label: string
  content: string
}

export interface Question {
  id: number
  bank_id: number
  content: string
  question_type: 'single' | 'multiple' | 'judge' | 'fill' | 'essay'
  options: QuestionOption[]
  answer?: string
  explanation?: string | null
  difficulty: number
  knowledge_points: string[]
  source_text?: string | null
  review_status: 'draft' | 'approved' | 'published'
  is_favorite: boolean
}

export interface QuestionBank {
  id: number
  name: string
  course_name: string
  description?: string | null
  source_type: string
  status: 'draft' | 'parsing' | 'review' | 'published' | 'failed'
  original_filename?: string | null
  question_count: number
  is_demo: boolean
  created_at: string
  updated_at: string
  last_practice_at?: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Task {
  id: number
  task_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  stage: string
  progress: number
  message?: string | null
  error_message?: string | null
  bank_id?: number | null
  retry_count: number
  created_at: string
  updated_at: string
}

export interface PracticeSession {
  id: number
  bank_id: number
  bank_name?: string | null
  mode: string
  question_order: number[]
  question_count: number
  current_index: number
  status: 'active' | 'completed'
  started_at: string
  updated_at: string
  completed_at?: string | null
  questions?: Question[]
}

export interface DashboardData {
  stats: {
    today_count: number
    today_correct: number
    today_correct_rate: number
    total_banks: number
    wrong_count: number
    favorite_count: number
  }
  active_session: PracticeSession | null
  recent_banks: QuestionBank[]
  active_tasks: Task[]
  trend: Array<{ date: string; count: number; correct_rate: number }>
  weak_points: Array<{ name: string; errors: number; questions: number }>
}

export interface AnalyticsData {
  summary: {
    total_answers: number
    total_minutes: number
    correct_rate: number
    active_days: number
  }
  courses: MetricRow[]
  question_types: MetricRow[]
  knowledge_points: MetricRow[]
  trend: Array<{ date: string; count: number; correct_rate: number }>
}

export interface MetricRow {
  name: string
  total: number
  correct: number
  correct_rate: number
}

export interface WrongQuestion {
  id: number
  question_id: number
  bank_id: number
  bank_name: string
  course_name: string
  question: Question
  user_answer?: string | null
  error_count: number
  last_error_at: string
}

export interface AISettings {
  api_base_url: string
  api_key_masked?: string | null
  model_name: string
  temperature: number
  max_questions_per_batch: number
  is_enabled: boolean
  is_configured: boolean
}

export interface AnswerResult {
  is_correct: boolean | null
  grading_status: 'graded' | 'pending_self_review'
  correct_answer: string
  explanation?: string | null
}
