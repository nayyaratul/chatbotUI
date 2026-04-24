import { useMemo, useState } from 'react'
import { Button } from '@nexus/atoms'
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
    buckets.get(category).push({ type, label: schema.label })
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

export function Injector({ bot }) {
  const groups = useMemo(buildGroups, [])
  const [state, setState] = useState(() => initialSelection(groups))
  const [error, setError] = useState(null)

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

  if (!state.type) {
    return <div className={styles.empty}>No widgets registered.</div>
  }

  return (
    <div className={styles.injector}>
      <WidgetPalette
        groups={groups}
        selected={state.type}
        onSelect={selectWidget}
      />
      <VariantRow
        variants={activeVariants}
        selected={state.variantId}
        onSelect={selectVariant}
      />
      <PayloadEditor
        value={state.payloadText}
        error={error}
        onChange={onPayloadChange}
      />
      <div className={styles.actions}>
        <Button variant="primary" size="sm" onClick={injectAsBot}>
          Inject as bot
        </Button>
        <Button variant="secondary" size="sm" onClick={injectAsUser}>
          Inject as user
        </Button>
      </div>
    </div>
  )
}
