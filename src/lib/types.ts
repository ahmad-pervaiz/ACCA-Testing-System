export type Role = "student" | "teacher";
export type MockStatus = "draft" | "published" | "archived";
export type OptionLetter = "A" | "B" | "C" | "D";

/** The signed-cookie session payload — see src/lib/session.ts */
export type SessionUser =
  | { role: "teacher"; email: string; full_name: string }
  | { role: "student"; full_name: string; email: string; acca_id: string; batch: string };

export interface Mock {
  id: string;
  mock_name: string;
  subject: string;
  teacher_name: string;
  time_limit_minutes: number;
  total_questions: number;
  total_marks: number;
  pass_percentage: number;
  batches: string[];
  status: MockStatus;
  created_at: string;
}

export interface Question {
  question_number: number;
  question_text: string;
  image_url?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
  explanation: string;
  marks: number;
}

/** Question shape delivered to the student browser during a live exam — no answer key. */
export type ExamQuestion = Omit<Question, "correct_option" | "explanation">;

export interface MockForExam {
  id: string;
  mock_name: string;
  time_limit_minutes: number;
  questions: ExamQuestion[];
}

export interface MockWithQuestions extends Mock {
  questions: Question[];
}

export interface ExamSession {
  mock_id: string;
  acca_id: string;
  started_at: string;
  deadline_at: string;
  current_question: number;
  responses: Record<string, OptionLetter>;
  flagged: number[];
  submitted: boolean;
}

export interface ExamResult {
  mock_id: string;
  mock_name: string;
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

/** The JSON a teacher pastes/uploads at /teacher/create-mock. */
export interface MockJsonInput {
  mock_name: string;
  subject: string;
  teacher_name?: string;
  time_limit_minutes?: number;
  total_marks?: number;
  pass_percentage?: number;
  questions: Question[];
}

export interface MockDraftPayload {
  mock_name: string;
  subject: string;
  time_limit_minutes: number;
  pass_percentage: number;
  batches: string[];
  questions: Question[];
}
