---
version: alpha
name: quar.io
description: quar.io combines two distinct visual modes — a Notion-flavoured marketing surface (illustration-rich, pastel feature cards, navy hero band) and a calm, macOS-Settings-inspired dashboard (inset rounded sidebar on a white canvas, no top header, brand-row and content header-row aligned). Primary CTA is the brand blue {colors.primary} (sourced from the quar.io logo so logotype and primary action share the same hue). Typography is Inter-based across all surfaces. Dashboard pages share a single `PageHeader` component (icon + h3 title in navy with 50% opacity icon), a segmented-tabs / pill-search row, and unwrapped tables — no card borders inside the working canvas.

colors:
  primary: "#0c3fe9"
  primary-pressed: "#0a36c7"
  primary-deep: "#082db0"
  on-primary: "#ffffff"
  brand-navy: "#0a1530"
  brand-navy-deep: "#070f24"
  brand-navy-mid: "#1a2a52"
  link-blue: "#0075de"
  link-blue-pressed: "#005bab"
  brand-orange: "#dd5b00"
  brand-orange-deep: "#793400"
  brand-pink: "#ff64c8"
  brand-pink-deep: "#a02e6d"
  brand-purple: "#7b3ff2"
  brand-purple-300: "#d6b6f6"
  brand-purple-800: "#391c57"
  brand-teal: "#2a9d99"
  brand-green: "#1aae39"
  brand-yellow: "#f5d75e"
  brand-brown: "#523410"
  card-tint-peach: "#ffe8d4"
  card-tint-rose: "#fde0ec"
  card-tint-mint: "#d9f3e1"
  card-tint-lavender: "#e6e0f5"
  card-tint-sky: "#dcecfa"
  card-tint-yellow: "#fef7d6"
  card-tint-yellow-bold: "#f9e79f"
  card-tint-cream: "#f8f5e8"
  card-tint-gray: "#f0eeec"
  canvas: "#ffffff"
  surface: "#f6f5f4"
  surface-soft: "#fafaf9"
  hairline: "#e5e3df"
  hairline-soft: "#ede9e4"
  hairline-strong: "#c8c4be"
  ink-deep: "#000000"
  ink: "#1a1a1a"
  charcoal: "#37352f"
  slate: "#5d5b54"
  steel: "#787671"
  stone: "#a4a097"
  muted: "#bbb8b1"
  on-dark: "#ffffff"
  on-dark-muted: "#a4a097"
  semantic-success: "#1aae39"
  semantic-warning: "#dd5b00"
  semantic-error: "#e03131"

