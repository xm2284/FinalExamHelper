import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { LoadingScreen } from './components/ui'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const BankList = lazy(() => import('./pages/BankList'))
const BankDetail = lazy(() => import('./pages/BankDetail'))
const ImportQuestions = lazy(() => import('./pages/ImportQuestions'))
const Practice = lazy(() => import('./pages/Practice'))
const WrongQuestions = lazy(() => import('./pages/WrongQuestions'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Tasks = lazy(() => import('./pages/Tasks'))
const AISettings = lazy(() => import('./pages/AISettings'))
const About = lazy(() => import('./pages/About'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="banks" element={<BankList />} />
            <Route path="banks/:id" element={<BankDetail />} />
            <Route path="import" element={<ImportQuestions />} />
            <Route path="practice" element={<Practice />} />
            <Route path="practice/session/:sessionId" element={<Practice />} />
            <Route path="wrong" element={<WrongQuestions />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="settings" element={<AISettings />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
