"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Catches errors thrown while rendering — most commonly a transient network
 * failure reaching the Google Apps Script backend (see src/lib/sheets.ts).
 * Without this, Next.js would show its raw dev overlay / a bare 500 instead
 * of something a non-technical user can act on.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-warning" />
          <div>
            <p className="text-lg font-semibold text-foreground">Something went wrong</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This is usually a brief network hiccup reaching the database. Try again in a
              moment.
            </p>
          </div>
          <Button onClick={reset}>Try Again</Button>
        </CardContent>
      </Card>
    </main>
  );
}
