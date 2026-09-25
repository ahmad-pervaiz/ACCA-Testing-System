"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveMockDraft, publishMock } from "@/lib/actions/mocks";
import { BATCHES } from "@/lib/constants";
import type { Mock, QuestionDraft, OptionLetter } from "@/lib/types";

export function ReviewEditor({
  mock,
  initialQuestions,
  initialBatches,
}: {
  mock: Mock;
  initialQuestions: QuestionDraft[];
  initialBatches: string[];
}) {
  const router = useRouter();
  const [mockName, setMockName] = useState(mock.mock_name);
  const [subject, setSubject] = useState(mock.subject);
  const [timeLimit, setTimeLimit] = useState(mock.time_limit_minutes);
  const [passPct, setPassPct] = useState(mock.pass_percentage);
  const [batches, setBatches] = useState<string[]>(initialBatches);
  const [questions, setQuestions] = useState<QuestionDraft[]>(initialQuestions);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [saving, startSaving] = useTransition();
  const [publishing, startPublishing] = useTransition();

  const totalMarks = useMemo(() => questions.reduce((s, q) => s + (q.marks || 0), 0), [questions]);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, question_number: i + 1 })),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        question_number: prev.length + 1,
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_option: "A",
        explanation: "",
        marks: 2,
      },
    ]);
    setExpanded(questions.length);
  }

  function toggleBatch(batch: string) {
    setBatches((prev) => (prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]));
  }

  function handleSave(onSuccess?: () => void) {
    startSaving(async () => {
      const res = await saveMockDraft(mock.id, {
        mock_name: mockName,
        subject,
        time_limit_minutes: timeLimit,
        pass_percentage: passPct,
        batches,
        questions,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Draft saved.");
        onSuccess?.();
        router.refresh();
      }
    });
  }

  function handlePublish() {
    handleSave(() => {
      startPublishing(async () => {
        const res = await publishMock(mock.id);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(`${mockName} published to students.`);
          router.refresh();
        }
      });
    });
  }

  const busy = saving || publishing;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Mock Settings</CardTitle>
            <CardDescription>
              {questions.length} questions &middot; {totalMarks} total marks
            </CardDescription>
          </div>
          <Badge variant={mock.status === "published" ? "success" : "warning"}>{mock.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mock_name">Mock Name</Label>
            <Input id="mock_name" value={mockName} onChange={(e) => setMockName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time_limit">Time Limit (minutes)</Label>
            <Input
              id="time_limit"
              type="number"
              min={1}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pass_pct">Pass Percentage</Label>
            <Input
              id="pass_pct"
              type="number"
              min={1}
              max={100}
              value={passPct}
              onChange={(e) => setPassPct(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Assign to Batches</Label>
            <div className="flex flex-wrap gap-2">
              {BATCHES.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => toggleBatch(b)}
                  className={
                    batches.includes(b)
                      ? "rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground"
                      : "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
                  }
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Questions</h2>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>

        {questions.map((q, index) => (
          <QuestionCard
            key={q.id ?? `new-${index}`}
            question={q}
            index={index}
            expanded={expanded === index}
            onToggle={() => setExpanded(expanded === index ? null : index)}
            onChange={(patch) => updateQuestion(index, patch)}
            onRemove={() => removeQuestion(index)}
          />
        ))}
      </div>

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-lg">
        <Button type="button" variant="outline" disabled={busy} onClick={() => handleSave()}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Draft"}
        </Button>
        <Button type="button" variant="accent" disabled={busy} onClick={handlePublish}>
          <Rocket className="h-4 w-4" />
          {publishing ? "Publishing…" : mock.status === "published" ? "Republish" : "Publish to Students"}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  question: QuestionDraft;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
            {question.question_number}
          </span>
          <p className="truncate text-sm font-medium text-foreground">
            {question.question_text || "Untitled question"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="brand">{question.marks} marks</Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <CardContent className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="flex flex-col gap-1.5">
            <Label>Question Text</Label>
            <Textarea
              rows={3}
              value={question.question_text}
              onChange={(e) => onChange({ question_text: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["A", "B", "C", "D"] as OptionLetter[]).map((letter) => (
              <div key={letter} className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-2">
                  Option {letter}
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={question.correct_option === letter}
                    onChange={() => onChange({ correct_option: letter })}
                  />
                  <span className="text-xs font-normal text-muted-foreground">correct</span>
                </Label>
                <Input
                  value={question[`option_${letter.toLowerCase()}` as "option_a"]}
                  onChange={(e) =>
                    onChange({ [`option_${letter.toLowerCase()}`]: e.target.value } as Partial<QuestionDraft>)
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Explanation</Label>
            <Textarea
              rows={2}
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
            />
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex w-32 flex-col gap-1.5">
              <Label>Marks</Label>
              <Input
                type="number"
                min={1}
                value={question.marks}
                onChange={(e) => onChange({ marks: Number(e.target.value) })}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-danger">
              <Trash2 className="h-4 w-4" /> Remove Question
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
