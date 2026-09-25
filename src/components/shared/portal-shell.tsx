import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { BrandHeader } from "@/components/shared/brand-header";
import type { SessionUser } from "@/lib/types";

interface NavLink {
  href: string;
  label: string;
}

export function PortalShell({
  user,
  tagline,
  links,
  children,
}: {
  user: SessionUser;
  tagline: string;
  links: NavLink[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <BrandHeader tagline={tagline} />
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-foreground">{user.full_name}</p>
              <p className="text-xs leading-tight text-muted-foreground">
                {user.role === "student" ? `${user.acca_id} · ${user.batch}` : user.email}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                className="rounded-md p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
