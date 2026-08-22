import { removeMediaAsset } from "@/lib/actions/media";
import { getAppSession } from "@/lib/auth/session";
import { isBlobConfigured } from "@/lib/media/blob";
import { listMediaLibrary } from "@/lib/media/queries";
import { MediaUploadControl } from "@/components/media-upload-control";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MediaLibraryPage() {
  const session = await getAppSession();
  const uploadsEnabled = isBlobConfigured();
  const items = session.organizationId
    ? await listMediaLibrary(session.organizationId, 60)
    : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
        <p className="text-muted-foreground">
          Photos you upload here can be used on GroovGro website pages. This
          does not change a connected existing website or Stripe checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a photo</CardTitle>
          <CardDescription>
            jpg, png, gif, or webp. Up to 6 MB. GroovGro stores the file in
            Vercel Blob under this organization only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {session.organizationId ? (
            <MediaUploadControl
              enabled={uploadsEnabled}
              recent={[]}
              label="Upload a photo"
              onPicked={() => undefined}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to upload photos.</p>
          )}
          {!uploadsEnabled ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Photo upload is not on yet. Add Vercel Blob once:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open https://vercel.com and the <strong>gro-mogia</strong> project.</li>
                <li>Open <strong>Storage</strong>.</li>
                <li>Click <strong>Create Database</strong> and choose <strong>Blob</strong>.</li>
                <li>Name it <strong>groovgro-media</strong>.</li>
                <li>Connect it to <strong>Production</strong> and <strong>Preview</strong>.</li>
                <li>
                  Open <strong>Deployments</strong>, open the latest Production
                  deployment, click <strong>Redeploy</strong>, turn{" "}
                  <strong>Use existing Build Cache</strong> off, then redeploy.
                </li>
              </ol>
              <p>Do not paste the Blob token into chat. Do not change Stripe keys.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos in GroovGro</CardTitle>
          <CardDescription>
            Click a photo in Website builder to place it. Remove here only
            deletes the GroovGro copy. Pages that still use it need a new photo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="space-y-2 rounded-xl border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.publicUrl}
                    alt={item.originalName || "Uploaded photo"}
                    className="aspect-video w-full rounded-md object-cover"
                  />
                  <p className="truncate text-sm">{item.originalName || "Photo"}</p>
                  <SaveForm action={removeMediaAsset} successMessage="Photo removed.">
                    <input type="hidden" name="assetId" value={item.id} />
                    <SaveButton size="sm" variant="outline" pendingLabel="Removing…">
                      Remove
                    </SaveButton>
                  </SaveForm>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
