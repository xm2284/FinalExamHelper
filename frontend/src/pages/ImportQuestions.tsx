import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, FileText, UploadCloud } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Button, ErrorNotice, PageHeader, Panel } from '../components/ui'
import { cn, deriveBankName } from '../lib/utils'

type SourceMode = 'text' | 'file'
type ImportMode = 'questions' | 'material'

export default function ImportQuestions() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('text')
  const [importMode, setImportMode] = useState<ImportMode>('questions')
  const [bankName, setBankName] = useState('')
  const [bankNameEdited, setBankNameEdited] = useState(false)
  const [courseName, setCourseName] = useState('')
  const [defaultType, setDefaultType] = useState('single')
  const [questionCount, setQuestionCount] = useState(10)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async () => {
    if (!courseName.trim()) {
      setError('请填写课程名称')
      return
    }
    if (sourceMode === 'text' && !text.trim()) {
      setError(importMode === 'questions' ? '请粘贴题目文本' : '请粘贴学习资料')
      return
    }
    if (sourceMode === 'file' && !file) {
      setError('请选择要上传的文件')
      return
    }
    setLoading(true)
    setError('')
    try {
      const resolvedBankName = bankName.trim()
        || deriveBankName(sourceMode === 'file' ? file?.name : undefined, courseName)
      let result
      if (sourceMode === 'text') {
        result = await apiClient.importText({
          bank_name: resolvedBankName,
          course_name: courseName,
          text,
          default_type: defaultType,
          import_mode: importMode,
          question_count: questionCount,
        })
      } else {
        const formData = new FormData()
        formData.append('file', file!)
        formData.append('bank_name', resolvedBankName)
        formData.append('course_name', courseName)
        formData.append('default_type', defaultType)
        formData.append('import_mode', importMode)
        result = await apiClient.importFile(formData)
      }
      navigate(`/tasks?bank=${result.bank_id}`)
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="导入与生成" description="解析已有题目，或根据学习资料生成一份可审核的题库。" />

      <div className="mode-grid">
        <button className={cn('mode-card', importMode === 'questions' && 'active')} onClick={() => setImportMode('questions')}>
          <span className="action-icon action-icon-green"><FileText /></span>
          <div><strong>解析已有题目</strong><p>老师整理的题目、复习卷或题库文件</p></div>
        </button>
        <button className={cn('mode-card', importMode === 'material' && 'active')} onClick={() => setImportMode('material')}>
          <span className="action-icon action-icon-orange"><Bot /></span>
          <div><strong>AI 根据资料出题</strong><p>课程大纲、教材章节、课堂笔记或复习资料</p></div>
        </button>
      </div>

      <Panel className="import-panel">
        <div className="form-section">
          <div className="section-title"><span>1</span><div><h2>题库信息</h2><p>用于后续筛选和练习记录归类</p></div></div>
          <div className="form-grid">
            <label><span>题库名称</span><input value={bankName} onChange={(event) => {
              setBankNameEdited(true)
              setBankName(event.target.value)
            }} placeholder="留空时将根据课程或文件名自动生成" /></label>
            <label><span>课程名称</span><input value={courseName} onChange={(event) => {
              const value = event.target.value
              setCourseName(value)
              if (!bankNameEdited && sourceMode === 'text') {
                setBankName(value.trim() ? deriveBankName(undefined, value) : '')
              }
            }} placeholder="例如：高等数学" /></label>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title"><span>2</span><div><h2>选择内容来源</h2><p>支持直接粘贴或上传本地文件</p></div></div>
          <div className="segmented-control">
            <button className={sourceMode === 'text' ? 'active' : ''} onClick={() => {
              setSourceMode('text')
              if (!bankNameEdited) setBankName(courseName.trim() ? deriveBankName(undefined, courseName) : '')
            }}>粘贴文本</button>
            <button className={sourceMode === 'file' ? 'active' : ''} onClick={() => {
              setSourceMode('file')
              if (!bankNameEdited) setBankName(file ? deriveBankName(file.name, courseName) : '')
            }}>上传文件</button>
          </div>
          {sourceMode === 'text' ? (
            <textarea
              className="large-textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={importMode === 'questions'
                ? '粘贴题目文本。请尽量包含题号、选项、答案和解析。'
                : '粘贴课程资料。AI 只会根据你提供的内容出题。'}
            />
          ) : (
            <label className="file-drop">
              <UploadCloud size={32} />
              <strong>{file ? file.name : '点击选择文件'}</strong>
              <span>支持 TXT、MD、DOCX、CSV、JSON、文字版 PDF</span>
              <input
                type="file"
                accept=".txt,.md,.docx,.csv,.json,.pdf"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null
                  setFile(selectedFile)
                  if (!bankNameEdited) {
                    setBankName(selectedFile ? deriveBankName(selectedFile.name, courseName) : '')
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="form-section">
          <div className="section-title"><span>3</span><div><h2>解析设置</h2><p>生成结果会先进入人工审核区</p></div></div>
          <div className="form-grid">
            <label>
              <span>{importMode === 'questions' ? '默认题型' : '主要题型'}</span>
              <select value={defaultType} onChange={(event) => setDefaultType(event.target.value)}>
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
                <option value="judge">判断题</option>
                <option value="fill">填空题</option>
                <option value="essay">简答题</option>
              </select>
            </label>
            {importMode === 'material' ? (
              <label><span>生成数量</span><input type="number" min={1} max={20} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} /></label>
            ) : null}
          </div>
        </div>
        {error ? <ErrorNotice message={error} /> : null}
        <div className="form-submit">
          <p>完成后请到任务页查看进度，并进入题库审核题目。</p>
          <Button size="lg" loading={loading} onClick={submit}>
            {importMode === 'questions' ? '开始解析' : '开始 AI 生成'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
