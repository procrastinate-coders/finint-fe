import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProviders } from '@/app/providers'

// Dev mock backend. FININT builds against MSW until FIN-156/157 land, and the
// live API is still behind nginx basic auth — so mocks are ON by default in dev
// and you opt OUT with VITE_API_MOCK=0. Gated on DEV so prod never bundles MSW.
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCK === '0') return
  const { worker } = await import('@/test/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  )
})
