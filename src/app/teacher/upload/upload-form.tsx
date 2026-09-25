"use client";

import { useActionState, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { uploadAndParsePdf, type UploadActionState } from "@/lib/actions/mocks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: UploadActionState = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadAndParsePdf, initialState);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    if (f.type !== "application/pdf") return;
    setFile(f);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped && inputRef.current) {
            inputRef.current.files = e.dataTransfer.files;
          }
          pickFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          dragOver ? "border-brand bg-brand-light" : "border-border bg-surface-muted",
        )}
      >
        {file ? (
          <>
            <FileText className="h-10 w-10 text-brand" />
            <div>
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </>
        ) : (
          <>
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Drag & drop a PDF mock test here</p>
              <p className="text-sm text-muted-foreground">or click to browse — max 25 MB</p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          name="pdf"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <Button type="submit" disabled={!file || pending} size="lg">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Extracting questions with AI… this can take a minute
          </>
        ) : (
          "Upload & Extract Questions"
        )}
      </Button>
    </form>
  );
}
