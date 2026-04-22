import { TextMessage } from '../widgets/TextMessage.jsx'
import { WidgetResponse } from '../widgets/WidgetResponse.jsx'
import { QuickReply } from '../widgets/QuickReply.jsx'

export const registry = {
  text: TextMessage,
  widget_response: WidgetResponse,
  quick_reply: QuickReply,
}
