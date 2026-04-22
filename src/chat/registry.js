import { TextMessage } from '../widgets/TextMessage.jsx'
import { WidgetResponse } from '../widgets/WidgetResponse.jsx'
import { QuickReply } from '../widgets/QuickReply.jsx'
import { ConfirmationCard } from '../widgets/ConfirmationCard.jsx'
import { ProgressTracker } from '../widgets/ProgressTracker.jsx'

export const registry = {
  text: TextMessage,
  widget_response: WidgetResponse,
  quick_reply: QuickReply,
  confirmation: ConfirmationCard,
  progress: ProgressTracker,
}
