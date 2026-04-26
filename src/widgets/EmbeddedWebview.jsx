import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  ExternalLink,
  GraduationCap,
  BookOpenText,
  MonitorSmartphone,
  Globe,
  Loader2,
  WifiOff,
  Check,
  X as XIcon,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './embeddedWebview.module.scss'

/* ─── Embedded Webview (#27) ─────────────────────────────────────────
   Iframe escape-hatch for complex partner UIs. Compact card lives in
   the chat stream; on CTA tap a portaled bottom-sheet lifts up and
   holds the iframe edge-to-edge. The compact card's poster region
   morphs into the sheet's iframe-frame via a FLIP transition.

   Four variants drive icon / eyebrow / footer / completion strategy:
     partner_form   — postMessage 'complete' (mandatory)
     training       — postMessage 'progress' until 'complete'
     reader         — user-attested via "I've read this" CTA
     preview        — no completion (close = continue)

   See docs/superpowers/specs/2026-04-26-embedded-webview-widget-design.md
   ─────────────────────────────────────────────────────────────────── */

const SHEET_ANIM_DURATION = 360  /* bottom-sheet open/close — matches transform 320ms + 40ms safety */
const LIFT_DURATION       = 520  /* FLIP poster → iframe-frame morph; Task 13 */

const VARIANT_META = {
  partner_form: {
    icon: ExternalLink,
    eyebrowPrefix: 'Partner',
    ctaOpen: 'Open verification portal',
    ctaReopen: 'Reopen verification portal',
    completion: 'postmessage',
  },
  training: {
    icon: GraduationCap,
    eyebrowPrefix: 'Training',
    ctaOpen: 'Start training',
    ctaReopen: 'Resume training',
    completion: 'postmessage',
  },
  reader: {
    icon: BookOpenText,
    eyebrowPrefix: 'Reading',
    ctaOpen: 'Open reader',
    ctaReopen: 'Reopen reader',
    completion: 'attested',
  },
  preview: {
    icon: MonitorSmartphone,
    eyebrowPrefix: 'Preview',
    ctaOpen: 'Open preview',
    ctaReopen: 'Reopen preview',
    completion: 'none',
  },
}

export function EmbeddedWebview({ payload, onSubmit }) {
  const variant = payload?.variant ?? 'partner_form'
  const meta = VARIANT_META[variant] ?? VARIANT_META.partner_form
  const Icon = meta.icon

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = () => {
    /* Sheet wiring lands in Task 5. */
  }

  return (
    <article className={cx(styles.card, styles[`card_${variant}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title}>{payload?.title}</h3>
          {payload?.description && (
            <p className={styles.description}>{payload.description}</p>
          )}
        </div>
      </header>

      <div
        className={cx(styles.poster, !payload?.poster_url && styles.poster_empty)}
        aria-hidden
      >
        {payload?.poster_url
          ? (
            <img
              className={styles.posterImg}
              src={payload.poster_url}
              alt=""
              loading="lazy"
            />
          )
          : (
            <Globe className={styles.posterFallbackGlyph} size={36} strokeWidth={1.5} aria-hidden />
          )
        }
        <div className={styles.trustCapsule}>
          {payload?.favicon_url
            ? <img className={styles.faviconImg} src={payload.favicon_url} alt="" />
            : <Globe size={14} strokeWidth={2} aria-hidden />
          }
          <span className={styles.faviconDomain}>{payload?.domain_label}</span>
        </div>
      </div>

      {payload?.estimated_minutes != null && (
        <p className={styles.estimate}>Approx. {payload.estimated_minutes} min</p>
      )}

      <div className={styles.ctaRow}>
        <Button
          variant="primary"
          fullWidth
          onClick={handleOpen}
        >
          <span className={styles.ctaLabel}>{meta.ctaOpen}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </article>
  )
}
