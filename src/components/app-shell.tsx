"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BarChart3,
  Bell,
  Brain,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Megaphone,
  Menu,
  Package,
  Target,
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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ICONS: Partial<Record<ModuleId | "dashboard" | "settings" | "audit" | "notifications", typeof LayoutDashboard>> = {
  dashboard: LayoutDashboard,
  website_connect: Globe,
  website_builder: LayoutTemplate,
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
  business_brain: Brain,
  offers: Package,
  growth_goals: Target,
  growth_reviews: CalendarClock,
  growth_next: ListChecks,
  growth_work: ClipboardCheck,
  settings: Settings,
  audit: ScrollText,
  notifications: Bell,
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function AppNav({
  pathname,
  session,
  onNavigate,
}: {
  pathname: string
  session: AppSession
  onNavigate?: () => void
}) {
  const work = navModules(session.enabledModules, "work");
  const grow = navModules(session.enabledModules, "grow");
  const settings = navModules(session.enabledModules, "settings");

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      <div className="flex flex-col gap-1">
        <NavLink
          href="/app"
          label="Dashboard"
          icon={LayoutDashboard}
          active={pathname === "/app"}
          onNavigate={onNavigate}
        />
        {work.map((item) => (
          <NavLink
            key={item.id}
            href={item.href}
            label={item.name}
            icon={ICONS[item.id] ?? LayoutDashboard}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
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
              onNavigate={onNavigate}
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
            onNavigate={onNavigate}
          />
        ))}
        <NavLink
          href="/app/settings"
          label="Organization"
          icon={Settings}
          active={pathname === "/app/settings" || pathname.startsWith("/app/settings/team")}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/app/audit"
          label="Audit log"
          icon={ScrollText}
          active={pathname.startsWith("/app/audit")}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/app/notifications"
          label="Notifications"
          icon={Bell}
          active={pathname.startsWith("/app/notifications")}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
        <AppNav pathname={pathname} session={session} />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          id="app-mobile-menu"
          side="left"
          className="w-72 bg-sidebar p-0"
        >
          <SheetHeader className="border-b">
            <SheetTitle>{PRODUCT_NAME}</SheetTitle>
            <SheetDescription>
              {session.organizationName ?? "Workspace"}
            </SheetDescription>
          </SheetHeader>
          <AppNav
            pathname={pathname}
            session={session}
            onNavigate={() => setMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="h-11 px-4 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="app-mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
              Menu
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {session.name ?? `${PRODUCT_NAME} workspace`}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                What are we trying to accomplish, and what should happen next?
              </p>
            </div>
          </div>
          {clerkEnabled ? <UserButton /> : null}
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
