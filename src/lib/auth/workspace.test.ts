import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  pickActiveWorkspace,
  safeAppPath,
  sortWorkspaces,
} from "./workspace";

describe("workspace switcher", () => {
  it("keeps the remembered business when the owner belongs to it", () => {
    const workspaces = sortWorkspaces([
      { id: "11111111-1111-1111-1111-111111111111", name: "Harbor", slug: "harbor" },
      { id: "22222222-2222-2222-2222-222222222222", name: "Cove", slug: "cove" },
    ]);
    assert.equal(workspaces[0]?.name, "Cove");
    assert.equal(
      pickActiveWorkspace(workspaces, "11111111-1111-1111-1111-111111111111")?.slug,
      "harbor",
    );
    assert.equal(pickActiveWorkspace(workspaces, "not-a-member")?.slug, "cove");
    assert.equal(pickActiveWorkspace([], "11111111-1111-1111-1111-111111111111"), null);
  });

  it("stays inside the signed-in app after a switch", () => {
    assert.equal(safeAppPath("/app/seo"), "/app/seo");
    assert.equal(safeAppPath("/app/integrations"), "/app/integrations");
    assert.equal(safeAppPath("https://evil.example/app"), "/app");
    assert.equal(safeAppPath("//evil.example"), "/app");
    assert.equal(safeAppPath("/login"), "/app");
  });

  it("switches the whole workspace from the sidebar and does not mix brands", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/auth/workspace.ts"), "utf8");
    const session = readFileSync(join(process.cwd(), "src/lib/auth/session.ts"), "utf8");
    const action = readFileSync(join(process.cwd(), "src/lib/actions/workspace.ts"), "utf8");
    const shell = readFileSync(join(process.cwd(), "src/components/app-shell.tsx"), "utf8");
    const switcher = readFileSync(
      join(process.cwd(), "src/components/workspace-switcher.tsx"),
      "utf8",
    );
    assert.match(helper, /WORKSPACE_COOKIE/);
    assert.match(session, /pickActiveWorkspace/);
    assert.match(session, /workspaces/);
    assert.match(session, /existingMemberships\.map/);
    assert.match(action, /switchWorkspace/);
    assert.match(action, /You do not belong to that business/);
    assert.doesNotMatch(action, /requestCmsPublish|requestExecute|googleapis/i);
    assert.match(shell, /WorkspaceSwitcher/);
    assert.match(switcher, /Switch business/);
    assert.match(switcher, /Do not mix brands/);
    assert.doesNotMatch(switcher, /myrtle|ocean sailing|seamark/i);
  });
});
