import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'src/routeTree.gen.ts',
    'public/mockServiceWorker.js',
    // Generated from /openapi.json by `npm run gen:contracts` (FFE-004).
    'src/lib/api/contracts/_generated',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Route modules, provider/hook modules, and component-library primitives
  // legitimately co-export non-components (Route objects, context hooks,
  // cva variants, tone helpers); fast-refresh granularity is a non-issue.
  {
    files: [
      'src/routes/**/*.tsx',
      'src/app/**/*.tsx',
      'src/lib/auth/auth-context.tsx',
      'src/components/**/*.tsx',
      'src/design-system/**/*.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // === Layer boundary (CLAUDE.md §2 law 11) ================================
  // Imports point DOWNWARD only:
  //   features/* → @/design-system → components/{finint,layout,common}
  //             → components/ui → lib/*
  // Features never import each other. Enforced here so a violation is a lint
  // ERROR, not a code-review note.

  // lib is the lowest layer — it must not reach up into anything above it.
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/*',
                '@/features/*',
                '@/design-system',
                '@/design-system/*',
                '@/app/*',
              ],
              message:
                'lib is the lowest layer — it must not import components, design-system, app, or features.',
            },
          ],
        },
      ],
    },
  },
  // ui primitives sit just above lib — no upward reach into richer components,
  // design-system, or features.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/finint/*',
                '@/components/layout/*',
                '@/components/common/*',
                '@/design-system',
                '@/design-system/*',
                '@/features/*',
              ],
              message:
                'ui primitives must not import richer components, design-system, or features.',
            },
          ],
        },
      ],
    },
  },
  // The flat DATA primitives + shell + common compositions — must not import
  // features (features compose them, never the reverse).
  {
    files: [
      'src/components/finint/**/*.{ts,tsx}',
      'src/components/layout/**/*.{ts,tsx}',
      'src/components/common/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message: 'components must not import features.',
            },
          ],
        },
      ],
    },
  },
  // design-system is the visual vocabulary — it may compose components + lib
  // but never a feature.
  {
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message: 'design-system must not import features.',
            },
          ],
        },
      ],
    },
  },
  // Features never import each other. Within a feature, use relative imports.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message:
                'features must not import each other — a shared piece belongs one layer down (components/ or lib/).',
            },
          ],
        },
      ],
    },
  },

  // === Number-format guard (FFE-002) ======================================
  // finint-fe DOES format numbers — but ONLY in lib/format. Everywhere else
  // renders what lib/format returns; no ad-hoc Intl.NumberFormat / toFixed.
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
      'src/design-system/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='NumberFormat']",
          message:
            'Format numbers via lib/format (FFE-002) — no ad-hoc Intl.NumberFormat in components.',
        },
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message:
            'Format numbers via lib/format (FFE-002) — no ad-hoc toFixed() in components.',
        },
      ],
    },
  },

  // Tests + mocks: Node globals, relaxed.
  {
    files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
