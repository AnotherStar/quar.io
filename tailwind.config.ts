import type { Config } from 'tailwindcss'

// Token-driven Tailwind config — values mirror DESIGN-notion.md.
// CSS custom properties live in assets/css/tokens.css; Tailwind reads them
// via var(--token) so theme switching / per-tenant branding works at runtime.
export default <Config>{
  content: [
    './components/**/*.{vue,ts}',
    './pages/**/*.{vue,ts}',
    './layouts/**/*.{vue,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          pressed: 'var(--color-primary-pressed)',
          deep: 'var(--color-primary-deep)'
        },
        ink: {
          deep: 'var(--color-ink-deep)',
          DEFAULT: 'var(--color-ink)'
        },
        charcoal: 'var(--color-charcoal)',
        slate: 'var(--color-slate)',
        steel: 'var(--color-steel)',
        stone: 'var(--color-stone)',
        muted: 'var(--color-muted)',
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          soft: 'var(--color-surface-soft)'
        },
        hairline: {
          DEFAULT: 'var(--color-hairline)',
          soft: 'var(--color-hairline-soft)',
          strong: 'var(--color-hairline-strong)'
        },
        navy: {
          DEFAULT: 'var(--color-brand-navy)',
          deep: 'var(--color-brand-navy-deep)',
          mid: 'var(--color-brand-navy-mid)'
        },
        link: 'var(--color-link-blue)',
        brand: {
          pink: 'var(--color-brand-pink)',
          orange: 'var(--color-brand-orange)',
          purple: 'var(--color-brand-purple)',
          teal: 'var(--color-brand-teal)',
          green: 'var(--color-brand-green)',
          yellow: 'var(--color-brand-yellow)'
        },
        tint: {
          peach: 'var(--color-tint-peach)',
          rose: 'var(--color-tint-rose)',
          mint: 'var(--color-tint-mint)',
          lavender: 'var(--color-tint-lavender)',
          sky: 'var(--color-tint-sky)',
          yellow: 'var(--color-tint-yellow)',
          'yellow-bold': 'var(--color-tint-yellow-bold)',
          cream: 'var(--color-tint-cream)',
          gray: 'var(--color-tint-gray)'
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)'
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px'
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
        'section-sm': '48px',
        section: '64px',
        'section-lg': '96px',
        hero: '120px'
      },
      fontSize: {
        'hero-display': ['80px', { lineHeight: '1.05', letterSpacing: '-2px', fontWeight: '600' }],
        'display-lg': ['56px', { lineHeight: '1.10', letterSpacing: '-1px', fontWeight: '600' }],
        'h1': ['48px', { lineHeight: '1.15', letterSpacing: '-0.5px', fontWeight: '600' }],
        'h2': ['36px', { lineHeight: '1.20', letterSpacing: '-0.5px', fontWeight: '600' }],
        'h3': ['28px', { lineHeight: '1.25', fontWeight: '600' }],
        'h4': ['22px', { lineHeight: '1.30', fontWeight: '600' }],
        'h5': ['18px', { lineHeight: '1.40', fontWeight: '600' }],
        'subtitle': ['18px', { lineHeight: '1.50', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.55', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.55', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '1.50', fontWeight: '400' }],
        'body-sm-md': ['14px', { lineHeight: '1.50', fontWeight: '500' }],
        'caption': ['13px', { lineHeight: '1.40', fontWeight: '400' }],
        'caption-bold': ['13px', { lineHeight: '1.40', fontWeight: '600' }],
        'micro': ['12px', { lineHeight: '1.40', fontWeight: '500' }],
        'btn': ['14px', { lineHeight: '1.30', fontWeight: '500' }]
      },
      boxShadow: {
        subtle: 'rgba(15, 15, 15, 0.04) 0px 1px 2px 0px',
        card: 'rgba(15, 15, 15, 0.08) 0px 4px 12px 0px',
        mockup: 'rgba(15, 15, 15, 0.20) 0px 24px 48px -8px',
        modal: 'rgba(15, 15, 15, 0.16) 0px 16px 48px -8px'
      }
    }
  }
}
