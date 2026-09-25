"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Flag, ChevronLeft, ChevronRight, Send, Clock } from "lucide-react";
import { useExamStore } from "@/store/examStore";
import { saveProgress, submitExam } from "@/lib/actions/exam";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDuration, cn } from "@/lib/utils";
import { AUTOSAVE_INTERVAL_MS, LOW_TIME_WARNING_SECONDS, SCHOOL_NAME } from "@/lib/constants";
import type { ExamQuestion, ExamSession, Mock, OptionLetter } from "@/lib/types";

export function ExamRoom({
  mock,
  questions,
  session,
}: {
  mock: Mock;
  questions: ExamQuestion[];
  session: ExamSession;
}) {
  const store = useExamStore();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, startSubmitting] = useTransition();
  const submittedRef = useRef(false);

  // Hydrate the local store from the server-anchored session exactly once.
  useEffect(() => {
    if (!store.hydrated || store.mockId !== mock.id) {
      store.hydrate({
        mockId: mock.id,
        deadlineAt: session.deadline_at,
        currentQuestion: session.current_question || 1,
        responses: session.responses || {},
        flagged: session.flagged || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock.id, session]);

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmitting(async () => {
      await submitExam(mock.id, store.responses);
    });
  }, [mock.id, store.responses]);

  // Countdown tick, anchored to the server deadline (not a client-side counter).
  useEffect(() => {
    if (!store.deadlineAt) return;
    function tick() {
      const secs = Math.max(
        0,
        Math.round((new Date(store.deadlineAt!).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(secs);
      if (secs <= 0) doSubmit();
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [store.deadlineAt, doSubmit]);

  // Debounced autosave to the server session row.
  useEffect(() => {
    const id = setInterval(() => {
      saveProgress(mock.id, store.responses, store.flagged, store.currentQuestion);
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mock.id, store.responses, store.flagged, store.currentQuestion]);

  // Save immediately before the tab closes/unloads.
  useEffect(() => {
    function onBeforeUnload() {
      saveProgress(mock.id, store.responses, store.flagged, store.currentQuestion);
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mock.id, store.responses, store.flagged, store.currentQuestion]);

  const current = questions.find((q) => q.question_number === store.currentQuestion) ?? questions[0];
  const answeredCount = Object.keys(store.responses).length;
  const unattemptedCount = questions.length - answeredCount;

  function selectOption(option: OptionLetter) {
    store.setAnswer(current.question_number, option);
  }

  function goRelative(delta: number) {
    const next = Math.min(questions.length, Math.max(1, store.currentQuestion + delta));
    store.goTo(next);
  }

  if (!store.hydrated || !current) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading exam…
      </div>
    );
  }

  const lowTime = remainingSeconds <= LOW_TIME_WARNING_SECONDS;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/branding/logo.jpeg" alt="" width={32} height={32} className="rounded object-cover" />
            <div>
              <p className="text-sm font-semibold text-foreground">{mock.mock_name}</p>
              <p className="text-xs text-muted-foreground">{SCHOOL_NAME}</p>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-semibold tabular-nums",
              lowTime ? "bg-danger-bg text-danger" : "bg-brand-light text-brand",
            )}
          >
            <Clock className="h-5 w-5" /> {formatDuration(remainingSeconds)}
          </div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            <Send className="h-4 w-4" /> Submit Exam
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <section className="flex-1">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Badge variant="brand">
                Question {current.question_number} of {questions.length}
              </Badge>
              <Badge variant="neutral">{current.marks} marks</Badge>
            </div>

            <p className="mb-6 whitespace-pre-wrap text-base text-foreground">{current.question_text}</p>

            {current.image_url && (
              <Image
                src={current.image_url}
                alt="Question diagram"
                width={600}
                height={400}
                className="mb-6 max-w-full rounded-lg border border-border"
              />
            )}

            <div className="flex flex-col gap-3">
              {(["A", "B", "C", "D"] as OptionLetter[]).map((letter) => {
                const text = current[`option_${letter.toLowerCase()}` as "option_a"];
                const selected = store.responses[String(current.question_number)] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => selectOption(letter)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 text-left text-sm transition-colors",
                      selected
                        ? "border-brand bg-brand-light text-foreground"
                        : "border-border bg-surface hover:bg-surface-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        selected ? "border-brand bg-brand text-brand-foreground" : "border-border text-muted-foreground",
                      )}
                    >
                      {letter}
                    </span>
                    <span>{text}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => goRelative(-1)} disabled={current.question_number === 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant={store.flagged.includes(current.question_number) ? "accent" : "secondary"}
                onClick={() => store.toggleFlag(current.question_number)}
              >
                <Flag className="h-4 w-4" />
                {store.flagged.includes(current.question_number) ? "Unmark Review" : "Mark for Review"}
              </Button>
              <Button
                variant="outline"
                onClick={() => goRelative(1)}
                disabled={current.question_number === questions.length}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <aside className="w-full shrink-0 lg:w-72">
          <div className="sticky top-24 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-foreground">Question Palette</p>
            <div className="grid grid-cols-6 gap-2 lg:grid-cols-5">
              {questions.map((q) => {
                const isFlagged = store.flagged.includes(q.question_number);
                const isAnswered = Boolean(store.responses[String(q.question_number)]);
                const isCurrent = q.question_number === current.question_number;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => store.goTo(q.question_number)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold ring-offset-1",
                      isFlagged
                        ? "bg-warning text-white"
                        : isAnswered
                          ? "bg-brand text-brand-foreground"
                          : "bg-surface-muted text-muted-foreground",
                      isCurrent && "ring-2 ring-brand",
                    )}
                  >
                    {q.question_number}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-1.5 text-xs text-muted-foreground">
              <Legend swatch="bg-surface-muted" label="Unanswered" />
              <Legend swatch="bg-brand" label="Answered" />
              <Legend swatch="bg-warning" label="Marked for Review" />
            </div>
          </div>
        </aside>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit Exam?"
        description="You cannot change your answers after submitting."
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-success-bg p-4 text-center">
              <p className="text-2xl font-semibold text-success">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">Answered</p>
            </div>
            <div className="rounded-lg bg-danger-bg p-4 text-center">
              <p className="text-2xl font-semibold text-danger">{unattemptedCount}</p>
              <p className="text-xs text-muted-foreground">Unattempted</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Continue Exam
            </Button>
            <Button variant="danger" disabled={submitting} onClick={doSubmit}>
              {submitting ? "Submitting…" : "Confirm Submit"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-sm", swatch)} />
      {label}
    </div>
  );
}
