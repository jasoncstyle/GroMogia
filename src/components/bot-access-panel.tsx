"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import {
  createBotAccessToken,
  revokeBotAccessTokens,
} from "@/lib/actions/bot-access";
import type { ActionResult } from "@/lib/action-result";
import { CopyText } from "@/components/copy-text";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BotAccessPanel({
  deskUrl,
  scoutUrl,
  draftUrl,
  writeUrl,
  booksUrl,
  tokenCount,
  canManage,
}: {
  deskUrl: string
  scoutUrl: string
  draftUrl: string
  writeUrl: string
  booksUrl: string
  tokenCount: number
  canManage: boolean
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [, createAction] = useActionState(
    async (_previous: ActionResult | null, _formData: FormData) => {
      const result = await createBotAccessToken();
      if (result.ok) {
        setRevealed(result.token ?? null);
        toast.success(result.message ?? "Token created.");
      } else {
        toast.error(result.error);
      }
      return result;
    },
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot team handoff</CardTitle>
        <CardDescription>
          GroovGro talks to the bots. SEOgro, DRAFTgro, WRITEgro, and BOOKSgro
          read stored facts and write packs back with this token. You review
          on Monday. You are not the courier. None of them log into Google,
          send, publish, or move money.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Desk URL: {deskUrl}</p>
          <CopyText text={deskUrl} label="Copy desk URL" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">SEOgro handoff: {scoutUrl}</p>
          <CopyText text={scoutUrl} label="Copy SEOgro handoff URL" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">DRAFTgro handoff: {draftUrl}</p>
          <CopyText text={draftUrl} label="Copy DRAFTgro handoff URL" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">WRITEgro handoff: {writeUrl}</p>
          <CopyText text={writeUrl} label="Copy WRITEgro handoff URL" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">BOOKSgro handoff: {booksUrl}</p>
          <CopyText text={booksUrl} label="Copy BOOKSgro handoff URL" />
        </div>
        {tokenCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {tokenCount} desk token{tokenCount === 1 ? "" : "s"} can read the
            stored snapshot.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No desk token yet. Create one after you point the bots at their
            handoffs, then paste the token into each bot.
          </p>
        )}
        {revealed ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm">
              Copy this token now. GroovGro will not show it again.
            </p>
            <p className="break-all text-sm font-medium">{revealed}</p>
            <CopyText text={revealed} label="Copy desk token" />
          </div>
        ) : null}
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <form action={createAction}>
              <SaveButton pendingLabel="Creating…">Create desk token</SaveButton>
            </form>
            {tokenCount > 0 ? (
              <SaveForm
                action={revokeBotAccessTokens}
                successMessage="Bot tokens revoked."
              >
                <SaveButton type="submit" variant="outline">
                  Revoke desk tokens
                </SaveButton>
              </SaveForm>
            ) : null}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Each bot: GET its handoff URL, then POST the proposal pack, with
          Authorization: Bearer and the token. Search partner and Goal checker:
          GET the desk URL. Do not log into Google. Do not invent prices. Do
          not send, publish, or move money. Do not set shipped. Do not mix
          brands.
        </p>
      </CardContent>
    </Card>
  );
}