typography:
  hero-display:
    fontFamily: Notion Sans
    fontSize: 80px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -2px
  display-lg:
    fontFamily: Notion Sans
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.10
    letterSpacing: -1px
  heading-1:
    fontFamily: Notion Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.5px
  heading-2:
    fontFamily: Notion Sans
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-3:
    fontFamily: Notion Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
  heading-4:
    fontFamily: Notion Sans
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.30
  heading-5:
    fontFamily: Notion Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.40
  subtitle:
    fontFamily: Notion Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
  body-md:
    fontFamily: Notion Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-md-medium:
    fontFamily: Notion Sans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.55
  body-sm:
    fontFamily: Notion Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  body-sm-medium:
    fontFamily: Notion Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.50
  caption:
    fontFamily: Notion Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
  caption-bold:
    fontFamily: Notion Sans
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.40
  micro:
    fontFamily: Notion Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.40
  micro-uppercase:
    fontFamily: Notion Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: 1px
  button-md:
    fontFamily: Notion Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.30

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 20px
  xxxl: 24px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section-sm: 48px
  section: 64px
  section-lg: 96px
  hero: 120px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    height: 40px
    padding: "0 18px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.muted}"
  button-dark:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    height: 40px
    padding: "0 18px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    height: 40px
    padding: "0 18px"
    description: "Soft pill — same geometry as primary, no border. Used on dashboard surfaces next to primary CTAs and as quiet navigation buttons (e.g. 'Все инструкции' on the overview page). Hover deepens to {colors.tint-gray}."
  button-on-dark:
    backgroundColor: "{colors.on-dark}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    height: 40px
    padding: "0 18px"
  button-secondary-on-dark:
    backgroundColor: "transparent"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    height: 40px
    padding: "0 18px"
    border: "1px solid {colors.on-dark-muted}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.link-blue}"
    typography: "{typography.body-sm-medium}"
    padding: "0"
  card-base:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  card-feature:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
  card-feature-yellow-bold:
    backgroundColor: "{colors.card-tint-yellow-bold}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-peach:
    backgroundColor: "{colors.card-tint-peach}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-rose:
    backgroundColor: "{colors.card-tint-rose}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-mint:
    backgroundColor: "{colors.card-tint-mint}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-sky:
    backgroundColor: "{colors.card-tint-sky}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-lavender:
    backgroundColor: "{colors.card-tint-lavender}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-yellow:
    backgroundColor: "{colors.card-tint-yellow}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-feature-cream:
    backgroundColor: "{colors.card-tint-cream}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-agent-tile:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  card-template:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.hairline}"
  card-startup-perk:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  pricing-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
  pricing-card-featured:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "2px solid {colors.primary}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    placeholderColor: "{colors.stone}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.lg}"
    padding: "0 {spacing.md}"
    border: "1px solid {colors.hairline}"
    height: 40px
    description: "Form input. Quiet hairline border at rest. Focus state keeps the border 1px (no width change → no layout shift) but darkens to primary and adds a 2px primary ring at 15% opacity via box-shadow. Geometry matches search-pill / segmented-tabs / button-primary."
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.primary}"
    ring: "0 0 0 2px rgba({colors.primary}, 0.15)"
  search-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.steel}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    height: 44px
    border: "1px solid {colors.hairline}"
  pill-tab:
    backgroundColor: "transparent"
    textColor: "{colors.steel}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs} {spacing.md}"
    border: "1px solid {colors.hairline}"
  pill-tab-active:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.full}"
    border: "1px solid {colors.ink-deep}"
  segmented-tab:
    backgroundColor: "transparent"
    textColor: "{colors.steel}"
    typography: "{typography.body-sm-medium}"
    padding: "{spacing.sm} {spacing.md}"
    border: "0 0 2px transparent solid"
  segmented-tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm-medium}"
    border: "0 0 2px {colors.ink} solid"
  badge-purple:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-pink:
    backgroundColor: "{colors.brand-pink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-orange:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-tag-purple:
    backgroundColor: "{colors.card-tint-lavender}"
    textColor: "{colors.brand-purple-800}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-tag-orange:
    backgroundColor: "{colors.card-tint-peach}"
    textColor: "{colors.brand-orange-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-tag-green:
    backgroundColor: "{colors.card-tint-mint}"
    textColor: "{colors.brand-green}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-tag-gray:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.steel}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-popular:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  promo-banner:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm-medium}"
    padding: "{spacing.sm} {spacing.md}"
  hero-band-dark:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.on-dark}"
    rounded: "0"
    padding: "{spacing.hero}"
  workspace-mockup-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "0"
    border: "1px solid {colors.hairline}"
    shadow: "rgba(15, 15, 15, 0.2) 0px 24px 48px -8px"
  cta-banner-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.section}"
  comparison-table:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.hairline}"
  comparison-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    padding: "{spacing.md} {spacing.lg}"
    border: "0 0 1px {colors.hairline-soft} solid"
  testimonial-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
  logo-wall-item:
    backgroundColor: "transparent"
    textColor: "{colors.steel}"
    typography: "{typography.body-md-medium}"
    padding: "{spacing.lg}"
  faq-accordion-item:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
    border: "0 0 1px {colors.hairline} solid"
  stat-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.section-sm}"
  footer-region:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-sm}"
    padding: "{spacing.section} {spacing.xxl}"
    border: "1px solid {colors.hairline}"
  footer-link:
    backgroundColor: "transparent"
    textColor: "{colors.steel}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xxs} 0"
  dashboard-shell:
    backgroundColor: "{colors.canvas}"
    layout: "grid 288px / 1fr"
    description: "Top-level grid for dashboard pages. No top header — sidebar holds the brand row, content holds its own header-row. 24px outer inset on right/bottom, 12px on top (lifts brand and page header)."
  dashboard-sidebar:
    backgroundColor: "transparent"
    width: 288px
    padding: "12px 24px 24px 24px"
    sticky: true
    description: "Sticky vertical column. Inner box has no background — brand-row sits on canvas (white), while a separate shell below provides the surface tint."
  dashboard-sidebar-brand:
    backgroundColor: "{colors.canvas}"
    height: 64px
    padding: "0 8px"
    description: "Brand row: 48×48 rounded-lg logo + UPPERCASE wordmark 'quar.io' in {typography.heading-4} with letter-spacing, color {colors.brand-navy} at 50% opacity. Matches the y-coordinate of the page header-row."
  dashboard-sidebar-shell:
    backgroundColor: "{colors.surface}"
    rounded: "14px"
    padding: "{spacing.sm}"
    description: "Grey rounded panel under the brand row. Holds collapse button, navigation, and footer. Gap of 12px above separates it from the brand row."
  dashboard-sidebar-nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 {spacing.sm}"
    gap: 12px
    description: "Sidebar navigation item. Left-aligned icon (16px) + label."
  dashboard-sidebar-nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    description: "Active state — primary-blue pill, white text and icon."
  dashboard-sidebar-footer:
    backgroundColor: "transparent"
    padding: "8px 0 0 0"
    border: "0 0 0 0 / 1px 0 0 0 solid {colors.hairline}"
    description: "Footer section at the bottom of the shell. Holds tenant row (read-only) and user-row (NuxtLink to /dashboard/settings)."
  dashboard-sidebar-footer-row:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    gap: 8px
    minHeight: 32px
    description: "Single row inside the footer: 16px icon + label. User-row is interactive and uses the active-pill treatment when /dashboard/settings is open."
  page-header:
    backgroundColor: "transparent"
    minHeight: 64px
    description: "Page-level header row inside .dashboard-content. Always: 24px icon ({colors.brand-navy} at 50% opacity) + h3 title ({typography.heading-3}, {colors.brand-navy}). Vertically centred; right side holds optional #actions slot."
  page-header-title:
    typography: "{typography.heading-3}"
    textColor: "{colors.brand-navy}"
  page-header-icon:
    color: "{colors.brand-navy}"
    opacity: 0.5
    size: 24px
  segmented-tabs:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "4px"
    height: 40px
    description: "Pill container holding two or more equal-width buttons in inline-grid. A floating bg-canvas indicator with {shadow.subtle} translates between positions on selection (200ms ease-out)."
  segmented-tab-active:
    textColor: "{colors.ink}"
  segmented-tab-inactive:
    textColor: "{colors.stone}"
  search-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    placeholderColor: "{colors.stone}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.lg}"
    padding: "0 {spacing.md} 0 36px"
    height: 40px
    border: "1px solid transparent"
    description: "Dashboard search input. Same height as segmented-tabs and primary button. On focus, background flips to canvas, border to primary, plus 2px ring at 20% opacity."
