import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { setUnauthorizedHandler } from '@/lib/api/client'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from './theme'
import { queryClient } from './query-client'
import { router } from './router'

export function AppProviders() {
  useEffect(() => {
    // When the api client gives up on auth (no/expired refresh token), bounce to
    // the login screen.
    setUnauthorizedHandler(() => {
      void router.navigate({ to: '/login' })
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        <Toaster position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
