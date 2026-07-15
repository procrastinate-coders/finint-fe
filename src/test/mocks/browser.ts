import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Dev mock worker — started from main.tsx when VITE_API_MOCK=1.
export const worker = setupWorker(...handlers)
