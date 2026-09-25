import { z } from "zod";

export const QuestionSchema = z.object({
  question_number: z.number().int().positive(),
  question_text: z.string().min(1, "question_text is required"),
  image_url: z.string().url().optional(),
  option_a: z.string().min(1, "option_a is required"),
  option_b: z.string().min(1, "option_b is required"),
  option_c: z.string().min(1, "option_c is required"),
  option_d: z.string().min(1, "option_d is required"),
  correct_option: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().default(""),
  marks: z.number().int().positive().default(2),
});

export const MockJsonSchema = z.object({
  mock_name: z.string().min(1, "mock_name is required"),
  subject: z.string().min(1, "subject is required"),
  teacher_name: z.string().optional(),
  time_limit_minutes: z.number().int().positive().optional(),
  total_marks: z.number().int().positive().optional(),
  pass_percentage: z.number().int().min(1).max(100).optional(),
  questions: z.array(QuestionSchema).min(1, "at least one question is required"),
});

export const EXAMPLE_MOCK_JSON = `{
  "mock_name": "FA1 Mock 01",
  "subject": "FA1",
  "teacher_name": "Ali Pervaiz",
  "time_limit_minutes": 120,
  "pass_percentage": 50,
  "questions": [
    {
      "question_number": 1,
      "question_text": "Which of the following is a current asset?",
      "option_a": "Land",
      "option_b": "Inventory",
      "option_c": "Goodwill",
      "option_d": "Machinery",
      "correct_option": "B",
      "explanation": "Inventory is expected to be converted to cash within one operating cycle, making it a current asset.",
      "marks": 2
    }
  ]
}`;
