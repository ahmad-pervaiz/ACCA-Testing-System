import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { GraduationCap, ShieldCheck, ArrowRight } from "lucide-react";
import { SCHOOL_NAME } from "@/lib/constants";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { FEATURES, HEADLINE } from "@/components/shared/auth-split-layout";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-hero px-6 py-16 text-hero-foreground sm:px-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/3 rounded-full border border-hero-border"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full border border-hero-border"
      />

      <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 py-12 text-center">
        <div className="animate-fade-up flex flex-col items-center gap-3">
          <Image
            src="/branding/logo.jpeg"
            alt={`${SCHOOL_NAME} logo`}
            width={64}
            height={64}
            className="h-16 w-16 rounded-xl object-cover shadow-sm"
          />
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{SCHOOL_NAME}</p>
        </div>

        <h1
          className="animate-fade-up max-w-2xl text-4xl font-bold leading-tight sm:text-5xl"
          style={{ animationDelay: "0.1s" }}
        >
          {HEADLINE}
        </h1>

        <p
          className="animate-fade-up max-w-lg text-base leading-relaxed text-hero-muted"
          style={{ animationDelay: "0.2s" }}
        >
          Authentic ACCA-style CBT mock exams, instant scoring, and centralized results — all in
          one place.
        </p>

        <ul
          className="animate-fade-up flex flex-col gap-3 sm:flex-row sm:gap-6"
          style={{ animationDelay: "0.3s" }}
        >
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex max-w-56 items-start gap-2 text-left text-sm text-hero-foreground/90">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-hero-border bg-hero-chip text-accent">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div
          className="animate-fade-up grid w-full gap-4 sm:grid-cols-2"
          style={{ animationDelay: "0.4s" }}
        >
          <PortalCard
            icon={<GraduationCap className="h-5 w-5" />}
            title="Student Portal"
            description="Take your assigned mocks and review your results."
          >
            <Link href="/student/login" className="flex-1">
              <Button variant="accent" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/student/register" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-hero-border bg-transparent text-hero-foreground hover:bg-hero-chip"
              >
                Register
              </Button>
            </Link>
          </PortalCard>

          <PortalCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Faculty Portal"
            description="Create mock exams and view centralized results."
          >
            <Link href="/teacher/login" className="w-full">
              <Button
                variant="outline"
                className="w-full border-hero-border bg-transparent text-hero-foreground hover:bg-hero-chip"
              >
                Faculty Login <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </PortalCard>
        </div>
      </div>
    </main>
  );
}

function PortalCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-hero-border bg-hero-chip p-6 text-left transition-colors hover:border-accent/60">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hero text-accent">{icon}</div>
      <div>
        <p className="font-semibold text-hero-foreground">{title}</p>
        <p className="mt-1 text-sm text-hero-muted">{description}</p>
      </div>
      <div className="flex gap-3">{children}</div>
    </div>
  );
}
