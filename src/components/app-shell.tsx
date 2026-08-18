"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Bell, Building2, LayoutDashboard, Plug, ScrollText, Settings } from "lucide-react";

import type { AppSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/settings/brand", label: "Brand", icon: Building2 },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/audit", label: "Audit log", icon: ScrollText },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];

export function AppShell({
  session,
  clerkEnabled,
  children,
}: {
  session: AppSession
  clerkEnabled: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="border-b px-4 py-4">
          <Link href="/app" className="font-semibold tracking-tight">
            GroMogia
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {session.organizationName ?? "Foundation"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div>
            <p className="text-sm font-medium">
              {session.name ?? "GroMogia workspace"}
            </p>
            <p className="text-xs text-muted-foreground">
              What is happening, why, what needs attention, what to do next.
            </p>
          </div>
          {clerkEnabled ? <UserButton /> : null}
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
