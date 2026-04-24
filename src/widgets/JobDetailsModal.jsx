import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  MapPin,
  Clock,
  Briefcase,
  GraduationCap,
  Languages as LanguagesIcon,
  UserRound,
  Check,
  Bookmark,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Flag,
  Users,
  Building2,
  Share2,
  CalendarDays,
  Video,
  Sparkles,
  ChevronRight,
  UsersRound,
  Wallet,
  PenLine,
  Award,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './jobDetailsModal.module.scss'

/* ─── JobDetailsModal ─────────────────────────────────────────────────
   Full-page (within device frame) expanded view of a Job Card.
   Animates from the triggering card's position via CSS custom props.
   Portaled into #chat-modal-root inside the ChatPane so it respects
   the device-frame metaphor instead of escaping to the browser window.
   ─────────────────────────────────────────────────────────────────── */

const ANIM_DURATION = 360

export function JobDetailsModal({
  item,
  originRect,
  onClose,
  onApply,
  onSave,
  onDismiss,
  disabled,
}) {
  const [phase, setPhase] = useState('entering') // 'entering' | 'open' | 'exiting'
  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null
  const closeBtnRef = useRef(null)

  /* ─── Enter transition: swap from 'entering' → 'open' next frame ─── */
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      // wait a second frame so initial styles settle before transition
      requestAnimationFrame(() => setPhase('open'))
    })
    return () => cancelAnimationFrame(t)
  }, [])

  /* ─── Focus close button + lock body scroll when open ────────────── */
  useEffect(() => {
    if (phase !== 'open') return
    closeBtnRef.current?.focus()
  }, [phase])

  /* ─── Escape key closes ─────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function requestClose() {
    if (phase === 'exiting') return
    setPhase('exiting')
    window.setTimeout(onClose, ANIM_DURATION)
  }

  if (!portalTarget || !item) return null

  /* ─── Build origin CSS vars — FLIP translate + scale from card ───── */
  const originStyle = originRect
    ? {
        '--jd-origin-x': `${originRect.x}px`,
        '--jd-origin-y': `${originRect.y}px`,
        '--jd-origin-scale-x': originRect.scaleX,
        '--jd-origin-scale-y': originRect.scaleY,
      }
    : {}

  const company = item.company ?? {}
  const location = item.location ?? {}
  const pay = item.pay ?? {}
  const payText = (pay?.min != null && pay?.max != null)
    ? `${pay.min} – ${pay.max}`
    : (pay?.amount ?? null)

  const langsText = Array.isArray(item.languages) && item.languages.length
    ? item.languages.join(', ')
    : null

  const distanceText = location.distance_km != null
    ? `${location.distance_km} km away`
    : null

  function handleApply() {
    onApply?.()
    requestClose()
  }
  function handleSave() {
    onSave?.()
    requestClose()
  }
  function handleDismiss() {
    onDismiss?.()
    requestClose()
  }
  function handleShare() {
    // WhatsApp share — India's default social channel for jobs (Apna pattern).
    // wa.me without a number opens the picker; text is pre-filled.
    const payText = (item?.pay?.min != null && item?.pay?.max != null)
      ? `${item.pay.min}–${item.pay.max}`
      : (item?.pay?.amount ?? '')
    const message = [
      `Check out this job:`,
      `${item?.title ?? 'Job opportunity'} at ${item?.company?.name ?? ''}`,
      payText ? `Pay: ${payText}${item?.pay?.period ? '/' + item.pay.period : ''}` : '',
      item?.location?.name ? `Location: ${item.location.name}` : '',
    ].filter(Boolean).join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return createPortal(
    <div
      className={cx(styles.layer, styles[phase])}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} — job details`}
      style={originStyle}
    >
      <div
        className={styles.backdrop}
        onClick={requestClose}
        aria-hidden="true"
      />

      <div className={styles.sheet}>
        {/* Header — matches ess-pwa PageHeader: soft pastel gradient,
            left-aligned back arrow + title. Right cluster: Save + Share
            (both icon-only, ess-pwa RightComponent pattern). Primary
            CTAs live in the sticky bottom bar. */}
        <header className={styles.header}>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.backBtn}
            onClick={requestClose}
            aria-label="Back to chat"
          >
            <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
          </button>
          <h1 className={styles.headerTitle}>Job details</h1>
          <button
            type="button"
            className={styles.headerIconBtn}
            onClick={handleSave}
            disabled={disabled}
            aria-label="Save"
            title="Save"
          >
            <Bookmark size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.headerIconBtn}
            onClick={handleShare}
            aria-label="Share on WhatsApp"
            title="Share on WhatsApp"
          >
            <Share2 size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable content */}
        <div className={styles.scroll}>
          {/* Identity — logo, title, company + verified. At the very top
              (Apna pattern: title + company is the first thing the user
              locks onto before any meta signals). */}
          <section className={cx(styles.section, styles.identity)}>
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={`${company.name ?? 'Company'} logo`}
                className={styles.logo}
                width={56}
                height={56}
              />
            ) : (
              <div className={styles.logoFallback} aria-hidden="true">
                {initials(company.name ?? 'Co')}
              </div>
            )}
            <div className={styles.identityText}>
              <h2 className={styles.title}>{item.title}</h2>
              <div className={styles.companyLine}>
                {company.name && <span>{company.name}</span>}
                {company.verified && (
                  <span
                    className={styles.verified}
                    title="Verified employer"
                    aria-label="Verified employer"
                  >
                    <ShieldCheck size={14} strokeWidth={2.25} aria-hidden="true" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Quick facts — quiet rows with a left icon (Apna pattern):
              salary (+ incentive), location (+ distance), timing.
              No tinted hero container. */}
          {(payText || item.incentive || location.name || location.full_address || item.timing) && (
            <section className={cx(styles.section, styles.quickFacts)}>
              {payText && (
                <div className={styles.factLine}>
                  <Wallet size={16} strokeWidth={2} aria-hidden="true" className={styles.factIcon} />
                  <span className={styles.factText}>
                    <strong>{payText}</strong>
                    {pay.period && (
                      <span className={styles.factPeriod}> {periodLabel(pay.period)}</span>
                    )}
                  </span>
                </div>
              )}
              {item.incentive && (
                <div className={styles.incentiveLine}>+ {item.incentive}</div>
              )}
              {(location.full_address || location.name) && (
                <div className={styles.factLine}>
                  <MapPin size={16} strokeWidth={2} aria-hidden="true" className={styles.factIcon} />
                  <span className={styles.factText}>
                    {location.full_address ?? location.name}
                    {distanceText && (
                      <span className={styles.factSub}> · {distanceText}</span>
                    )}
                  </span>
                </div>
              )}
              {item.timing && (
                <div className={styles.factLine}>
                  <Clock size={16} strokeWidth={2} aria-hidden="true" className={styles.factIcon} />
                  <span className={styles.factText}>{item.timing}</span>
                </div>
              )}
            </section>
          )}

          {/* Meta strip — urgency + vacancies + freshness. Demoted below
              identity + salary so the primary "is this role right for
              me" signals (title, pay, location) hit first. */}
          {(item.urgent || item.posted_at || item.openings_count != null || item.apply_by) && (
            <div className={styles.metaStrip}>
              {item.urgent && (
                <span className={cx(styles.metaPill, styles.urgent)}>
                  Urgent hiring
                </span>
              )}
              {item.openings_count != null && (
                <span className={cx(styles.metaPill, styles.vacancies)}>
                  {item.openings_count} {item.openings_count === 1 ? 'vacancy' : 'vacancies'}
                </span>
              )}
              {item.posted_at && (
                <span className={styles.metaText}>Posted {item.posted_at}</span>
              )}
              {item.apply_by && (
                <>
                  <span className={styles.metaDot} aria-hidden="true">·</span>
                  <span className={styles.metaText}>
                    <CalendarDays size={12} strokeWidth={2} aria-hidden="true" />
                    Apply by {item.apply_by}
                  </span>
                </>
              )}
              {item.applicants_count != null && (
                <>
                  <span className={styles.metaDot} aria-hidden="true">·</span>
                  <span className={styles.metaText}>
                    <Users size={12} strokeWidth={2} aria-hidden="true" />
                    {item.applicants_count} applied
                  </span>
                </>
              )}
            </div>
          )}

          {/* Fit chips — job type / work type / shift. Timing, address,
              and distance now live on the fact lines above. */}
          {(item.job_type || item.work_type || item.shift) && (
            <section className={cx(styles.section, styles.chipRow)}>
              {item.job_type && <span className={styles.chip}>{item.job_type}</span>}
              {item.work_type && <span className={styles.chip}>{item.work_type}</span>}
              {item.shift && <span className={styles.chip}>{item.shift}</span>}
            </section>
          )}

          {/* Job highlights — Apna pattern: a distinct pod near the top
              that surfaces the 2-3 most important signals at a glance. */}
          {(item.applicants_count != null
            || (Array.isArray(item.benefits) && item.benefits.length > 0)) && (
            <section className={cx(styles.section, styles.highlightsPod)}>
              <h3 className={styles.sectionTitle}>Job highlights</h3>
              <ul className={styles.highlightsList}>
                {item.applicants_count != null && (
                  <li className={styles.highlightItem}>
                    <UsersRound size={15} strokeWidth={2} aria-hidden="true" />
                    <span>
                      <strong>{item.applicants_count}+ applicants</strong>{' '}
                      — the role is actively attracting candidates
                    </span>
                  </li>
                )}
                {Array.isArray(item.benefits) && item.benefits.length > 0 && (
                  <li className={styles.highlightItem}>
                    <Check size={15} strokeWidth={2.25} aria-hidden="true" />
                    <span>
                      <strong>Benefits include:</strong>{' '}
                      {item.benefits.slice(0, 3).join(', ')}
                      {item.benefits.length > 3 ? ` + ${item.benefits.length - 3} more` : ''}
                    </span>
                  </li>
                )}
                {item.openings_count != null && (
                  <li className={styles.highlightItem}>
                    <Briefcase size={15} strokeWidth={2} aria-hidden="true" />
                    <span>
                      <strong>{item.openings_count}{' '}
                      {item.openings_count === 1 ? 'opening' : 'openings'}</strong>{' '}
                      available right now
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Job Description — title echo + narrative */}
          {item.description && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Job description</h3>
              <div className={styles.descTitle}>
                <span className={styles.descLabel}>Job title:</span>{' '}
                <strong>{item.title}</strong>
              </div>
              <p className={styles.bodyText}>{item.description}</p>
            </section>
          )}

          {/* Job Responsibilities — bulleted list (what you'll DO) */}
          {Array.isArray(item.responsibilities) && item.responsibilities.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Job responsibilities</h3>
              <ul className={styles.bulletList}>
                {item.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Job role — labeled rows (Department, Category, Employment, Shift) */}
          {(item.department || item.role_category || item.job_type || item.shift) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Job role</h3>
              <div className={styles.qualList}>
                {item.department && (
                  <QualItem
                    icon={<Building2 size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Department"
                    value={item.department}
                  />
                )}
                {item.role_category && (
                  <QualItem
                    icon={<Briefcase size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Role / Category"
                    value={item.role_category}
                  />
                )}
                {item.job_type && (
                  <QualItem
                    icon={<Briefcase size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Employment type"
                    value={item.job_type}
                  />
                )}
                {item.shift && (
                  <QualItem
                    icon={<Clock size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Shift"
                    value={item.shift}
                  />
                )}
              </div>
            </section>
          )}

          {/* Job requirements — labeled rows (what you need to HAVE) plus
              a "Must-have" bulleted list of specific items. Mirrors Apna:
              Experience · Education · Skills · English level · Degree /
              Specialisation · Gender · Interview. */}
          {(item.experience || item.education
            || (Array.isArray(item.skills) && item.skills.length > 0)
            || langsText || item.english_level
            || item.degree_specialisation || item.gender_preference
            || item.interview_type
            || (Array.isArray(item.requirements) && item.requirements.length > 0)) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Job requirements</h3>
              <div className={styles.qualList}>
                {item.experience && (
                  <QualItem
                    icon={<Briefcase size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Experience"
                    value={item.experience}
                  />
                )}
                {item.education && (
                  <QualItem
                    icon={<GraduationCap size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Education"
                    value={item.education}
                  />
                )}
                {Array.isArray(item.skills) && item.skills.length > 0 && (
                  <QualItem
                    icon={<PenLine size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Skills"
                    value={item.skills.join(', ')}
                  />
                )}
                {langsText && (
                  <QualItem
                    icon={<LanguagesIcon size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Languages"
                    value={langsText}
                  />
                )}
                {item.english_level && (
                  <QualItem
                    icon={<LanguagesIcon size={16} strokeWidth={2} aria-hidden="true" />}
                    label="English level"
                    value={item.english_level}
                  />
                )}
                {item.degree_specialisation && (
                  <QualItem
                    icon={<Award size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Degree / Specialisation"
                    value={item.degree_specialisation}
                  />
                )}
                {item.gender_preference && (
                  <QualItem
                    icon={<UsersRound size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Gender"
                    value={item.gender_preference}
                  />
                )}
                {item.interview_type && (
                  <QualItem
                    icon={<Video size={16} strokeWidth={2} aria-hidden="true" />}
                    label="Interview"
                    value={item.interview_type}
                  />
                )}
              </div>

              {Array.isArray(item.requirements) && item.requirements.length > 0 && (
                <div className={styles.mustHaveBlock}>
                  <div className={styles.mustHaveLabel}>Must-have</div>
                  <ul className={styles.requirementsList}>
                    {item.requirements.map((req, i) => (
                      <li key={i} className={styles.requirementItem}>
                        <span className={styles.requirementIcon} aria-hidden="true">
                          <Check size={13} strokeWidth={2.5} />
                        </span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Benefits chips */}
          {Array.isArray(item.benefits) && item.benefits.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Benefits</h3>
              <div className={styles.benefitsRow}>
                {item.benefits.map((b, i) => (
                  <span key={i} className={cx(styles.chip, styles.chipBenefit)}>
                    {b}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Recruiter info — at the end of the scrollable content, not
              sticky. Apna pattern: surface "who's hiring" as context but
              don't compete with the primary CTAs. */}
          {item.recruiter?.name && (
            <div className={styles.recruiterStrip}>
              <div className={styles.recruiterAvatar} aria-hidden="true">
                {initials(item.recruiter.name)}
              </div>
              <div className={styles.recruiterText}>
                <div className={styles.recruiterLabel}>Hiring</div>
                <div className={styles.recruiterName}>
                  {item.recruiter.name}
                  {item.recruiter.role && (
                    <span className={styles.recruiterRole}>
                      {' · '}{item.recruiter.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report job */}
          <section className={cx(styles.section, styles.report)}>
            <button type="button" className={styles.reportBtn}>
              <Flag size={13} strokeWidth={2} aria-hidden="true" />
              Report this job
            </button>
          </section>
        </div>

        {/* Sticky bottom action bar — Not interested + Apply, split 50/50.
            Save + Share live in the header; Call HR lives in the
            recruiter strip above. */}
        <div className={styles.actionBar}>
          <Button
            variant="secondary"
            size="md"
            disabled={disabled}
            className={styles.dismissBtn}
            onClick={handleDismiss}
          >
            Not interested
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={disabled}
            className={styles.applyBtn}
            iconRight={<ArrowRight size={15} strokeWidth={2.25} aria-hidden="true" />}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>,
    portalTarget,
  )
}

function QualItem({ icon, label, value }) {
  return (
    <div className={styles.qualItem}>
      <span className={styles.qualIcon} aria-hidden="true">{icon}</span>
      <div>
        <div className={styles.qualLabel}>{label}</div>
        <div className={styles.qualValue}>{value}</div>
      </div>
    </div>
  )
}

function initials(name) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Map a raw period ("month", "hour", "year") to its adverb form
 *  ("monthly", "hourly", "yearly") for cleaner salary typography. */
function periodLabel(period) {
  if (!period) return ''
  const p = String(period).toLowerCase()
  const map = { month: 'monthly', hour: 'hourly', year: 'yearly', week: 'weekly', day: 'daily' }
  return map[p] ?? `/ ${period}`
}
