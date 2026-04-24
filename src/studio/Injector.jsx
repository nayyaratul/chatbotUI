import { useMemo, useState } from 'react'
import cx from 'classnames'
import { Bot, User, ChevronDown } from 'lucide-react'
import { registry } from '../chat/registry.js'
import { widgetSchemas } from '../engine/widgetSchemas.js'
import { WidgetPalette } from './WidgetPalette.jsx'
import { VariantRow } from './VariantRow.jsx'
import { PayloadEditor } from './PayloadEditor.jsx'
import styles from './injector.module.scss'

const CATEGORY_ORDER = ['action', 'input', 'display', 'advanced', 'engine']
const CATEGORY_LABELS = {
  action:   'Action & Interaction',
  input:    'Input & Data Collection',
  display:  'Display & Information',
  advanced: 'Embedded & Advanced',
  engine:   'Engine',
}

function buildGroups() {
  const buckets = new Map(CATEGORY_ORDER.map((c) => [c, []]))
  for (const [type, schema] of Object.entries(widgetSchemas)) {
    if (!registry[type]) {
      console.warn(`[Injector] widgetSchemas entry '${type}' has no registry match — skipping`)
      continue
    }
    const category = schema.category
    if (!buckets.has(category)) {
      console.warn(`[Injector] widget '${type}' has unknown category '${category}' — skipping`)
      continue
    }
    buckets.get(category).push({
      type,
      label: schema.label,
      variantCount: schema.variants?.length ?? 0,
    })
  }
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      widgets: buckets.get(category),
    }))
    .filter((group) => group.widgets.length > 0)
}

function stringifyPayload(fn) {
  try {
    return JSON.stringify(fn(), null, 2)
  } catch (e) {
    console.warn('[Injector] payload() threw:', e)
    return '{}'
  }
}

function initialSelection(groups) {
  const firstGroup = groups[0]
  const firstType = firstGroup?.widgets[0]?.type
  const firstVariant = firstType ? widgetSchemas[firstType].variants[0] : null
  return {
    type: firstType ?? null,
    variantId: firstVariant?.id ?? null,
    payloadText: firstVariant ? stringifyPayload(firstVariant.payload) : '{}',
  }
}

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPod|iPad/.test(navigator.platform)
const MOD_GLYPH = isMac ? '⌘' : 'Ctrl'

export function Injector({ bot }) {
  const groups = useMemo(buildGroups, [])
  const totalWidgets = useMemo(
    () => groups.reduce((n, g) => n + g.widgets.length, 0),
    [groups],
  )
  const [state, setState] = useState(() => initialSelection(groups))
  const [error, setError] = useState(null)
  // Palette starts open so a fresh user sees what's available. It
  // auto-collapses after the first widget pick — subsequent iterations
  // (switching variants, editing the payload) don't need the picker
  // visible, so this reclaims ~200px of vertical space.
  const [paletteOpen, setPaletteOpen] = useState(true)

  const activeVariants = useMemo(
    () => (state.type ? widgetSchemas[state.type].variants : []),
    [state.type],
  )

  const selectWidget = (type) => {
    if (type === state.type) return
    const firstVariant = widgetSchemas[type].variants?.[0] ?? null
    if (!firstVariant) {
      console.warn(`[Injector] widget '${type}' has no variants — skipping`)
      return
    }
    setState({
      type,
      variantId: firstVariant.id,
      payloadText: stringifyPayload(firstVariant.payload),
    })
    setError(null)
    setPaletteOpen(false)
  }

  const selectVariant = (variantId) => {
    const variant = widgetSchemas[state.type].variants.find((v) => v.id === variantId)
    if (!variant) return
    setState((s) => ({ ...s, variantId, payloadText: stringifyPayload(variant.payload) }))
    setError(null)
  }

  const onPayloadChange = (payloadText) => {
    setState((s) => ({ ...s, payloadText }))
    setError(null)
  }

  const parseOrError = () => {
    try {
      return { ok: true, value: JSON.parse(state.payloadText) }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  const injectAsBot = () => {
    const result = parseOrError()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectBotMessage({ type: state.type, payload: result.value })
  }

  const injectAsUser = () => {
    const result = parseOrError()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectUserWidgetResponse({ type: state.type, payload: result.value })
  }

  const onPayloadKeyDown = (e) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (e.shiftKey) injectAsUser()
    else injectAsBot()
  }

  if (!state.type) {
    return <div className={styles.empty}>No widgets registered.</div>
  }

  return (
    <div className={styles.injector}>

      {/* ─── STAGE 1: WIDGET ─────────────────────────────────── */}
      <section className={styles.stage}>
        <div className={styles.stageHeader}>
          <span className={styles.stageLabel}>Widget</span>
          <span className={styles.stageRule} aria-hidden />
          <button
            type="button"
            className={styles.stageToggle}
            onClick={() => setPaletteOpen((v) => !v)}
            aria-expanded={paletteOpen}
            aria-label={paletteOpen ? 'Collapse widget picker' : 'Expand widget picker'}
          >
            <span className={styles.stageToggleCount}>{totalWidgets}</span>
            <ChevronDown
              size={11}
              className={cx(styles.toggleIcon, paletteOpen && styles.toggleIconOpen)}
              aria-hidden
            />
          </button>
        </div>
        <WidgetPalette
          groups={groups}
          selected={state.type}
          onSelect={selectWidget}
          open={paletteOpen}
          onOpen={() => setPaletteOpen(true)}
        />
      </section>

      {/* ─── STAGE 2: VARIANT (only shown if >1) ─────────────── */}
      {activeVariants.length > 1 && (
        <section className={styles.stage}>
          <div className={styles.stageHeader}>
            <span className={styles.stageLabel}>Variant</span>
            <span className={styles.stageRule} aria-hidden />
            <span className={styles.stageCount}>{activeVariants.length}</span>
          </div>
          <VariantRow
            variants={activeVariants}
            selected={state.variantId}
            onSelect={selectVariant}
          />
        </section>
      )}

      {/* ─── STAGE 3: PAYLOAD + ACTIONS ──────────────────────── */}
      <section className={styles.stage}>
        <PayloadEditor
          value={state.payloadText}
          error={error}
          onChange={onPayloadChange}
          onKeyDown={onPayloadKeyDown}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={cx(styles.actionButton, styles.actionBot)}
            onClick={injectAsBot}
          >
            <Bot size={13} aria-hidden />
            <span className={styles.actionLabel}>Inject as bot</span>
            <kbd className={styles.kbd}>{MOD_GLYPH}↵</kbd>
          </button>
          <button
            type="button"
            className={cx(styles.actionButton, styles.actionUser)}
            onClick={injectAsUser}
          >
            <User size={13} aria-hidden />
            <span className={styles.actionLabel}>Inject as user</span>
            <kbd className={styles.kbd}>{MOD_GLYPH}⇧↵</kbd>
          </button>
        </div>
      </section>

    </div>
  )
}
