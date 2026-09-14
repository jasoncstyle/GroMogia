"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { switchWorkspace } from "@/lib/actions/workspace";
import type { WorkspaceChoice } from "@/lib/auth/workspace";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceSwitcher({
  workspaces,
  currentId,
  currentName,
}: {
  workspaces: WorkspaceChoice[]
  currentId?: string
  currentName?: string
}) {
  const pathname = usePathname();
  const label = currentName || "Choose a business";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch business"
        className={cn(
          "mt-1 flex w-full min-w-0 items-center gap-1 rounded-md px-1 py-1 text-left text-sm text-foreground hover:bg-sidebar-accent",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Switch business</DropdownMenuLabel>
        {workspaces.length === 0 ? (
          <p className="px-1.5 py-1 text-sm text-muted-foreground">
            No business is open yet.
          </p>
        ) : (
          workspaces.map((workspace) => (
            <form key={workspace.id} action={switchWorkspace}>
              <input type="hidden" name="organizationId" value={workspace.id} />
              <input type="hidden" name="next" value={pathname} />
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full justify-between">
                  <span className="truncate">{workspace.name}</span>
                  {workspace.id === currentId ? (
                    <Check className="size-3.5 shrink-0" />
                  ) : null}
                </button>
              </DropdownMenuItem>
            </form>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings/new-business" className="gap-1.5">
            <Plus className="size-3.5 shrink-0" />
            Add a business
          </Link>
        </DropdownMenuItem>
        <p className="px-1.5 pt-1 text-[11px] text-muted-foreground">
          GroovGro opens one business at a time. Do not mix brands.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
