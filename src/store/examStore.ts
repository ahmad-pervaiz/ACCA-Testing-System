import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OptionLetter } from "@/lib/types";

/**
 * Client-side cache of one exam attempt, mirrored to localStorage so the
 * question palette, current position, and answers survive a refresh/crash
 * instantly (no round-trip needed to repaint). The *server* `exam_sessions`
 * row is the source of truth for the countdown deadline and is what gets
 * reconciled on mount / resume — this store is a fast local cache on top of
 * it, not a replacement for it.
 */
interface ExamState {
  mockId: string | null;
  deadlineAt: string | null; // ISO timestamp, authoritative from the server
  currentQuestion: number;
  responses: Record<string, OptionLetter>;
  flagged: number[];
  hydrated: boolean;

  hydrate: (args: {
    mockId: string;
    deadlineAt: string;
    currentQuestion: number;
    responses: Record<string, OptionLetter>;
    flagged: number[];
  }) => void;
  setAnswer: (questionNumber: number, option: OptionLetter) => void;
  clearAnswer: (questionNumber: number) => void;
  toggleFlag: (questionNumber: number) => void;
  goTo: (questionNumber: number) => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      mockId: null,
      deadlineAt: null,
      currentQuestion: 1,
      responses: {},
      flagged: [],
      hydrated: false,

      hydrate: ({ mockId, deadlineAt, currentQuestion, responses, flagged }) =>
        set({ mockId, deadlineAt, currentQuestion, responses, flagged, hydrated: true }),

      setAnswer: (questionNumber, option) =>
        set((s) => ({
          responses: { ...s.responses, [String(questionNumber)]: option },
        })),

      clearAnswer: (questionNumber) =>
        set((s) => {
          const next = { ...s.responses };
          delete next[String(questionNumber)];
          return { responses: next };
        }),

      toggleFlag: (questionNumber) =>
        set((s) => ({
          flagged: s.flagged.includes(questionNumber)
            ? s.flagged.filter((n) => n !== questionNumber)
            : [...s.flagged, questionNumber],
        })),

      goTo: (questionNumber) => set({ currentQuestion: questionNumber }),

      reset: () =>
        set({
          mockId: null,
          deadlineAt: null,
          currentQuestion: 1,
          responses: {},
          flagged: [],
          hydrated: false,
        }),
    }),
    {
      name: "acca-cbt-exam-session",
      // Next.js renders "use client" components on the server too — guard
      // against `localStorage` not existing there.
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      skipHydration: true,
      partialize: (s) => ({
        mockId: s.mockId,
        deadlineAt: s.deadlineAt,
        currentQuestion: s.currentQuestion,
        responses: s.responses,
        flagged: s.flagged,
      }),
    },
  ),
);
