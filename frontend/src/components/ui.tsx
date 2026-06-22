import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { LoaderCircle, PackageOpen } from 'lucide-react'
import { cn } from '../lib/utils'

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}) {
  return (
    <button
      className={cn('button', `button-${variant}`, `button-${size}`, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <LoaderCircle size={16} className="spin" /> : null}
      {children}
    </button>
  )
}

export function Panel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn('panel', className)} {...props}>
      {children}
    </section>
  )
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'orange' | 'green' | 'red' | 'blue'
  children: ReactNode
}) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <PackageOpen size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track" aria-label={`进度 ${Math.round(value)}%`}>
      <div className="progress-value" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <LoaderCircle className="spin" />
      <span>正在加载</span>
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-notice">
      <span>{message}</span>
      {onRetry ? <Button variant="ghost" size="sm" onClick={onRetry}>重试</Button> : null}
    </div>
  )
}
