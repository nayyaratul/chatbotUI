/**
 * Brand presets for the Studio BrandPicker.
 *
 * Each preset provides a full --brand-0..100 shade scale. When a
 * preset is selected, the values are applied as CSS custom
 * properties on the app root so that Nexus's `--color-action-*`
 * tokens (which already resolve to `var(--brand-50/60/70)`) and
 * our own widgets (which use `var(--brand-60)` for accents) flow
 * through without any extra wiring.
 *
 * The `swatch` field is the single colour shown as the picker
 * button (we use the -60 shade by convention).
 */
export const BRAND_PRESETS = [
  {
    id: 'nexus-blue',
    name: 'Nexus Blue',
    swatch: '#1459C7',
    shades: {
      0:   '#FAFCFF',
      10:  '#D1E0F6',
      20:  '#ABC4EE',
      30:  '#82ABF0',
      40:  '#5692F6',
      50:  '#1C6EF1',
      60:  '#1459C7',
      70:  '#0C47A4',
      80:  '#03337D',
      90:  '#001F5C',
      100: '#050B15',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    swatch: '#6D28D9',
    shades: {
      0:   '#F5F3FF',
      10:  '#DDD6FE',
      20:  '#C4B5FD',
      30:  '#A78BFA',
      40:  '#8B5CF6',
      50:  '#7C3AED',
      60:  '#6D28D9',
      70:  '#5B21B6',
      80:  '#4C1D95',
      90:  '#2E1065',
      100: '#1E0B4D',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatch: '#047857',
    shades: {
      0:   '#ECFDF5',
      10:  '#A7F3D0',
      20:  '#6EE7B7',
      30:  '#34D399',
      40:  '#10B981',
      50:  '#059669',
      60:  '#047857',
      70:  '#065F46',
      80:  '#064E3B',
      90:  '#022C22',
      100: '#0C0A09',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: '#C2410C',
    shades: {
      0:   '#FFF7ED',
      10:  '#FED7AA',
      20:  '#FDBA74',
      30:  '#FB923C',
      40:  '#F97316',
      50:  '#EA580C',
      60:  '#C2410C',
      70:  '#9A3412',
      80:  '#7C2D12',
      90:  '#431407',
      100: '#1C0A00',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#BE123C',
    shades: {
      0:   '#FFF1F2',
      10:  '#FECDD3',
      20:  '#FDA4AF',
      30:  '#FB7185',
      40:  '#F43F5E',
      50:  '#E11D48',
      60:  '#BE123C',
      70:  '#9F1239',
      80:  '#881337',
      90:  '#4C0519',
      100: '#18020A',
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    swatch: '#374151',
    shades: {
      0:   '#F9FAFB',
      10:  '#E5E7EB',
      20:  '#D1D5DB',
      30:  '#9CA3AF',
      40:  '#6B7280',
      50:  '#4B5563',
      60:  '#374151',
      70:  '#1F2937',
      80:  '#111827',
      90:  '#030712',
      100: '#000000',
    },
  },
]

/**
 * Flattens a preset's shade map into an object suitable for React's
 * `style` prop — e.g. `{ '--brand-50': '#1C6EF1', '--brand-60': '...', ... }`.
 * Pass the result to any element's `style` to scope the override to
 * that element and its descendants.
 */
export function brandToCssVars(preset) {
  if (!preset?.shades) return {}
  const out = {}
  for (const [k, v] of Object.entries(preset.shades)) {
    out[`--brand-${k}`] = v
  }
  return out
}
