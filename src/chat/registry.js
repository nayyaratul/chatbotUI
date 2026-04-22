import { TextMessage } from '../widgets/TextMessage.jsx'
import { WidgetResponse } from '../widgets/WidgetResponse.jsx'
import { QuickReply } from '../widgets/QuickReply.jsx'
import { ConfirmationCard } from '../widgets/ConfirmationCard.jsx'
import { ProgressTracker } from '../widgets/ProgressTracker.jsx'
import { ScoreCard } from '../widgets/ScoreCard.jsx'
import { McqQuiz } from '../widgets/McqQuiz.jsx'
import { FormWidget } from '../widgets/FormWidget.jsx'
import { JobCard } from '../widgets/JobCard.jsx'

export const registry = {
  text: TextMessage,
  widget_response: WidgetResponse,
  quick_reply: QuickReply,
  confirmation: ConfirmationCard,
  progress: ProgressTracker,
  score_card: ScoreCard,
  mcq: McqQuiz,
  form: FormWidget,
  job_card: JobCard,
}
