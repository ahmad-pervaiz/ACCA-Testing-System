import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, CheckCircle2, BookOpenCheck } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SCHOOL_NAME } from "@/lib/constants";

export const HEADLINE = "Where every mock brings exam day closer.";

export const FEATURES = [
  { icon: Clock, text: "A live countdown timer that survives a refresh or crash" },
  { icon: CheckCircle2, text: "Instant scoring with itemized, explained results" },
  { icon: BookOpenCheck, text: "Practice across every paper and batch your teacher publishes" },
];

export function AuthSplitLayout({
  eyebrow,
  headline,
  subtext,
  children,
}: {
  eyebrow?: string;
  headline: ReactNode;
  subtext: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex flex-1 flex-col justify-center overflow-hidden bg-hero px-6 py-16 text-hero-foreground sm:px-12 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-hero-border"
        />
        <div className="relative flex items-center gap-3">
          <Image
            src="/branding/logo.jpeg"
            alt={`${SCHOOL_NAME} logo`}
            width={44}
            height={44}
            className="h-11 w-11 rounded-md object-cover"
          />
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
            )}
            <p className="text-sm font-semibold leading-tight">{SCHOOL_NAME}</p>
          </div>
        </div>

        <h1 className="relative mt-10 max-w-md text-4xl font-bold leading-tight sm:text-5xl">
          {headline}
        </h1>
        <p className="relative mt-4 max-w-sm text-sm leading-relaxed text-hero-muted">{subtext}</p>

        <ul className="relative mt-10 flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-hero-foreground/90">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hero-border bg-hero-chip text-accent">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      <main className="relative flex flex-1 flex-col items-center justify-center bg-background px-6 py-16 sm:px-12">
        <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

export function AuthTabs({ active }: { active: "login" | "register" }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-muted p-1">
      <Link
        href="/student/login"
        className={
          active === "login"
            ? "rounded-md bg-accent py-2 text-center text-sm font-semibold text-accent-foreground"
            : "rounded-md py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        }
      >
        Login
      </Link>
      <Link
        href="/student/register"
        className={
          active === "register"
            ? "rounded-md bg-accent py-2 text-center text-sm font-semibold text-accent-foreground"
            : "rounded-md py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        }
      >
        Register
      </Link>
    </div>
  );
}
