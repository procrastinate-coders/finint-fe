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

// NOTE: no <StrictMode>. Its dev-only double-mount aborts every query's
// in-flight request on the first mount's cleanup (React Query passes an
// AbortSignal), which shows as a "canceled" request per call in dev. Our
// effects are already guarded (module-level once-guards) + covered by tests, so
// the double-invoke check earns its keep less than the noise it creates.
void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(<AppProviders />)
})
