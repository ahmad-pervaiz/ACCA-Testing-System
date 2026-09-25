"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileJson, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MockJsonSchema, EXAMPLE_MOCK_JSON } from "@/lib/mockSchema";
import { createMockFromJson } from "@/lib/actions/mocks";
import type { MockJsonInput } from "@/lib/types";

type ValidationState =
  | { status: "empty" }
  | { status: "invalid"; errors: string[] }
  | { status: "valid"; mock: MockJsonInput };

export function CreateMockForm() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [publishing, startPublishing] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const validation = useMemo<ValidationState>(() => validate(raw), [raw]);

  function loadFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Please choose a .json file.");
      return;
    }
    file.text().then(setRaw);
  }

  function handlePublish() {
    if (validation.status !== "valid") return;
    startPublishing(async () => {
      const res = await createMockFromJson(validation.mock);
      if (res.error || !res.id) {
        toast.error(res.error || "Could not create mock.");
        return;
      }
      toast.success("Mock created — now assign batches and publish.");
      router.push(`/teacher/review/${res.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-brand bg-brand-light" : "border-border bg-surface-muted",
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drag & drop a .json mock file here</p>
        <p className="text-xs text-muted-foreground">or click to browse, or paste raw JSON below</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => loadFile(e.target.files?.[0])}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="raw-json" className="text-sm font-medium text-foreground">
            Raw JSON
          </label>
          <button
            type="button"
            className="text-xs font-medium text-brand hover:underline"
            onClick={() => setRaw(EXAMPLE_MOCK_JSON)}
          >
            Load example
          </button>
        </div>
        <Textarea
          id="raw-json"
          rows={14}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder="Paste the mock JSON here…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>

      <ValidationPreview validation={validation} />

      <Button
        size="lg"
        disabled={validation.status !== "valid" || publishing}
        onClick={handlePublish}
      >
        {publishing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          "Continue to Batch Assignment"
        )}
      </Button>
    </div>
  );
}

function validate(raw: string): ValidationState {
  if (!raw.trim()) return { status: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { status: "invalid", errors: [`Invalid JSON: ${(err as Error).message}`] };
  }

  const result = MockJsonSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
    return { status: "invalid", errors };
  }

  const numbers = result.data.questions.map((q) => q.question_number);
  const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  if (duplicates.length > 0) {
    return {
      status: "invalid",
      errors: [`Duplicate question_number values: ${[...new Set(duplicates)].join(", ")}`],
    };
  }

  return { status: "valid", mock: result.data };
}

function ValidationPreview({ validation }: { validation: ValidationState }) {
  if (validation.status === "empty") return null;

  if (validation.status === "invalid") {
    return (
      <Card className="border-danger">
        <CardContent className="flex flex-col gap-2 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
            <XCircle className="h-4 w-4" /> JSON has {validation.errors.length} problem
            {validation.errors.length === 1 ? "" : "s"}
          </p>
          <ul className="list-disc pl-6 text-sm text-danger">
            {validation.errors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  const { mock } = validation;
  return (
    <Card className="border-success">
      <CardContent className="flex flex-col gap-3 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> {mock.questions.length}/{mock.questions.length} MCQs
          Validated
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{mock.subject}</Badge>
          <span className="text-sm font-medium text-foreground">{mock.mock_name}</span>
          <span className="text-xs text-muted-foreground">
            {mock.time_limit_minutes ?? 120} min &middot; pass {mock.pass_percentage ?? 50}%
          </span>
        </div>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
          {mock.questions.map((q) => (
            <div key={q.question_number} className="flex items-center gap-2 truncate">
              <FileJson className="h-3 w-3 shrink-0" />
              <span className="shrink-0 font-medium text-foreground">Q{q.question_number}.</span>
              <span className="truncate">{q.question_text}</span>
              <Badge variant="neutral" className="ml-auto shrink-0">
                {q.correct_option}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
