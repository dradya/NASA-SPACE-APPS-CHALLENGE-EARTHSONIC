import { Route, Routes } from 'react-router'
import { AnnouncerProvider } from './a11y/Announcer'
import { Layout } from './components/Layout'
import { AccessibilityPage } from './pages/AccessibilityPage'
import { ExplorerPage } from './pages/ExplorerPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { StudioPage } from './pages/StudioPage'
import { TimeTravelPage } from './pages/TimeTravelPage'

/** Route paths here must match src/routes.ts; tests/ui/App.test.tsx checks that every listed page renders. */
export default function App() {
  return (
    <AnnouncerProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="explorer" element={<ExplorerPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="time-travel" element={<TimeTravelPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="accessibility" element={<AccessibilityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </AnnouncerProvider>
  )
}
