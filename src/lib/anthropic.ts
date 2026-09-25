import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
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

const EXTRACT_TOOL_NAME = "record_extracted_mock";

// Forced tool-call is used instead of `output_config.format` for structured
// output — it's the widely-supported path across SDK versions and models,
// and the result is validated against ExtractedMockSchema below regardless.
const EXTRACT_TOOL: Anthropic.Tool = {
  name: EXTRACT_TOOL_NAME,
  description: "Records the fully extracted mock exam questions.",
  input_schema: {
    type: "object",
    properties: {
      suggested_mock_name: { type: "string", description: 'e.g. "FA1 Mock 01"' },
      suggested_subject: { type: "string", description: 'e.g. "FA1"' },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question_number: { type: "integer", minimum: 1 },
            question_text: { type: "string" },
            option_a: { type: "string" },
            option_b: { type: "string" },
            option_c: { type: "string" },
            option_d: { type: "string" },
            correct_option: { type: "string", enum: ["A", "B", "C", "D"] },
            explanation: { type: "string" },
            marks: { type: "integer", minimum: 1 },
          },
          required: [
            "question_number",
            "question_text",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correct_option",
            "explanation",
            "marks",
          ],
        },
      },
    },
    required: ["suggested_mock_name", "suggested_subject", "questions"],
  },
};

const EXTRACTION_PROMPT = `You are converting a scanned/typed ACCA mock exam PDF into structured multiple-choice questions for a computer-based testing system.

Read the entire document and extract every multiple-choice question you find. For each question:
- Reproduce the question text exactly (including any figures/tables described in words if you cannot embed an image — describe numeric tables inline as plain text).
- Extract exactly four options as option_a..option_d, with the option letter/label stripped from the text itself (e.g. "Historical cost" not "A. Historical cost").
- Identify the correct option letter. If the source paper includes an answer key, use it. If no answer key is present, determine the correct answer yourself using your accounting/finance expertise (this is an ACCA-level paper), and still fill correct_option confidently — never leave it blank.
- Write a concise 1-3 sentence explanation of why that option is correct, suitable for student review after the exam.
- Default marks to 2 unless the paper states a different mark allocation for that question.
- Number questions sequentially starting at 1 in the order they appear, regardless of the numbering printed in the source.

Also suggest a mock_name (e.g. "FA1 Mock 01") and subject code (e.g. "FA1") based on the paper's title/header if present, otherwise infer from content.

Extract ALL questions in the document — do not stop early or summarize. If the document has 50 questions, return 50 entries.

Call ${EXTRACT_TOOL_NAME} exactly once with the complete result.`;

export async function extractMockFromPdf(
  pdfBase64: string,
): Promise<ExtractedMock> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
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
  });

  const response = await stream.finalMessage();

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error(
      "Claude did not return structured questions for this PDF. Try a clearer scan, or add/correct questions manually after upload.",
    );
  }

  const parsed = ExtractedMockSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `Claude's extraction did not match the expected format: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
