import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ExtractedMock } from "@/lib/types";

const client = new Anthropic();

// Claude Sonnet 5 — strong document/vision understanding at a cost point
// that fits a per-mock-upload workload. Change via ANTHROPIC_MODEL if needed.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const ExtractedQuestionSchema = z.object({
  question_number: z.number().int().positive(),
  question_text: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  correct_option: z.enum(["A", "B", "C", "D"]),
  explanation: z.string(),
  marks: z.number().int().positive(),
});

const ExtractedMockSchema = z.object({
  suggested_mock_name: z.string(),
  suggested_subject: z.string(),
  questions: z.array(ExtractedQuestionSchema),
});

const EXTRACTION_PROMPT = `You are converting a scanned/typed ACCA mock exam PDF into structured multiple-choice questions for a computer-based testing system.

Read the entire document and extract every multiple-choice question you find. For each question:
- Reproduce the question text exactly (including any figures/tables described in words if you cannot embed an image — describe numeric tables inline as plain text).
- Extract exactly four options as option_a..option_d, with the option letter/label stripped from the text itself (e.g. "Historical cost" not "A. Historical cost").
- Identify the correct option letter. If the source paper includes an answer key, use it. If no answer key is present, determine the correct answer yourself using your accounting/finance expertise (this is an ACCA-level paper), and still fill correct_option confidently — never leave it blank.
- Write a concise 1-3 sentence explanation of why that option is correct, suitable for student review after the exam.
- Default marks to 2 unless the paper states a different mark allocation for that question.
- Number questions sequentially starting at 1 in the order they appear, regardless of the numbering printed in the source.

Also suggest a mock_name (e.g. "FA1 Mock 01") and subject code (e.g. "FA1") based on the paper's title/header if present, otherwise infer from content.

Extract ALL questions in the document — do not stop early or summarize. If the document has 50 questions, return 50 entries.`;

export async function extractMockFromPdf(
  pdfBase64: string,
): Promise<ExtractedMock> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 32000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(ExtractedMockSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error(
      "Claude could not extract structured questions from this PDF. Try a clearer scan, or add/correct questions manually after upload.",
    );
  }

  return response.parsed_output;
}
