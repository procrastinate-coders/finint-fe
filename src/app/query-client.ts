import { createQueryClient } from '@/lib/query/client'

// One QueryClient for the app lifetime.
export const queryClient = createQueryClient()
