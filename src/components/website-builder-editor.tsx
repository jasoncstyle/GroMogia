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
  addBuilderRow,
  addBuilderSection,
  applyBuilderTemplate,
  moveBuilderRow,
  moveBuilderSection,
  placeBuilderWidget,
  publishBuilderSite,
  removeBuilderRow,
  removeBuilderSection,
  saveBuilderSection,
  saveBuilderSite,
  setBuilderRowLayout,
  unpublishBuilderSite,
} from "@/lib/actions/website-builder";
import {
  ROW_LAYOUTS,
  rowGridTemplate,
  widgetsForColumn,
} from "@/lib/website-builder/layout";
import {
  BUILDER_SECTION_TYPES,
  builderSectionLabel,
} from "@/lib/website-builder/sections";
import type { BuilderLayoutRow } from "@/lib/website-builder/types";
import { cn } from "@/lib/utils";

export function WebsiteBuilderEditor({
  site,
  rows: initialRows,
  brandName,
  orgSlug,
  publicUrl,
}: {
  site: {
    title: string
    metaDescription: string
    status: string
  }
  rows: BuilderLayoutRow[]
  brandName: string | null
  orgSlug: string
  publicUrl: string
}) {
  const router = useRouter();
  const [contentEdits, setContentEdits] = useState<Record<string, BuilderSectionContent>>({});
  const [visibilityEdits, setVisibilityEdits] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState(initialRows[0]?.widgets[0]?.id ?? "");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      initialRows.map((row) => ({
        ...row,
        widgets: row.widgets.map((widget) => ({
          ...widget,
          content: contentEdits[widget.id] ?? widget.content,
          visible: visibilityEdits[widget.id] ?? widget.visible,
        })),
      })),
    [contentEdits, initialRows, visibilityEdits],
  );

  const widgets = rows.flatMap((row) => row.widgets);
  const selected = widgets.find((widget) => widget.id === selectedId) ?? widgets[0] ?? null;

  function updateSelected(patch: { content?: BuilderSectionContent; visible?: boolean }) {
    if (!selected) return;
    if (patch.content) {
      setContentEdits((current) => ({ ...current, [selected.id]: patch.content! }));
    }
    if (typeof patch.visible === "boolean") {
      setVisibilityEdits((current) => ({ ...current, [selected.id]: patch.visible! }));
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
            Add a row, pick how many columns it has, then drop widgets into the
            cells — the same idea as SiteOrigin. This GroovGro page does not
            replace the connected website.
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

      <Card>
        <CardHeader>
          <CardTitle>Add a row</CardTitle>
          <CardDescription>
            A row is one horizontal band. Three columns means three boxes side
            by side on a computer, stacked on a phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ROW_LAYOUTS.map((layout) => (
            <SaveForm
              key={layout.id}
              action={addBuilderRow}
              successMessage="Row added."
            >
              <input type="hidden" name="layoutId" value={layout.id} />
              <SaveButton variant="outline" className="h-auto flex-col items-start gap-1 py-2">
                <span className="flex h-5 w-20 gap-0.5">
                  {layout.widths.map((width, index) => (
                    <span
                      key={`${layout.id}-${index}`}
                      className="rounded-sm bg-foreground/30"
                      style={{ flexGrow: width }}
                    />
                  ))}
                </span>
                <span className="text-xs font-medium">{layout.label}</span>
              </SaveButton>
            </SaveForm>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.7fr)]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Page preview</h2>
            <p className="text-sm text-muted-foreground">
              Click a widget to edit it. Drag it into another column. Use Add
              widget inside an empty cell.
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="rounded-xl border p-8 text-sm text-muted-foreground">
              Add a row above, then add widgets into the columns.
            </p>
          ) : (
            <div className="space-y-4">
              {rows.map((row, rowIndex) => (
                <div key={row.id} className="rounded-xl border">
                  <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                    <span className="text-xs font-medium">Row {rowIndex + 1}</span>
                    <SaveForm
                      action={setBuilderRowLayout}
                      successMessage="Row layout saved."
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="rowId" value={row.id} />
                      <select
                        name="layoutId"
                        defaultValue={
                          ROW_LAYOUTS.find(
                            (layout) =>
                              layout.widths.join() === row.columnWidths.join(),
                          )?.id ?? "1"
                        }
                        className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        {ROW_LAYOUTS.map((layout) => (
                          <option key={layout.id} value={layout.id}>
                            {layout.label}
                          </option>
                        ))}
                      </select>
                      <SaveButton size="sm" variant="outline">
                        Set columns
                      </SaveButton>
                    </SaveForm>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={rowIndex === 0}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("rowId", row.id);
                        formData.set("direction", "up");
                        void run(moveBuilderRow, formData);
                      }}
                    >
                      Move row up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={rowIndex === rows.length - 1}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("rowId", row.id);
                        formData.set("direction", "down");
                        void run(moveBuilderRow, formData);
                      }}
                    >
                      Move row down
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("rowId", row.id);
                        void run(removeBuilderRow, formData);
                      }}
                    >
                      Remove row
                    </Button>
                  </div>
                  <div
                    className={cn(
                      "grid grid-cols-1 gap-2 p-2",
                      row.columnWidths.length > 1 &&
                        "md:[grid-template-columns:var(--builder-cols)]",
                    )}
                    style={
                      row.columnWidths.length > 1
                        ? ({ "--builder-cols": rowGridTemplate(row.columnWidths) } as {
                            [key: string]: string
                          })
                        : undefined
                    }
                  >
                    {row.columnWidths.map((_, columnIndex) => {
                      const cellKey = `${row.id}:${columnIndex}`;
                      const cellWidgets = widgetsForColumn(row.widgets, columnIndex);
                      return (
                        <div
                          key={cellKey}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverKey(cellKey);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const sectionId =
                              event.dataTransfer.getData("text/plain") || draggedId;
                            setDraggedId(null);
                            setDragOverKey(null);
                            if (!sectionId) return;
                            const formData = new FormData();
                            formData.set("sectionId", sectionId);
                            formData.set("rowId", row.id);
                            formData.set("columnIndex", String(columnIndex));
                            void run(placeBuilderWidget, formData);
                          }}
                          className={cn(
                            "min-h-32 rounded-lg border border-dashed bg-background",
                            dragOverKey === cellKey && "border-foreground bg-muted/50",
                          )}
                        >
                          {cellWidgets.map((widget) => {
                            const selectedBox = widget.id === selected?.id;
                            return (
                              <div
                                key={widget.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={selectedBox}
                                onClick={() => setSelectedId(widget.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedId(widget.id);
                                  }
                                }}
                                className={cn(
                                  "relative border-b last:border-b-0 outline-none",
                                  selectedBox && "ring-2 ring-inset ring-foreground",
                                  !widget.visible && "opacity-60",
                                )}
                              >
                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                                  <span className="rounded-md bg-background/95 px-2 py-1 text-xs font-medium shadow-sm">
                                    {builderSectionLabel(widget.type)}
                                  </span>
                                  <span
                                    draggable
                                    onDragStart={(event) => {
                                      setDraggedId(widget.id);
                                      event.dataTransfer.effectAllowed = "move";
                                      event.dataTransfer.setData("text/plain", widget.id);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedId(null);
                                      setDragOverKey(null);
                                    }}
                                    className="inline-flex cursor-grab rounded-md bg-background/95 p-1 shadow-sm active:cursor-grabbing"
                                  >
                                    <GripVertical className="size-4" aria-hidden />
                                    <span className="sr-only">Drag to another column</span>
                                  </span>
                                </div>
                                <div className="pointer-events-none">
                                  <BuilderSectionView
                                    section={widget}
                                    orgSlug={orgSlug}
                                    fallbackTitle={site.title}
                                    headingLevel="h2"
                                    dense={row.columnWidths.length > 1}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="p-2">
                            <SaveForm
                              action={addBuilderSection}
                              successMessage="Widget added."
                              className="flex flex-wrap items-end gap-2"
                            >
                              <input type="hidden" name="rowId" value={row.id} />
                              <input
                                type="hidden"
                                name="columnIndex"
                                value={columnIndex}
                              />
                              <select
                                name="type"
                                defaultValue="text"
                                className="h-7 flex-1 rounded-md border border-input bg-transparent px-2 text-xs"
                              >
                                {BUILDER_SECTION_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {builderSectionLabel(type)}
                                  </option>
                                ))}
                              </select>
                              <SaveButton size="sm" variant="outline">
                                Add widget
                              </SaveButton>
                            </SaveForm>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>
                {selected
                  ? `Edit ${builderSectionLabel(selected.type).toLowerCase()}`
                  : "Edit a widget"}
              </CardTitle>
              <CardDescription>
                Changes show in the preview as you type. Save to keep them.
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
                    Show this widget on the public page
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
                  Click a widget in a column to edit it.
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
                onClick={() => {
                  const formData = new FormData();
                  formData.set("sectionId", selected.id);
                  formData.set("direction", "up");
                  void run(moveBuilderSection, formData);
                }}
              >
                Move up in column
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const formData = new FormData();
                  formData.set("sectionId", selected.id);
                  formData.set("direction", "down");
                  void run(moveBuilderSection, formData);
                }}
              >
                Move down in column
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
                Remove widget
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start from a different template</CardTitle>
          <CardDescription>
            This replaces the GroovGro page with a new row-and-column layout.
            It does not change the connected existing website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FoldableSample
            title="Replace current layout"
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
