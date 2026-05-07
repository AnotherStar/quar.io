// Module SDK — contract every pluggable module implements.
//
// A module = small unit shipped independently of the platform core.
// It declares a manifest (synced to DB on boot via prisma seed) and provides:
//   - a Vue component to render on the public instruction page
//   - optional Vue component for tenant-side configuration UI
//   - optional server-route-installer for backend endpoints
//
// The host platform never imports module internals directly; it discovers
// modules via the registry (`modules-sdk/registry.ts`) and renders them by code.

import type { Component } from 'vue'

export interface ModuleConfigField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  required?: boolean
  default?: unknown
  options?: Array<{ value: string; label: string }>
}

export interface ModuleManifestDef {
  /** unique stable id (`warranty-registration`) */
  code: string
  name: string
  description?: string
  version: string
  /** minimum plan code (`free` | `plus` | `business`); null = always available */
  requiresPlan?: string | null
  /** JSON Schema describing per-instance config (used by dashboard form) */
  configSchema: Record<string, unknown>
  /** Optional simplified field list — if present, dashboard renders auto-form */
  configFields?: ModuleConfigField[]
}

export interface ModuleRenderProps {
  instructionId: string
  config: Record<string, unknown>          // merged tenant defaults + per-instruction override
  /** Stable session id of the public viewer (for module-internal analytics) */
  viewerSessionId: string
}

export interface DashboardNavItem {
  /** Link target inside /dashboard */
  to: string
  /** Sidebar label */
  label: string
  /** Lucide icon name, e.g. "lucide:shield-check" */
  icon: string
}

export interface ModuleDefinition {
  manifest: ModuleManifestDef
  /** Public renderer component — receives ModuleRenderProps via $props */
  PublicComponent: () => Promise<{ default: Component }>
  /** Optional tenant-wide admin config component (rendered on /dashboard/modules) */
  AdminComponent?: () => Promise<{ default: Component }>
  /** Optional per-instance config component opened from the editor's
   *  "Настроить" button inside the module-ref dropdown. Receives
   *  `modelValue: Record<string, unknown>` (the current `configOverride`)
   *  and emits `update:modelValue` to persist edits onto the node. */
  EditorConfigComponent?: () => Promise<{ default: Component }>
  /** Optional sidebar entry shown when this module is enabled for the tenant.
   *  Lets a module add its own data view (e.g. warranty registrations list). */
  dashboardNavItem?: DashboardNavItem
}
