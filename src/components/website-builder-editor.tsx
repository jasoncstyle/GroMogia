"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

import { BuilderSectionFields } from "@/components/builder-section-fields";
import { BuilderSectionView } from "@/components/builder-page-view";
import { BuilderTemplatePicker } from "@/components/builder-template-picker";
import { CopyLink } from "@/components/copy-link";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import type { BuilderSectionContent } from "@/lib/db/schema";
import {
  addBuilderSection,
  applyBuilderTemplate,
  publishBuilderSite,
  removeBuilderSection,
  reorderBuilderSections,
  saveBuilderSection,
  saveBuilderSite,
  unpublishBuilderSite,
} from "@/lib/actions/website-builder";
import { moveSectionId, moveSectionIdToIndex } from "@/lib/website-builder/layout";
import {
  BUILDER_SECTION_TYPES,
  builderSectionLabel,
} from "@/lib/website-builder/sections";
import { cn } from "@/lib/utils";

export type EditorSection = {
  id: string
  type: string
  visible: boolean
  content: BuilderSectionContent
};

export function WebsiteBuilderEditor({
  site,
  sections: initialSections,
  brandName,
  orgSlug,
  publicUrl,
}: {
  site: {
    title: string
    metaDescription: string
    status: string
  }
  sections: EditorSection[]
  brandName: string | null
  orgSlug: string
  publicUrl: string
}) {
  const router = useRouter();
  const [contentEdits, setContentEdits] = useState<Record<string, BuilderSectionContent>>({});
  const [visibilityEdits, setVisibilityEdits] = useState<Record<string, boolean>>({});
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const [selectedId, setSelectedId] = useState(initialSections[0]?.id ?? "");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sections = useMemo(() => {
    const byId = new Map(initialSections.map((section) => [section.id, section]));
    const knownOrder = (orderIds ?? initialSections.map((section) => section.id)).filter(
      (id) => byId.has(id),
    );
    const missing = initialSections
      .map((section) => section.id)
      .filter((id) => !knownOrder.includes(id));
    return [...knownOrder, ...missing]
      .map((id) => byId.get(id))
      .filter((section): section is EditorSection => Boolean(section))
      .map((section) => ({
        ...section,
        content: contentEdits[section.id] ?? section.content,
        visible: visibilityEdits[section.id] ?? section.visible,
      }));
  }, [contentEdits, initialSections, orderIds, visibilityEdits]);

  const selected =
    sections.find((section) => section.id === selectedId) ?? sections[0] ?? null;

  function updateSelected(patch: Partial<EditorSection> & { content?: BuilderSectionContent }) {
    if (!selected) return;
    if (patch.content) {
      setContentEdits((current) => ({ ...current, [selected.id]: patch.content! }));
    }
    if (typeof patch.visible === "boolean") {
      setVisibilityEdits((current) => ({ ...current, [selected.id]: patch.visible! }));
    }
  }

  async function persistOrder(nextIds: string[]) {
    const currentIds = sections.map((section) => section.id);
    if (nextIds.join() === currentIds.join()) return;
    setOrderIds(nextIds);
    const formData = new FormData();
    for (const id of nextIds) formData.append("sectionIds", id);
    const result = await reorderBuilderSections(formData);
    if (result.ok) {
      toast.success(result.message ?? "Section order saved.");
      router.refresh();
    } else {
      toast.error(result.error);
      setOrderIds(null);
    }
  }

  async function run(action: (formData: FormData) => Promise<ActionResult>, formData: FormData) {
    const result = await action(formData);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{site.status === "published" ? "Published" : "Draft"}</CardTitle>
          <CardDescription>
            Click a box to edit it. Drag the handle to move it, or use Move up /
            Move down. The live page matches this layout after you save and
            publish.
            {brandName ? ` Starter copy comes from Brand (${brandName}).` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicUrl ? <CopyLink url={publicUrl} openLabel="Open page" /> : null}
          <SaveForm
            action={saveBuilderSite}
            successMessage="Website details saved."
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Page title</Label>
              <Input id="title" name="title" defaultValue={site.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaDescription">Search description</Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                defaultValue={site.metaDescription}
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                Used in search results and share previews for this GroovGro page.
                Up to 160 characters.
              </p>
            </div>
            <SaveButton>Save details</SaveButton>
          </SaveForm>
          <div className="flex flex-wrap gap-2">
            {site.status === "published" ? (
              <SaveForm action={unpublishBuilderSite} successMessage="Unpublished.">
                <SaveButton variant="outline">Unpublish</SaveButton>
              </SaveForm>
            ) : (
              <SaveForm action={publishBuilderSite} successMessage="Published.">
                <SaveButton>Publish</SaveButton>
              </SaveForm>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Page preview</h2>
            <p className="text-sm text-muted-foreground">
              This is how visitors will see the GroovGro page. Hidden boxes stay
              here so you can edit them, but they are not on the public page.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-background">
            {sections.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground">
                No sections yet. Add a box on the right, or start from a template
                below.
              </p>
            ) : (
              sections.map((section) => {
                const selectedBox = section.id === selectedId;
                return (
                  <div
                    key={section.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${builderSectionLabel(section.type)} section`}
                    aria-pressed={selectedBox}
                    onClick={() => setSelectedId(section.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(section.id);
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverId(section.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dragged =
                        event.dataTransfer.getData("text/plain") || draggedId;
                      setDraggedId(null);
                      setDragOverId(null);
                      if (!dragged) return;
                      const ids = moveSectionIdToIndex(
                        sections.map((item) => item.id),
                        dragged,
                        section.id,
                      );
                      void persistOrder(ids);
                    }}
                    className={cn(
                      "relative border-b last:border-b-0 outline-none",
                      selectedBox && "ring-2 ring-inset ring-foreground",
                      dragOverId === section.id && draggedId !== section.id
                        ? "bg-muted/60"
                        : null,
                      !section.visible && "opacity-60",
                    )}
                  >
                    <div className="absolute top-2 right-2 z-10 flex flex-wrap items-center justify-end gap-1">
                      <span className="rounded-md bg-background/95 px-2 py-1 text-xs font-medium shadow-sm">
                        {builderSectionLabel(section.type)}
                        {section.visible ? "" : " · Hidden"}
                      </span>
                      <span
                        draggable
                        onDragStart={(event) => {
                          setDraggedId(section.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", section.id);
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverId(null);
                        }}
                        className="inline-flex cursor-grab rounded-md bg-background/95 p-1 shadow-sm active:cursor-grabbing"
                      >
                        <GripVertical className="size-4" aria-hidden />
                        <span className="sr-only">Drag to move</span>
                      </span>
                    </div>
                    <div className="pointer-events-none">
                      <BuilderSectionView
                        section={section}
                        orgSlug={orgSlug}
                        fallbackTitle={site.title}
                        headingLevel="h2"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>
                {selected
                  ? `Edit ${builderSectionLabel(selected.type).toLowerCase()}`
                  : "Edit a box"}
              </CardTitle>
              <CardDescription>
                Changes show in the preview as you type. Click Save section to
                keep them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? (
                <SaveForm
                  action={saveBuilderSection}
                  successMessage="Section saved."
                  className="space-y-3"
                >
                  <input type="hidden" name="sectionId" value={selected.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="visible"
                      checked={selected.visible}
                      onChange={(event) =>
                        updateSelected({ visible: event.target.checked })
                      }
                    />
                    Show this section on the public page
                  </label>
                  <BuilderSectionFields
                    sectionId={selected.id}
                    type={selected.type}
                    content={selected.content}
                    onChange={(content) => updateSelected({ content })}
                  />
                  <SaveButton>Save section</SaveButton>
                </SaveForm>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click a box on the left to edit its words.
                </p>
              )}
            </CardContent>
          </Card>

          {selected ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sections[0]?.id === selected.id}
                onClick={() =>
                  void persistOrder(
                    moveSectionId(
                      sections.map((section) => section.id),
                      selected.id,
                      "up",
                    ),
                  )
                }
              >
                Move up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sections.at(-1)?.id === selected.id}
                onClick={() =>
                  void persistOrder(
                    moveSectionId(
                      sections.map((section) => section.id),
                      selected.id,
                      "down",
                    ),
                  )
                }
              >
                Move down
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const formData = new FormData();
                  formData.set("sectionId", selected.id);
                  void run(removeBuilderSection, formData);
                }}
              >
                Remove
              </Button>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Add a box</CardTitle>
              <CardDescription>
                New boxes appear at the bottom. Drag them where you want.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SaveForm
                action={addBuilderSection}
                successMessage="Section added."
                className="flex flex-wrap items-end gap-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="type">Section type</Label>
                  <select
                    id="type"
                    name="type"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue="text"
                  >
                    {BUILDER_SECTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {builderSectionLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <SaveButton>Add section</SaveButton>
              </SaveForm>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start from a different template</CardTitle>
          <CardDescription>
            This replaces the boxes on the GroovGro page with a new starting
            layout filled from Brand. It does not change the connected existing
            website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FoldableSample
            title="Replace current boxes"
            subtitle="Closed until you choose a layout"
          >
            <SaveForm
              action={applyBuilderTemplate}
              successMessage="Template applied to the GroovGro page."
              className="space-y-4"
            >
              <BuilderTemplatePicker />
              <SaveButton variant="outline">Use this template</SaveButton>
            </SaveForm>
          </FoldableSample>
        </CardContent>
      </Card>
    </div>
  );
}
