import { createFileRoute, redirect } from '@tanstack/react-router'
import { PreviewGallery } from '@/design-system/preview'

// DEV-only: the component gallery. Guarded so it never renders in production
// (the route + its eager-globbed previews are code-split out of the app chunk).
export const Route = createFileRoute('/_authenticated/dev/components')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: '/' })
    }
  },
  staticData: { title: 'Components' },
  component: PreviewGallery,
})
