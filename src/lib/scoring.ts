import type { OptionLetter, Question } from "@/lib/types";

export interface ScoreBreakdown {
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
}

export function scoreExam(
  questions: Pick<Question, "question_number" | "correct_option" | "marks">[],
  responses: Record<string, OptionLetter>,
): ScoreBreakdown {
  let marksObtained = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  for (const q of questions) {
    totalMarks += q.marks;
    const given = responses[String(q.question_number)];
    if (!given) {
      unattemptedCount += 1;
      continue;
    }
    if (given === q.correct_option) {
      correctCount += 1;
      marksObtained += q.marks;
    } else {
      incorrectCount += 1;
    }
  }

  const percentage =
    totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 10000) / 100 : 0;

  return {
    marksObtained,
    totalMarks,
    percentage,
    correctCount,
    incorrectCount,
    unattemptedCount,
  };
}
