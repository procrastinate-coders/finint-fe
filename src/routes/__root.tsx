import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { RootErrorScreen } from '@/components/common/RootErrorScreen'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  // ⚠️ WITHOUT THIS, an uncaught error anywhere renders TanStack Router's default
  // "Something went wrong!" with the real cause behind a "Hide Error" toggle.
  // That is what a dead resolver looked like on 2026-09-09 — on every route,
  // root included. FININT names what it does not know; it does not apologise
  // vaguely and hide the reason.
  errorComponent: ({ error, reset }) => (
    <RootErrorScreen error={error} reset={reset} />
  ),
})
