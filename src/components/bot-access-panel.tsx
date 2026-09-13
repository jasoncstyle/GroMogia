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
  tokenCount,
  canManage,
}: {
  deskUrl: string
  scoutUrl: string
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
        <CardTitle>Search partner and Goal checker</CardTitle>
        <CardDescription>
          GroovGro pulls Search Console and stores it. SEOgro reads that
          store and writes proposal packs back with this token. Search partner
          and Goal checker can still read the desk. They do not log into
          Google. They do not publish.
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
        {tokenCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {tokenCount} desk token{tokenCount === 1 ? "" : "s"} can read the
            stored snapshot.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No desk token yet. Create one after you make the two bots, then
            paste the token into each bot.
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
          SEOgro: GET the handoff URL, then POST the proposal pack, with
          Authorization: Bearer and the token. Search partner and Goal checker:
          GET the desk URL. Do not log into Google. Do not invent prices. Do
          not publish. Do not set shipped.
        </p>
      </CardContent>
    </Card>
  );
}
