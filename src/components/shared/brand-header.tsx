import Image from "next/image";
import Link from "next/link";
import { SCHOOL_NAME } from "@/lib/constants";

export function BrandHeader({ tagline }: { tagline?: string }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src="/branding/logo.jpeg"
        alt={`${SCHOOL_NAME} logo`}
        width={44}
        height={44}
        className="rounded-md object-cover"
      />
      <div>
        <p className="text-base font-semibold leading-tight text-foreground">{SCHOOL_NAME}</p>
        {tagline && <p className="text-xs leading-tight text-muted-foreground">{tagline}</p>}
      </div>
    </Link>
  );
}
