/**
 * The `progress` widget is intentionally invisible in the message
 * stream. When a bot sends a progress widget, the payload lands in
 * state but nothing is rendered inline — the TopProgressBar
 * (persistent chrome below ChatHeader) reads the latest progress
 * payload from bot.messages and updates the top-of-chat bar.
 *
 * Returning null here keeps the widget out of the message flow while
 * still letting it flow through the registry + Injector like any
 * other widget.
 */
export function ProgressTracker() {
  return null
}
