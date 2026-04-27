import { useMemo } from 'react'
import cx from 'classnames'
import {
  Type,
  CornerUpLeft,
  MousePointerClick,
  ShieldCheck,
  ListChecks,
  CalendarDays,
  CalendarClock,
  GraduationCap,
  CheckSquare,
  ClipboardList,
  Star,
  TextCursorInput,
  Camera,
  Mic,
  Upload,
  Milestone,
  Gauge,
  Briefcase,
  GalleryHorizontal,
  Gavel,
  GitCompare,
  Wallet,
  UserCircle2,
  FileText,
  BookOpen,
  ScanSearch,
  FileCheck2,
  PlaySquare,
  Volume2,
  Package,
  Pencil,
  Signature,
  ExternalLink,
  Trophy,
  Map,
} from 'lucide-react'
import styles from './widgetPalette.module.scss'

const WIDGET_ICONS = {
  text:               Type,
  widget_response:    CornerUpLeft,
  quick_reply:        MousePointerClick,
  confirmation:       ShieldCheck,
  checklist:          ListChecks,
  shift_calendar:     CalendarDays,
  datetime_picker:    CalendarClock,
  training_scenario:  GraduationCap,
  mcq:                CheckSquare,
  form:               ClipboardList,
  rating:             Star,
  validated_input:    TextCursorInput,
  image_capture:      Camera,
  file_upload:        Upload,
  progress:           Milestone,
  score_card:         Gauge,
  job_card:           Briefcase,
  carousel:           GalleryHorizontal,
  document_preview:   FileText,
  instruction_card:   BookOpen,
  qc_evidence_review: ScanSearch,
  evidence_review:    FileCheck2,
  video:              PlaySquare,
  approval:           Gavel,
  comparison:         GitCompare,
  earnings:           Wallet,
  profile:            UserCircle2,
  voice_recording:    Mic,
  audio:              Volume2,
  signature:          Signature,
  embedded_webview:   ExternalLink,
  leaderboard:        Trophy,
  location_map:       Map,
}

/**
 * Widget picker with two render modes:
 *
 *   open=true  → full 2-column tile grid, grouped by category.
 *   open=false → compact "selected preview" row showing just the
 *                current selection. Clicking it re-opens the picker.
 *
 * This two-mode design lets the Injector reclaim vertical space once
 * the user has locked in a widget — the common case (iterating on
 * variants + payloads) doesn't need the picker visible.
 */
export function WidgetPalette({ groups, selected, onSelect, open, onOpen }) {
  const flatWidgets = useMemo(
    () => groups.flatMap((g) => g.widgets),
    [groups],
  )

  if (!open) {
    const selectedWidget = flatWidgets.find((w) => w.type === selected)
    if (!selectedWidget) return null
    const Icon = WIDGET_ICONS[selected] ?? Package
    return (
      <button
        type="button"
        className={styles.selectedPreview}
        onClick={onOpen}
        aria-label={`Change widget (currently ${selectedWidget.label})`}
      >
        <span className={styles.previewIconWrap} aria-hidden>
          <Icon size={14} strokeWidth={1.75} />
        </span>
        <span className={styles.previewLabel}>{selectedWidget.label}</span>
        {selectedWidget.variantCount > 1 && (
          <span className={styles.previewCount}>
            {selectedWidget.variantCount}
          </span>
        )}
        <span className={styles.previewChangeHint} aria-hidden>
          <Pencil size={11} strokeWidth={1.75} />
        </span>
      </button>
    )
  }

  return (
    <div className={styles.palette}>
      {groups.map((group) => (
        <section key={group.category} className={styles.group}>
          <h3 className={styles.groupLabel}>
            <span className={styles.groupName}>{group.label}</span>
            <span className={styles.groupRule} aria-hidden />
            <span className={styles.groupCount}>{group.widgets.length}</span>
          </h3>
          <div
            role="radiogroup"
            aria-label={`${group.label} widgets`}
            className={styles.grid}
          >
            {group.widgets.map((w) => {
              const Icon = WIDGET_ICONS[w.type] ?? Package
              const active = w.type === selected
              const showCount = w.variantCount > 1
              return (
                <button
                  key={w.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cx(styles.tile, active && styles.active)}
                  onClick={() => onSelect(w.type)}
                  title={w.label}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.75}
                    className={styles.tileIcon}
                    aria-hidden
                  />
                  <span className={styles.tileLabel}>{w.label}</span>
                  {showCount && (
                    <span
                      className={styles.tileCount}
                      aria-label={`${w.variantCount} variants`}
                    >
                      {w.variantCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