---

## Overview

Notion presents itself as the all-in-one workspace through a confident, illustration-rich brand voice. The homepage opens with **"Meet the night shift."** rendered centered over a deep navy hero band ({colors.brand-navy}), decorated with brand-colored sticky-note dots and mesh wire illustrations scattered around the headline. The signature **purple pill primary CTA** ({colors.primary}) "Get Notion free" sits at the visual center, paired with an outlined "Request a demo" secondary. Below the buttons, a real Notion workspace UI mockup card (the "Ramp HQ" kanban board) breaks out of the hero band with a deep diffuse drop shadow.

Below the hero, the page cycles through a distinctive sequence of feature sections: a dense sticky-note "Keep work moving 24/7" panel with red/blue/green/purple/teal status icons; a **bold yellow** ({colors.card-tint-yellow-bold}) "Ask your on-demand assistants" banner card flanked by orange/rose/mint pastel feature tiles showing assistant UI mockups; and a "Bring all your work together" 3-column grid with brand-colored mockups (sky-blue tutorial card, light Notion calendar, brown/rust testimonial slate). The pricing page renders 4 tiers (Free / Plus / Business / Enterprise) horizontally with one tier featured (purple-bordered) and a dense feature comparison table running below.

The system uses a Notion-Sans typeface (Inter-based) across every UI surface — humanist-geometric character that pairs naturally with the colorful illustrations. Buttons are `{rounded.md}` (8px) rectangles, NOT pills — distinguishing Notion's sober rectangular geometry from competitors that use pills universally. Cards use `{rounded.lg}` (12px) consistently.

**Key Characteristics:**
- Deep navy hero band ({colors.brand-navy}) with scattered sticky-note dots + mesh wire decorative illustrations
- **Signature purple pill** ({colors.primary}) primary CTA — Notion's recognizable "Get Notion free" button color
- Real Notion workspace UI mockup card embedded in the hero with deep drop shadow
- Bold yellow feature banner ({colors.card-tint-yellow-bold}) for high-emphasis content sections
- Pastel feature card palette (peach, rose, mint, lavender, sky, yellow) echoing the live product database properties
- Notion-Sans (Inter-based) across every UI surface
- 8px-rounded buttons (NOT pills), 12px-rounded cards — sober editorial geometry
- 4-tier pricing comparison with dense feature table
- Centered hero layout (different from the left-aligned norm of most B2B SaaS)

## Colors

> Source pages: notion.com/ (homepage), /enterprise, /product/ai, /product/agents, /startups, /pricing. Token coverage was identical across all six pages.

### Brand & Primary
- **Notion Purple** ({colors.primary}): Signature primary CTA color — the unmistakable "Get Notion free" pill button. Reserved for the dominant CTA only.
- **Purple Pressed** ({colors.primary-pressed}): Pressed-state variant
- **Purple Deep** ({colors.primary-deep}): Deeper variant for emphasis
- **Brand Navy** ({colors.brand-navy}): Hero band background — deep navy
- **Brand Navy Deep** ({colors.brand-navy-deep}): Deeper navy for promo banner
- **Brand Navy Mid** ({colors.brand-navy-mid}): Mid-spectrum navy
- **Link Blue** ({colors.link-blue}): Inline text link blue (NOT primary CTA)
- **Link Blue Pressed** ({colors.link-blue-pressed}): Pressed-state link blue

