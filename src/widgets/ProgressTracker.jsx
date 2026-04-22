import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Steps, StepItem } from '@nexus/atoms'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './progressTracker.module.scss'

/**
 * Map our schema status values to Nexus StepItem status values.
 *
 * Nexus recognises: 'complete' | 'active' | 'upcoming'
 * Our schema uses:  'completed' | 'current' | 'pending' | 'failed'
 *
 * 'failed' has no direct Nexus equivalent; we pass 'upcoming' so the
 * marker renders in a neutral style, then overlay a red AlertCircle icon
 * and a "Failed" badge via StepItem's `icon` + `description` props.
 */
function toNexusStatus(schemaStatus) {
  switch (schemaStatus) {
    case 'completed': return 'complete'
    case 'current':   return 'active'
    case 'failed':    return 'upcoming'  // neutral marker; icon overrides visuals
    case 'pending':
    default:          return 'upcoming'
  }
}

function resolveOrientation(requested, stepCount, viewport) {
  if (requested && requested !== 'auto') return requested
  if (stepCount > 6) return 'vertical'
  if (viewport === 'mobile' && stepCount > 5) return 'vertical'
  return 'horizontal'
}

export function ProgressTracker({ payload }) {
  const { viewport } = useViewport()
  const [openId, setOpenId] = useState(null)

  const steps = payload?.steps ?? []
  const orientation = resolveOrientation(payload?.orientation, steps.length, viewport)

  const toggle = (step) => {
    if (step.status !== 'completed' || !step.summary) return
    setOpenId((id) => (id === step.id ? null : step.id))
  }

  const openStep = steps.find((s) => s.id === openId)

  return (
    <div className={styles.container}>
      <div className={styles.stepsWrap}>
        <Steps orientation={orientation}>
          {steps.map((step) => {
            const nexusStatus = toNexusStatus(step.status)
            const isFailed = step.status === 'failed'
            const isClickable = step.status === 'completed' && !!step.summary

            return (
              <StepItem
                key={step.id}
                status={nexusStatus}
                label={step.label}
                /* For failed steps, override the marker icon with a red AlertCircle. */
                icon={isFailed ? AlertCircle : undefined}
                /* Use description to surface a Failed badge inside the step body. */
                description={isFailed ? (
                  <span className={styles.failedBadge}>
                    Failed
                  </span>
                ) : undefined}
                /* onClick passes through via ...rest onto the outer <div role="listitem">. */
                onClick={isClickable ? () => toggle(step) : undefined}
                className={isClickable ? styles.stepClickable : undefined}
              />
            )
          })}
        </Steps>
      </div>

      {openStep?.summary && (
        <div className={styles.summary} role="status" aria-live="polite">
          <span className={styles.summaryLabel}>{openStep.label}</span>
          {openStep.summary}
        </div>
      )}
    </div>
  )
}
