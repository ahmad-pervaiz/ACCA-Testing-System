export type Role = "student" | "teacher";
export type MockStatus = "draft" | "published" | "archived";
export type OptionLetter = "A" | "B" | "C" | "D";

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  acca_id: string | null;
  batch: string | null;
  role: Role;
  created_at: string;
}

export interface Mock {
  id: string;
  mock_name: string;
  subject: string;
  teacher_id: string | null;
  teacher_name: string;
  time_limit_minutes: number;
  total_questions: number;
  total_marks: number;
  pass_percentage: number;
  instructions: string | null;
  source_pdf_path: string | null;
  status: MockStatus;
  created_at: string;
  updated_at: string;
}

export interface MockWithBatches extends Mock {
  batches: string[];
  question_count: number;
}

export interface Question {
  id: string;
  mock_id: string;
  question_number: number;
  question_text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
  explanation: string | null;
  marks: number;
}

/** Question shape delivered to the student browser during a live exam — no answer key. */
export type ExamQuestion = Omit<Question, "correct_option" | "explanation">;

export interface ExamSession {
  id: string;
  mock_id: string;
  student_id: string;
  started_at: string;
  deadline_at: string;
  current_question: number;
  responses: Record<string, OptionLetter>;
  flagged: number[];
  submitted: boolean;
  updated_at: string;
}

export interface ExamResult {
  id: string;
  mock_id: string;
  student_id: string;
  student_name: string;
  acca_id: string;
  batch: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  time_taken_seconds: number;
  submission_time: string;
  student_responses: Record<string, OptionLetter>;
}

export interface QuestionReview extends Question {
  student_answer: OptionLetter | null;
  is_correct: boolean;
}

/** Raw extraction shape returned by the AI PDF parser, before DB ids exist. */
export interface ExtractedQuestion {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
  explanation: string;
  marks: number;
}

export interface ExtractedMock {
  suggested_mock_name: string;
  suggested_subject: string;
  questions: ExtractedQuestion[];
}

/** Question row as edited in the teacher review UI — `id` is absent for a newly added question. */
export interface QuestionDraft {
  id?: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
  explanation: string;
  marks: number;
}

export interface MockDraftPayload {
  mock_name: string;
  subject: string;
  time_limit_minutes: number;
  pass_percentage: number;
  batches: string[];
  questions: QuestionDraft[];
}