### Brand Color Spectrum (echoes live product database properties)
- **Brand Pink** ({colors.brand-pink}): Pink accent
- **Brand Pink Deep** ({colors.brand-pink-deep}): Deeper pink
- **Brand Orange** ({colors.brand-orange}): Orange accent
- **Brand Orange Deep** ({colors.brand-orange-deep}): Deeper orange-rust
- **Brand Purple** ({colors.brand-purple}): Purple accent variant
- **Brand Purple 300** ({colors.brand-purple-300}): Light purple
- **Brand Purple 800** ({colors.brand-purple-800}): Deep purple for tag text
- **Brand Teal** ({colors.brand-teal}): Teal accent
- **Brand Green** ({colors.brand-green}): Bright green
- **Brand Yellow** ({colors.brand-yellow}): Soft yellow
- **Brand Brown** ({colors.brand-brown}): Brand brown for "earthy" tints

### Card Tints (Pastel Feature Card Backgrounds)
- **Tint Peach** ({colors.card-tint-peach}): Pale peach
- **Tint Rose** ({colors.card-tint-rose}): Pale rose-pink
- **Tint Mint** ({colors.card-tint-mint}): Pale mint-green
- **Tint Lavender** ({colors.card-tint-lavender}): Pale lavender
- **Tint Sky** ({colors.card-tint-sky}): Pale sky-blue
- **Tint Yellow** ({colors.card-tint-yellow}): Pale yellow
- **Tint Yellow Bold** ({colors.card-tint-yellow-bold}): Bold yellow for high-emphasis feature banners ("Ask your on-demand assistants")
- **Tint Cream** ({colors.card-tint-cream}): Cream tint
- **Tint Gray** ({colors.card-tint-gray}): Neutral surface

### Surface
- **Canvas White** ({colors.canvas}): Page background and primary card surface
- **Surface** ({colors.surface}): Subtle section backgrounds, search-pill rest, featured pricing tier
- **Surface Soft** ({colors.surface-soft}): Quieter section divisions
- **Hairline** ({colors.hairline}): 1px borders and primary dividers
- **Hairline Soft** ({colors.hairline-soft}): Quieter dividers
- **Hairline Strong** ({colors.hairline-strong}): Stronger 1px border for inputs

