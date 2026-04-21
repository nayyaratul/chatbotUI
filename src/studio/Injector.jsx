import { useMemo, useState } from 'react'
import { Button, Select, SelectTrigger, SelectContent, SelectItem, Textarea } from '@nexus/atoms'
import { registry } from '../chat/registry.js'
import { widgetSchemas } from '../engine/widgetSchemas.js'
import styles from './injector.module.scss'

function defaultPayloadJson(type) {
  const schema = widgetSchemas[type]
  return JSON.stringify(schema?.examplePayload ?? {}, null, 2)
}

export function Injector({ bot }) {
  const registeredTypes = useMemo(() => Object.keys(registry), [])
  const [type, setType] = useState(registeredTypes[0] ?? 'text')
  const [payloadText, setPayloadText] = useState(() => defaultPayloadJson(registeredTypes[0] ?? 'text'))
  const [error, setError] = useState(null)

  const onTypeChange = (next) => {
    setType(next)
    setPayloadText(defaultPayloadJson(next))
    setError(null)
  }

  const parsePayload = () => {
    try {
      return { ok: true, value: JSON.parse(payloadText) }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  const injectAsBot = () => {
    const result = parsePayload()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectBotMessage({ type, payload: result.value })
  }

  const injectAsUser = () => {
    const result = parsePayload()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectUserWidgetResponse({ type, payload: result.value })
  }

  return (
    <div className={styles.injector}>
      <div>
        <div className={styles.label}>Widget type</div>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger size="sm" />
          <SelectContent>
            {registeredTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {widgetSchemas[t]?.label ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className={styles.label}>Payload (JSON)</div>
        <Textarea
          className={styles.textarea}
          rows={8}
          value={payloadText}
          onChange={(e) => { setPayloadText(e.target.value); setError(null) }}
        />
      </div>
      {error && <div className={styles.error}>Invalid JSON: {error}</div>}
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
