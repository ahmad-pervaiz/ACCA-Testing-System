"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteMock } from "@/lib/actions/mocks";

export function DeleteMockButton({ mockId, mockName }: { mockId: string; mockName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${mockName}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const res = await deleteMock(mockId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`${mockName} deleted.`);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label={`Delete ${mockName}`}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-bg hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
