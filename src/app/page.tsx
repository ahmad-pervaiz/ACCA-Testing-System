import Image from "next/image";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { SCHOOL_NAME } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/branding/logo.jpeg"
          alt={`${SCHOOL_NAME} logo`}
          width={72}
          height={72}
          className="rounded-xl object-cover shadow-sm"
        />
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{SCHOOL_NAME}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Computer-Based Testing Portal — authentic ACCA-style mock exams,
            instant scoring, and centralized results.
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
              <GraduationCap className="h-5 w-5" />
            </div>
            <CardTitle>Student Portal</CardTitle>
            <CardDescription>
              Take assigned mock exams and review your results.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/student/login" className="flex-1">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link href="/student/register" className="flex-1">
              <Button variant="outline" className="w-full">
                Register
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Teacher / Admin Portal</CardTitle>
            <CardDescription>
              Create mock exams and view centralized results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/teacher/login">
              <Button variant="secondary" className="w-full">
                Faculty Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