### Text
- **Ink Deep** ({colors.ink-deep}): Pure black for emphasis
- **Ink** ({colors.ink}): Primary headlines and body text
- **Charcoal** ({colors.charcoal}): Body emphasis (Notion's signature warm-charcoal)
- **Slate** ({colors.slate}): Secondary text
- **Steel** ({colors.steel}): Tertiary, footer links
- **Stone** ({colors.stone}): Muted labels
- **Muted** ({colors.muted}): Disabled, placeholders
- **On Dark** ({colors.on-dark}): White text on dark surfaces
- **On Dark Muted** ({colors.on-dark-muted}): Reduced-opacity white

### Semantic
- **Success** ({colors.semantic-success}): Confirmation green
- **Warning** ({colors.semantic-warning}): Mid-priority alerts (orange)
- **Error** ({colors.semantic-error}): Validation errors (red)

## Typography

### Font Family
**Notion Sans** (primary): Notion's custom Inter-based variable typeface. Fallbacks: Inter, -apple-system, system-ui, 'Segoe UI', Helvetica, sans-serif. Humanist-geometric character used across every UI surface.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 80px | 600 | 1.05 | -2px | Hero ("Meet the night shift") |
| `{typography.display-lg}` | 56px | 600 | 1.10 | -1px | Section openers |
| `{typography.heading-1}` | 48px | 600 | 1.15 | -0.5px | Page-level headlines ("Try for free") |
| `{typography.heading-2}` | 36px | 600 | 1.20 | -0.5px | Subsection headlines ("Keep work moving 24/7") |
| `{typography.heading-3}` | 28px | 600 | 1.25 | 0 | Card titles |
| `{typography.heading-4}` | 22px | 600 | 1.30 | 0 | Feature tile titles |
| `{typography.heading-5}` | 18px | 600 | 1.40 | 0 | FAQ questions |
| `{typography.subtitle}` | 18px | 400 | 1.50 | 0 | Hero subtitle |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | Primary body text |
| `{typography.body-md-medium}` | 16px | 500 | 1.55 | 0 | Body emphasis |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | Secondary body |
| `{typography.body-sm-medium}` | 14px | 500 | 1.50 | 0 | Active sidebar, button labels |
| `{typography.caption-bold}` | 13px | 600 | 1.40 | 0 | Badge labels |
| `{typography.button-md}` | 14px | 500 | 1.30 | 0 | Button labels |

### Principles
- Tight hero leading (1.05) on 80px display
- Negative letter-spacing on display sizes (-2px to -0.5px)
- Generous body leading (1.55) for documentation readability
- 600 weight for headlines + 500 for buttons; 400 body

## Layout

### Spacing System
- **Base unit**: 4px (8px primary increment)
- **Tokens**: `{spacing.xxs}` (4px) through `{spacing.hero}` (120px)
- **Section rhythm**: Marketing pages use `{spacing.section-lg}` (96px); pricing tightens to `{spacing.section}` (64px)

### Grid & Container
- 1280px max-width with 32px gutters
- Pricing: 4-tier card row at desktop with dense comparison table
- Homepage: centered hero with workspace mockup below buttons; alternating colorful feature card sections

### Whitespace Philosophy
Marketing surfaces use generous breathing room between feature card bands. Workspace mockup card on hero gets full-width treatment with deep drop shadow.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow; `{colors.hairline}` border | Default cards, table rows |
| 1 (subtle) | `rgba(15, 15, 15, 0.04) 0px 1px 2px 0px` | Hover-elevated tiles |
| 2 (card) | `rgba(15, 15, 15, 0.08) 0px 4px 12px 0px` | Feature cards |
| 3 (mockup) | `rgba(15, 15, 15, 0.20) 0px 24px 48px -8px` | Hero workspace mockup card |
| 4 (modal) | `rgba(15, 15, 15, 0.16) 0px 16px 48px -8px` | Modals, dropdowns |

### Decorative Depth
- Hero workspace mockup card uses deep diffuse drop shadow (Level 3) — significant elevation against the navy band
- Pastel feature cards carry their own visual weight via tint backgrounds
- Sticky-note dot illustrations and mesh wires add atmospheric decoration to navy hero

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Tag chips |
| `{rounded.sm}` | 6px | Type badges |
| `{rounded.md}` | 8px | Buttons, inputs, search-pill |
| `{rounded.lg}` | 12px | Cards, pricing tiers, agent tiles, workspace mockup |
| `{rounded.xl}` | 16px | Larger feature panels |
| `{rounded.xxl}` | 20px | Featured product showcases |
| `{rounded.xxxl}` | 24px | Larger feature cards |
| `{rounded.full}` | 9999px | Status badges, pill tabs (NOT regular buttons) |

Notion's geometry is sober-editorial — `{rounded.md}` (8px) buttons distinguish it from pill-button-everywhere brands.

## Components

> Per the no-hover policy, hover states are NOT documented.

### Buttons

**`button-primary`** — Signature purple rectangular primary CTA, the dominant action.
- Background `{colors.primary}`, text `{colors.on-primary}`, typography `{typography.button-md}`, padding `10px 18px`, rounded `{rounded.md}`.
- Pressed state `button-primary-pressed` deepens to `{colors.primary-pressed}`.
- Disabled state uses `{colors.hairline}` background.

**`button-dark`** — Black rectangular CTA on light backgrounds.
- Background `{colors.ink-deep}`, text `{colors.on-dark}`, typography `{typography.button-md}`, padding `10px 18px`, rounded `{rounded.md}`.

**`button-secondary`** — Outlined rectangular for secondary actions ("Request a demo").
- Background transparent, text `{colors.ink}`, border `1px solid {colors.hairline-strong}`, typography `{typography.button-md}`, padding `10px 18px`, rounded `{rounded.md}`.

**`button-on-dark`** — White button on dark hero bands.
- Background `{colors.on-dark}`, text `{colors.ink}`, typography `{typography.button-md}`, padding `10px 18px`, rounded `{rounded.md}`.

**`button-secondary-on-dark`** — Outlined button on dark.
- Background transparent, text `{colors.on-dark}`, border `1px solid {colors.on-dark-muted}`, typography `{typography.button-md}`, padding `10px 18px`, rounded `{rounded.md}`.

**`button-ghost`** — Quieter ghost button.
- Background transparent, text `{colors.ink}`, typography `{typography.button-md}`, padding `8px 12px`, rounded `{rounded.sm}`.

**`button-link`** — Inline blue text link (NOT primary purple).
- Background transparent, text `{colors.link-blue}`, typography `{typography.body-sm-medium}`, padding `0`.

### Cards & Containers

**`card-base`** — Standard content card.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.

**`card-feature`** — Feature card with larger padding.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`, border `1px solid {colors.hairline}`.

**`card-feature-yellow-bold`** — Bold yellow feature banner for high-emphasis content ("Ask your on-demand assistants").
- Background `{colors.card-tint-yellow-bold}`, text `{colors.charcoal}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`.

**`card-feature-peach`** + **`card-feature-rose`** + **`card-feature-mint`** + **`card-feature-sky`** + **`card-feature-lavender`** + **`card-feature-yellow`** + **`card-feature-cream`** — Pastel-tinted feature cards.
- Each variant uses its corresponding `card-tint-*` color as background, text `{colors.charcoal}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`.

**`card-agent-tile`** — Agent assistant tile.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.

**`card-template`** — Template thumbnail card.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.lg}`, border `1px solid {colors.hairline}`.

**`card-startup-perk`** — Startup-program perk grid item.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.

**`pricing-card`** — Standard pricing tier card.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`, border `1px solid {colors.hairline}`.

**`pricing-card-featured`** — Featured pricing tier (Plus or Business — purple-bordered).
- Background `{colors.surface}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`, border `2px solid {colors.primary}`.

### Inputs & Forms

**`text-input`** — Standard text field.
- Background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.hairline-strong}`, rounded `{rounded.md}`, padding `{spacing.sm} {spacing.md}`, height 44px.

**`text-input-focused`** — Activated state.
- Border switches to `2px solid {colors.primary}` (purple).

**`search-pill`** — Search bar.
- Background `{colors.surface}`, text `{colors.steel}`, typography `{typography.body-md}`, rounded `{rounded.md}`, height 44px, border `1px solid {colors.hairline}`.

### Tabs

**`pill-tab`** + **`pill-tab-active`** — Pill-style tab nav for top-level switching.
- Inactive: text `{colors.steel}`, border `1px solid {colors.hairline}`, padding `{spacing.xs} {spacing.md}`, rounded `{rounded.full}`.
- Active: background `{colors.ink-deep}`, text `{colors.on-dark}`.

**`segmented-tab`** + **`segmented-tab-active`** — Underline-style tab navigation.
- Inactive: text `{colors.steel}`, no border. Active: text `{colors.ink}`, 2px bottom border in `{colors.ink}`.

### Badges & Status

**`badge-purple`** — Purple status badge (matches primary CTA).
- Background `{colors.primary}`, text `{colors.on-primary}`, typography `{typography.caption-bold}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-pink`** — Pink accent badge.
- Background `{colors.brand-pink}`, text `{colors.on-primary}`, typography `{typography.caption-bold}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-orange`** — Orange accent badge.
- Background `{colors.brand-orange}`, text `{colors.on-primary}`, typography `{typography.caption-bold}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-tag-purple`** — Soft-purple feature tag chip.
- Background `{colors.card-tint-lavender}`, text `{colors.brand-purple-800}`, typography `{typography.caption-bold}`, rounded `{rounded.sm}`, padding `2px 8px`.

**`badge-tag-orange`** — Soft-orange feature tag.
- Background `{colors.card-tint-peach}`, text `{colors.brand-orange-deep}`, typography `{typography.caption-bold}`, rounded `{rounded.sm}`, padding `2px 8px`.

**`badge-tag-green`** — Soft-mint feature tag.
- Background `{colors.card-tint-mint}`, text `{colors.brand-green}`, typography `{typography.caption-bold}`, rounded `{rounded.sm}`, padding `2px 8px`.

**`badge-popular`** — "Most Popular" tier indicator.
- Background `{colors.primary}`, text `{colors.on-primary}`, typography `{typography.caption-bold}`, rounded `{rounded.full}`, padding `4px 10px`.

**`promo-banner`** — Light surface promo strip ABOVE the top nav.
- Background `{colors.surface}`, text `{colors.ink}`, typography `{typography.body-sm-medium}`, padding `{spacing.sm} {spacing.md}`. ("Developers: Get a first look at our new Developer Platform on May 13.")

### Tables

**`comparison-table`** — Pricing feature comparison table.
- Background `{colors.canvas}`, text `{colors.ink}`, typography `{typography.body-sm}`, rounded `{rounded.md}`, border `1px solid {colors.hairline}`.

**`comparison-row`** — Individual feature row.
- Background `{colors.canvas}`, text `{colors.ink}`, padding `{spacing.md} {spacing.lg}`, bottom border `1px solid {colors.hairline-soft}`.

### Documentation Components

**`workspace-mockup-card`** — Embedded Notion workspace UI mockup on hero band ("Ramp HQ" kanban board).
- Background `{colors.canvas}`, rounded `{rounded.lg}`, border `1px solid {colors.hairline}`, deep shadow `rgba(15, 15, 15, 0.20) 0px 24px 48px -8px`. Carries actual Notion product UI mock.

**`testimonial-card`** — Customer testimonial card.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`, border `1px solid {colors.hairline}`.

**`logo-wall-item`** — Customer logo wordmark cell.
- Background transparent, text `{colors.steel}`, typography `{typography.body-md-medium}`, padding `{spacing.lg}`.

**`faq-accordion-item`** — FAQ panel.
- Background `{colors.canvas}`, rounded `{rounded.md}`, padding `{spacing.xl}`, bottom border `1px solid {colors.hairline}`.

**`stat-row`** — Stats strip with bar chart visualization ("More productivity. Fewer tools.").
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.lg}`, padding `{spacing.section-sm}`.

**`cta-banner-light`** — Light surface CTA banner.
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.lg}`, padding `{spacing.section}`.

### Navigation

**Top Navigation (Marketing)** — Sticky white bar.
- Background `{colors.canvas}`, height ~64px, bottom border `1px solid {colors.hairline}`.
- Left: Notion "N" logo + "Product / AI / Solutions / Resources / Enterprise / Pricing / Request a demo" links.
- Right: "Get Notion free" purple button + "Log in" link.

### Signature Components

**`hero-band-dark`** — Deep navy hero band with embedded workspace mockup and decorative dots/wires.
- Background `{colors.brand-navy}`, text `{colors.on-dark}`, padding `{spacing.hero}`.
- Layout: centered headline `{typography.hero-display}`, subtitle, button row (`button-primary` purple + `button-secondary-on-dark`), `workspace-mockup-card` below.
- Atmospheric decoration: scattered colorful sticky-note dots and mesh wire illustrations around the hero content (NOT a literal pattern fill — handled per-page via SVG/illustration).

**`footer-region`** — Multi-column light footer.
- Background `{colors.canvas}`, padding `{spacing.section} {spacing.xxl}`, top border `1px solid {colors.hairline}`.
- 6-column link grid (Product / Download / Resources / Notion for / Company / Legal).

**`footer-link`** — Individual footer link.
- Background transparent, text `{colors.steel}`, typography `{typography.body-sm}`, padding `{spacing.xxs} 0`.

## Do's and Don'ts

### Do
- Use `{colors.primary}` (purple) as the dominant CTA across all surfaces — it's the brand's recognizable signal
- Pair deep navy hero bands ({colors.brand-navy}) with the purple button + decorative sticky-note dots
- Use pastel feature card tints (peach, rose, mint, lavender, sky, yellow) generously
- Use `{colors.card-tint-yellow-bold}` for high-emphasis "Ask the assistant"-style banner cards
- Apply `{rounded.md}` (8px) to buttons consistently — Notion uses rectangles, not pills
- Apply `{rounded.lg}` (12px) to all card families
- Maintain Notion-Sans across every UI surface
- Use the workspace mockup card on hero bands to show actual product UI

### Don't
- Don't use the purple for body text or large background surfaces
- Don't use pill-shaped buttons; Notion's geometry is rectangular-sober
- Don't mix link-blue ({colors.link-blue}) with primary-purple ({colors.primary}) — they have distinct roles
- Don't apply heavy shadows on flat documentation cards
- Don't replace Notion-Sans with a generic Inter

## Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile (small) | < 480px | Single column. Hero 36px. Pricing 1-up. |
| Mobile (large) | 480 – 767px | Feature cards 2-up. Hero 48px. |
| Tablet | 768 – 1023px | 2-column feature grids. Hero 56px. |
| Desktop | 1024 – 1279px | 4-tier pricing card row. Hero 72px. |
| Wide Desktop | ≥ 1280px | Full 80px hero presentation. |

### Touch Targets
- Buttons render at 40–44px effective height
- Form inputs render at 44px height
- Pill tabs ~32px → 44px on mobile

### Collapsing Strategy
- **Promo banner** stays full-width; truncates at < 480px
- **Top nav** below 1024px collapses to hamburger
- **Hero band**: workspace mockup card moves below text/buttons on mobile
- **Pricing tiers**: 4-column → 2-column tablet → 1-column mobile
- **Feature cards**: 3-up desktop → 2-up tablet → 1-up mobile
- **Hero typography**: 80px → 56px → 48px → 36px
- **Footer**: 6-column desktop → 3-column tablet → accordion mobile

### Image Behavior
- Workspace mockup card maintains aspect ratio
- Pastel illustrations inside feature cards scale proportionally
- Customer logo wall: wordmarks at consistent 60–80px height

## Dashboard

The dashboard mode is a separate visual track from the marketing surfaces — closer to **macOS System Settings** than to Notion's landing pages. It is what users see at `/dashboard/*` after they log in.

### Mental model

Two boxes on a white canvas: a sticky **sidebar** on the left, **content** on the right. There is **no top header** — the brand row (logo + wordmark) lives inside the sidebar, and each page provides its own header-row that aligns horizontally with that brand row.

### Layout shell — `dashboard-shell`

- Top-level CSS grid: `288px` sidebar column (`80px` when collapsed) + `1fr` content column.
- Body background is `{colors.canvas}` (white). The grid uses default `stretch` on the cross axis so the sidebar column matches content height — essential for `position: sticky` to engage inside the sidebar.
- Outer insets are asymmetric on purpose: **top 12px, right/left/bottom 24px**. The 12px top raises the brand row and page header-row toward the chrome edge of the window.

### Sidebar — `dashboard-sidebar` + `dashboard-sidebar-inner`

The sidebar is a `position: sticky` (`top: 12px`) flex column with two distinct visual zones:

**Brand-row (`dashboard-sidebar-brand`)** — height 64px, lives on the canvas-white background (NOT inside the grey shell). Holds the 48×48 rounded-lg logo and the UPPERCASE wordmark "quar.io" rendered in `{typography.heading-4}` with `tracking-wider`, colour `{colors.brand-navy}` at 50% opacity. The brand row's vertical centre line is the single horizontal anchor for every page header-row in the dashboard.

**Shell (`dashboard-sidebar-shell`)** — grey panel with `{rounded.lg+}` (14px), background `{colors.surface}`. Stacked vertically inside:
1. **Collapse button** — left-aligned, in line with nav-items (icon + label or icon only when collapsed).
2. **Navigation** — `flex: 1` so it pushes the footer to the bottom. Each item: 36px tall, `{rounded.md}`. Active state is the primary-blue pill (`bg-primary` + `text-on-primary`). Hover: `bg-canvas/70`.
3. **Footer (`dashboard-sidebar-footer`)** — divided from nav by a 1px hairline. Holds two rows: tenant (icon `lucide:building-2`, read-only) and user (icon `lucide:user-round`, this row is a `NuxtLink` to `/dashboard/settings` and renders the active-pill when that page is open).

### Content — `dashboard-content`

- Padding-top 12px (matches the sidebar so brand-row and page header-row share a y-coordinate).
- No `max-width` — content fills the column. Dense tables get full width on wide monitors.
- The first child must be a `PageHeader` (see below).
- Between `PageHeader` and the next working row (tabs / filters / form) place `mt-sm` (12px). The sidebar uses a 12px gap between brand-row and shell — this matches.

### Page header — `PageHeader` component

Every dashboard page MUST start with:

```vue
<PageHeader icon="lucide:..." title="Page name">
  <template #actions>
    <!-- optional right-side controls -->
  </template>
</PageHeader>
```

Render contract:
- Flex row, `min-h-16` (64px), `items-center`, `justify-between`.
- Left: 24px icon in `{colors.brand-navy}` at 50% opacity + h3 (`{typography.heading-3}`) title in `{colors.brand-navy}`.
- Right: `#actions` slot for buttons/links.
- Icon choice MUST match the sidebar nav-item icon (`lucide:file-text` for Instructions, `lucide:qr-code` for QR codes, etc.) so the page identity is consistent between the menu and the content.

### Working row — segmented tabs + search + button

Below `PageHeader` (with `mt-sm`), pages typically render a single horizontal flex row containing:
- **Segmented tabs** on the left — `segmented-tabs` component (height 40px). Two or more equal-width buttons; a floating `bg-canvas` indicator with `{shadow.subtle}` translates between positions on selection.
- **Search input** — `search-pill` component. Same height, same `{rounded.lg}`. Grey at rest, primary-blue border + canvas background + 20%-ring on focus.
- **Primary CTA** — `UiButton size="md"` (height 40px, `{rounded.lg}`). Lives in the same row as search, on the right.

All three elements share **h-10 (40px)** height and `{rounded.lg}` for visual alignment. This is the canonical working-row of the dashboard.

### Tables

- **No `UiCard` wrapper around tables**, no surrounding border. Tables sit directly on the canvas so the leftmost column heading aligns with the page title and tab pill above.
- Column headers: `{typography.caption}` uppercase, colour `{colors.steel}`, bottom-border `1px solid {colors.hairline}`.
- Row title: `{typography.body-sm-medium}` (14px / 500), colour `{colors.ink}`. Secondary line (slug, barcode): `{typography.caption}`, colour `{colors.steel}`.
- Rows separated by `1px solid {colors.hairline-soft}` (no full grid).

### Status badges in dashboard tables

Use the `tag-*` variants (rounded-sm chips, NOT full pills):
- `tag-green` for success states (e.g. `PUBLISHED`).
- `tag-orange` for warning / outdated states (`ARCHIVED`, `IN_REVIEW`).
- `tag-gray` for neutral states (`DRAFT`). `tag-gray` is a quar.io-specific variant — Notion's original tag-purple was kept for marketing surfaces but felt off-tone for state pills inside the dashboard.

### Mobile

- Sidebar is hidden below `md`. A `position: fixed` 40×40 hamburger button sits in the top-left.
- Tap opens a left-sliding overlay panel (86vw, max 320px) with the same brand row, nav, and footer.
- Backdrop is `rgba(15,15,15,0.32)`. Click outside the panel closes it.

## Iteration Guide

1. Focus on ONE component at a time
2. Reference component names and tokens directly
3. Run `npx @google/design.md lint DESIGN.md` after edits
4. Add new variants as separate `components:` entries
5. Default to `{typography.body-md}` for body
6. Keep `{colors.primary}` (blue, sourced from the quar.io logo) as the primary CTA — distinct from `{colors.link-blue}` for inline links
7. Use `{rounded.lg}` (12px) for buttons, inputs, segmented-tabs, and cards in the dashboard. `{rounded.md}` (8px) is reserved for small/compact controls (small buttons, nav-items inside the sidebar). `{rounded.full}` for status pills and circular badges only.
8. Inside the dashboard, NEVER add a top header bar. The brand row lives in the sidebar; each page brings its own `PageHeader`.

## Known Gaps

- Specific dark-mode token values not surfaced beyond hero bands
- Animation/transition timings not extracted; recommend 150–200ms ease
- Form validation success state not explicitly captured
- Pastel-tint mapping (which feature uses which tint) is observation-based — the actual brand library may have more entries
