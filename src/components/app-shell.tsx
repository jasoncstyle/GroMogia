"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Globe,
  LayoutDashboard,
  Megaphone,
  Plug,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Quote,
  Search,
} from "lucide-react";

import type { AppSession } from "@/lib/auth/session";
import { PRODUCT_NAME } from "@/lib/brand";
import { navModules, type ModuleId } from "@/lib/modules/catalog";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<ModuleId | "dashboard" | "settings" | "audit" | "notifications", typeof LayoutDashboard>> = {
  dashboard: LayoutDashboard,
  website_connect: Globe,
  events: CalendarDays,
  crm: Users,
  commerce: CreditCard,
  analytics: BarChart3,
  marketing: Megaphone,
  intelligence: Sparkles,
  brand_voice: Quote,
  seo: Search,
  integrations: Plug,
  brand: Building2,
  settings: Settings,
  audit: ScrollText,
  notifications: Bell,
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

export function AppShell({
  session,
  clerkEnabled,
  children,
}: {
  session: AppSession
  clerkEnabled: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const work = navModules(session.enabledModules, "work");
  const grow = navModules(session.enabledModules, "grow");
  const settings = navModules(session.enabledModules, "settings");

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="border-b px-4 py-4">
          <Link href="/app" className="font-semibold tracking-tight">
            {PRODUCT_NAME}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {session.organizationName ?? "Workspace"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            <NavLink
              href="/app"
              label="Dashboard"
              icon={LayoutDashboard}
              active={pathname === "/app"}
            />
            {work.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                label={item.name}
                icon={ICONS[item.id] ?? LayoutDashboard}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </div>
          {grow.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Grow
              </p>
              {grow.map((item) => (
                <NavLink
                  key={item.id}
                  href={item.href}
                  label={item.name}
                  icon={ICONS[item.id] ?? LayoutDashboard}
                  active={pathname.startsWith(item.href)}
                />
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <p className="px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Settings
            </p>
            {settings.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                label={item.name}
                icon={ICONS[item.id] ?? Settings}
                active={pathname.startsWith(item.href)}
              />
            ))}
            <NavLink
              href="/app/settings"
              label="Organization"
              icon={Settings}
              active={pathname === "/app/settings" || pathname.startsWith("/app/settings/team")}
            />
            <NavLink
              href="/app/audit"
              label="Audit log"
              icon={ScrollText}
              active={pathname.startsWith("/app/audit")}
            />
            <NavLink
              href="/app/notifications"
              label="Notifications"
              icon={Bell}
              active={pathname.startsWith("/app/notifications")}
            />
          </div>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div>
            <p className="text-sm font-medium">
              {session.name ?? `${PRODUCT_NAME} workspace`}
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
