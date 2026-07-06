import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (replaces Google Fonts CDN — works offline)
import '@fontsource/inter/200.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import './index.css'
import App from './App'
import ErrorBoundary from './components/Common/ErrorBoundary'
import { hydrateAppStorage } from './utils/appStorage'

// Storage is hydrated before the first render: components read persisted
// state synchronously from the appStorage cache (see usePersistedState),
// so no loading gates or pre-hydration render states exist anywhere in the
// tree. hydrateAppStorage never throws — a failed read falls back to
// defaults. On native the await hides behind the native splash screen; on
// the web it resolves in microseconds (Preferences is localStorage there).
async function bootstrap() {
  await hydrateAppStorage()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

void bootstrap()
