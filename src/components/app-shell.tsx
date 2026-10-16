"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BriefcaseBusiness,
  Building2,
  Home,
  LineChart,
  MoreHorizontal,
  Settings,
  Sprout,
} from "lucide-react";

import type { AppSession } from "@/lib/auth/session";
import { PRODUCT_NAME } from "@/lib/brand";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  HIDDEN_ADVANCED_HREFS,
  isPrimaryNavActive,
  PRIMARY_OWNER_NAV,
  SETTINGS_LINKS,
} from "@/lib/owner-surface/nav";

const NAV_ICONS = {
  home: Home,
  grow: Sprout,
  work: BriefcaseBusiness,
  results: LineChart,
  business: Building2,
} as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  layout,
}: {
  href: string
  label: string
  icon: typeof Home
  active: boolean
  onNavigate?: () => void
  layout: "side" | "bottom"
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        layout === "side"
          ? "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-sidebar-accent"
          : "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
        active && layout === "side" && "bg-sidebar-accent font-medium",
        active && layout === "bottom" && "text-foreground",
        !active && layout === "bottom" && "text-muted-foreground",
      )}
    >
      <Icon className={cn(layout === "side" ? "size-4" : "size-5")} />
      {label}
    </Link>
  );
}

function SettingsLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-1 p-3">
      {SETTINGS_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="rounded-xl px-3 py-2 hover:bg-sidebar-accent"
        >
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
        </Link>
      ))}
      <Link
        href={HIDDEN_ADVANCED_HREFS[0]}
        onClick={onNavigate}
        className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"
      >
        Advanced helpers
      </Link>
    </div>
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
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="border-b px-4 py-4">
          <Link href="/app" className="font-semibold tracking-tight">
            {PRODUCT_NAME}
          </Link>
          <WorkspaceSwitcher
            workspaces={session.workspaces}
            currentId={session.organizationId}
            currentName={session.organizationName}
          />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {PRIMARY_OWNER_NAV.map((item) => {
            const Icon = NAV_ICONS[item.id];
            return (
              <NavLink
                key={item.id}
                href={item.href}
                label={item.label}
                icon={Icon}
                active={isPrimaryNavActive(pathname, item.href)}
                layout="side"
              />
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-2.5"
            onClick={() => setMenuOpen(true)}
          >
            <Settings className="size-4" />
            Settings
          </Button>
        </div>
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          id="app-mobile-menu"
          side="left"
          className="w-80 bg-sidebar p-0"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Advanced pages stay here. Everyday work is Home, Grow, Work, Results, and Business.
            </SheetDescription>
          </SheetHeader>
          <div className="border-b px-4 py-3 md:hidden">
            <WorkspaceSwitcher
              workspaces={session.workspaces}
              currentId={session.organizationId}
              currentName={session.organizationName}
            />
          </div>
          <SettingsLinks onNavigate={closeMenu} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
          <div className="min-w-0 md:hidden">
            <Link href="/app" className="font-semibold tracking-tight">
              {PRODUCT_NAME}
            </Link>
            <WorkspaceSwitcher
              workspaces={session.workspaces}
              currentId={session.organizationId}
              currentName={session.organizationName}
            />
          </div>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-medium">
              {session.organizationName ?? `${PRODUCT_NAME} workspace`}
            </p>
            <p className="text-xs text-muted-foreground">
              GroovGro is working with you on this business.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 px-3 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="app-mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <MoreHorizontal className="size-5" />
              Menu
            </Button>
            {clerkEnabled ? <UserButton /> : null}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur md:hidden">
        {PRIMARY_OWNER_NAV.map((item) => {
          const Icon = NAV_ICONS[item.id];
          return (
            <NavLink
              key={item.id}
              href={item.href}
              label={item.label}
              icon={Icon}
              active={isPrimaryNavActive(pathname, item.href)}
              layout="bottom"
            />
          );
        })}
      </nav>
    </div>
  );
}
