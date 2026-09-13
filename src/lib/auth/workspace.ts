export const WORKSPACE_COOKIE = "gg_workspace";

export type WorkspaceChoice = {
  id: string
  name: string
  slug: string
};

export function sortWorkspaces(workspaces: WorkspaceChoice[]): WorkspaceChoice[] {
  return [...workspaces].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

export function pickActiveWorkspace(
  workspaces: WorkspaceChoice[],
  preferredId?: string | null,
): WorkspaceChoice | null {
  if (workspaces.length === 0) return null;
  const preferred = cleanId(preferredId);
  if (preferred) {
    const match = workspaces.find((workspace) => workspace.id === preferred);
    if (match) return match;
  }
  return workspaces[0] ?? null;
}

export function safeAppPath(value: unknown): string {
  const path = String(value ?? "").trim();
  if (!path.startsWith("/app")) return "/app";
  if (path.startsWith("//") || path.includes("://") || path.includes("\\")) {
    return "/app";
  }
  return path.slice(0, 200);
}

export function cleanWorkspaceId(value: unknown): string {
  return cleanId(value);
}

function cleanId(value: unknown): string {
  const text = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    text,
  )
    ? text
    : "";
}
