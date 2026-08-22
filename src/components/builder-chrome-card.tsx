"use client";

import { BuilderChromeFields } from "@/components/builder-chrome-fields";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MediaLibraryItem } from "@/lib/media/blob";
import type { BuilderChrome } from "@/lib/website-builder/chrome";

export function BuilderChromeCard({
  chrome,
  fallbackName,
  uploadsEnabled,
  recentMedia,
}: {
  chrome: BuilderChrome
  fallbackName: string
  uploadsEnabled: boolean
  recentMedia: MediaLibraryItem[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Header and footer</CardTitle>
        <CardDescription>
          These sit on every GroovGro page. You can also click them in the
          Home page editor. They do not change the connected existing website.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BuilderChromeFields
          chrome={chrome}
          fallbackName={fallbackName}
          uploadsEnabled={uploadsEnabled}
          recentMedia={recentMedia}
          idPrefix="overview"
        />
      </CardContent>
    </Card>
  );
}
