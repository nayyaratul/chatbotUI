import { TextMessage } from '../widgets/TextMessage.jsx'
import { WidgetResponse } from '../widgets/WidgetResponse.jsx'
import { QuickReply } from '../widgets/QuickReply.jsx'
import { ConfirmationCard } from '../widgets/ConfirmationCard.jsx'
import { ProgressTracker } from '../widgets/ProgressTracker.jsx'
import { ScoreCard } from '../widgets/ScoreCard.jsx'
import { McqQuiz } from '../widgets/McqQuiz.jsx'
import { FormWidget } from '../widgets/FormWidget.jsx'
import { JobCard } from '../widgets/JobCard.jsx'
import { ImageCapture } from '../widgets/ImageCapture.jsx'
import { FileUpload } from '../widgets/FileUpload.jsx'
import { DocumentPreview } from '../widgets/DocumentPreview.jsx'
import { EvidenceReview } from '../widgets/EvidenceReview.jsx'
import { QcEvidenceReview } from '../widgets/QcEvidenceReview.jsx'
import { Checklist } from '../widgets/Checklist.jsx'
import { InstructionCard } from '../widgets/InstructionCard.jsx'
import { RatingWidget } from '../widgets/RatingWidget.jsx'
import { ValidatedInput } from '../widgets/ValidatedInput.jsx'
import { Carousel } from '../widgets/Carousel.jsx'
import { ShiftCalendar } from '../widgets/ShiftCalendar.jsx'
import { DateTimePicker } from '../widgets/DateTimePicker.jsx'
import { TrainingScenario } from '../widgets/TrainingScenario.jsx'

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
  image_capture: ImageCapture,
  file_upload: FileUpload,
  document_preview: DocumentPreview,
  evidence_review: EvidenceReview,
  qc_evidence_review: QcEvidenceReview,
  checklist: Checklist,
  instruction_card: InstructionCard,
  rating: RatingWidget,
  validated_input: ValidatedInput,
  carousel: Carousel,
  shift_calendar: ShiftCalendar,
  datetime_picker: DateTimePicker,
  training_scenario: TrainingScenario,
}
