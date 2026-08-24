import {
  generateBrandVoiceDraft,
  removeBrandVoiceExample,
} from "@/lib/actions/brand-voice";
import { getAppSession } from "@/lib/auth/session";
import { purposeLabel } from "@/lib/brand-voice/draft";
import { getBrandVoicePageData, readDraftOutput } from "@/lib/phase5/queries";
import { BrandVoiceExampleForm } from "@/components/brand-voice-example-form";
import { BrandVoiceProfileForm } from "@/components/brand-voice-profile-form";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function BrandVoicePage() {
  const session = await getAppSession();
  const data = session.organizationId
    ? await getBrandVoicePageData(session.organizationId)
    : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brand voice</h1>
        <p className="text-muted-foreground">
          Save how this business sounds, then keep drafts here. GroovGro will
          not send email, post to social, edit the website, or take a payment.
          Stripe checkout stays on the existing business site.
        </p>
      </div>

      {!data || !session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to save a brand voice for this organization.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Voice profile</CardTitle>
              <CardDescription>
                Uses the business name from Brand settings
                {data.brand?.businessName ? ` (${data.brand.businessName})` : ""}.
                Other modules should read this profile instead of inventing a
                second voice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandVoiceProfileForm profile={data.profile} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approved examples</CardTitle>
                <CardDescription>
                  Paste writing you already like or dislike. “More like this”
                  is the voice to copy. “Less like this” is what to avoid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BrandVoiceExampleForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved examples</CardTitle>
                <CardDescription>
                  Each sample stays closed. Click the name to open it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.examples.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No examples yet. A welcome email or homepage paragraph you
                    already use is a good first “more like this.”
                  </p>
                ) : (
                  data.examples.map((example) => (
                    <FoldableSample
                      key={example.id}
                      title={example.title}
                      subtitle={
                        example.direction === "less_like_this"
                          ? "Less like this"
                          : "More like this"
                      }
                    >
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {example.body}
                      </p>
                      <SaveForm action={removeBrandVoiceExample} successMessage="Example removed">
                        <input type="hidden" name="exampleId" value={example.id} />
                        <SaveButton variant="ghost" size="sm" pendingLabel="Removing…">
                          Remove
                        </SaveButton>
                      </SaveForm>
                    </FoldableSample>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Draft copy</CardTitle>
              <CardDescription>
                GroovGro keeps the draft in this workspace. You copy it yourself
                if you want to use it. Nothing is sent or published.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SaveForm
                action={generateBrandVoiceDraft}
                successMessage="Draft saved in GroovGro. It was not sent or published."
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="purpose">Draft type</Label>
                  <select
                    id="purpose"
                    name="purpose"
                    className={selectClassName}
                    defaultValue="website_blurb"
                  >
                    <option value="website_blurb">Website blurb</option>
                    <option value="follow_up_note">Follow-up note (not sent)</option>
                    <option value="social_post">Social post (not published)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Textarea
                    id="topic"
                    name="topic"
                    rows={3}
                    required
                    placeholder="What this piece should cover"
                  />
                </div>
                <SaveButton pendingLabel="Drafting…">Create draft</SaveButton>
              </SaveForm>

              {data.drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No drafts yet. Save the voice and at least one example first
                  if you can.
                </p>
              ) : (
                data.drafts.map((row) => {
                  const stored = readDraftOutput(row.output);
                  if (!stored) return null;
                  return (
                    <FoldableSample
                      key={row.id}
                      title={stored.purpose ? purposeLabelSafe(stored.purpose) : "Draft"}
                      subtitle={[
                        row.createdAt.toLocaleString(),
                        stored.usedAi ? "rewritten in your voice" : "from your voice notes",
                        stored.topic,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {stored.draft}
                      </p>
                    </FoldableSample>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function purposeLabelSafe(purpose: string) {
  if (
    purpose === "website_blurb" ||
    purpose === "follow_up_note" ||
    purpose === "social_post"
  ) {
    return purposeLabel(purpose);
  }
  return purpose;
}
