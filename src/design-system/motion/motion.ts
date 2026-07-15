// JS-side motion tokens — mirror the CSS `--apex-dur-*` / `--apex-ease-*`.
export const duration = {
  hover: 100,
  focus: 200,
  flash: 300,
  panel: 400,
} as const

export const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
} as const
