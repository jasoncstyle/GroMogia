"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { BuilderSectionFields } from "@/components/builder-section-fields";
import { BuilderColorField, BuilderThemeFields } from "@/components/builder-color-field";
import { BuilderRemoteImage } from "@/components/builder-remote-image";
import { BuilderSectionView } from "@/components/builder-page-view";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import type { BuilderSectionContent } from "@/lib/db/schema";
import {
  addBuilderRow,
  addBuilderSection,
  moveBuilderRow,
  moveBuilderSection,
  placeBuilderWidget,
  publishBuilderSite,
  removeBuilderRow,
  removeBuilderSection,
  saveBuilderSection,
  saveBuilderSite,
  setBuilderRowBackground,
  setBuilderRowLayout,
  setBuilderRowWidth,
  unpublishBuilderSite,
} from "@/lib/actions/website-builder";
import {
  layoutIdForWidths,
  parseContentWidth,
  ROW_CONTENT_WIDTHS,
  ROW_LAYOUTS,
  rowContentInnerClass,
  rowContentWidthLabel,
  rowGridTemplate,
  widgetsForColumn,
} from "@/lib/website-builder/layout";
import {
  BUILDER_SECTION_HINTS,
  BUILDER_SECTION_TYPES,
  builderSectionLabel,
} from "@/lib/website-builder/sections";
import { BUILDER_BACKGROUND_SWATCHES, isDarkBuilderColor, type BuilderTheme } from "@/lib/website-builder/style";
import { builderTemplateLabel } from "@/lib/website-builder/templates";
import type { BuilderLayoutRow, BuilderLayoutWidget } from "@/lib/website-builder/types";
import { cn } from "@/lib/utils";

type AddWidgetTarget = {
  rowId: string
  columnIndex: number
};

function LayoutBars({ widths, className }: { widths: number[]; className?: string }) {
  return (
    <span className={cn("flex h-5 w-20 gap-0.5", className)}>
      {widths.map((width, index) => (
        <span
          key={`${width}-${index}`}
          className="rounded-sm bg-foreground/30"
          style={{ flexGrow: width }}
        />
      ))}
    </span>
  );
}

export function BuilderStudio({
  open,
  onClose,
  pageId,
  pageLabel,
  previewHref,
  site,
  rows: initialRows,
  orgSlug,
  onThemeChange,
}: {
  open: boolean
  onClose: () => void
  pageId: string
  pageLabel: string
  previewHref: string
  site: {
    title: string
    metaDescription: string
    status: string
    theme: BuilderTheme
    templateId?: string
  }
  rows: BuilderLayoutRow[]
  orgSlug: string
  onThemeChange: (theme: BuilderTheme) => void
}) {
  const router = useRouter();
  const [contentEdits, setContentEdits] = useState<Record<string, BuilderSectionContent>>({});
  const [visibilityEdits, setVisibilityEdits] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [columnsRowId, setColumnsRowId] = useState<string | null>(null);
  const [colorRowId, setColorRowId] = useState<string | null>(null);
  const [widthRowId, setWidthRowId] = useState<string | null>(null);
  const [pageColorsOpen, setPageColorsOpen] = useState(false);
  const [addWidgetTarget, setAddWidgetTarget] = useState<AddWidgetTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const editing = widgets.find((widget) => widget.id === editingId) ?? null;
  const popupOpen =
    addRowOpen ||
    Boolean(columnsRowId) ||
    Boolean(colorRowId) ||
    Boolean(widthRowId) ||
    pageColorsOpen ||
    Boolean(addWidgetTarget) ||
    Boolean(editing);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (popupOpen) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open, popupOpen]);

  function updateEditing(patch: { content?: BuilderSectionContent; visible?: boolean }) {
    if (!editing) return;
    if (patch.content) {
      setContentEdits((current) => ({ ...current, [editing.id]: patch.content! }));
    }
    if (typeof patch.visible === "boolean") {
      setVisibilityEdits((current) => ({ ...current, [editing.id]: patch.visible! }));
    }
  }

  async function run(action: (formData: FormData) => Promise<ActionResult>, formData: FormData) {
    formData.set("pageId", pageId);
    const result = await action(formData);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="builder-studio-title"
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id="builder-studio-title" className="text-base font-semibold tracking-tight">
            Page editor · {pageLabel} · {builderTemplateLabel(site.templateId)}
          </h2>
          <p className="text-xs text-muted-foreground">
            Add a row and pick the columns. Row width makes a photo go across
            the whole screen or stay in a box.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <a href={previewHref} target="_blank" rel="noreferrer">
            Preview
          </a>
        </Button>
        <Button type="button" variant="outline" onClick={() => setPageColorsOpen(true)}>
          Page colors
        </Button>
        <Button type="button" onClick={() => setAddRowOpen(true)}>
          Add a row
        </Button>
        {site.status === "published" ? (
          <SaveForm action={unpublishBuilderSite} successMessage="Unpublished.">
            <input type="hidden" name="pageId" value={pageId} />
            <SaveButton variant="outline">Unpublish</SaveButton>
          </SaveForm>
        ) : (
          <SaveForm action={publishBuilderSite} successMessage="Published.">
            <input type="hidden" name="pageId" value={pageId} />
            <SaveButton>Publish</SaveButton>
          </SaveForm>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          <X className="size-4" />
          Close
        </Button>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6"
        style={{ backgroundColor: site.theme.pageBackground || undefined }}
      >
        {rows.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm font-medium">This page has no rows yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click Add a row, then choose one, two, three, or four columns.
            </p>
            <Button className="mt-4" type="button" onClick={() => setAddRowOpen(true)}>
              Add a row
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {rows.map((row, rowIndex) => (
              <div
                key={row.id}
                className={cn(
                  "rounded-xl border",
                  parseContentWidth(row.contentWidth) === "full" &&
                    "-mx-4 rounded-none border-x-0 md:-mx-6",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                  <span className="text-xs font-medium">Row {rowIndex + 1}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setWidthRowId(row.id)}
                    >
                      Row width: {rowContentWidthLabel(parseContentWidth(row.contentWidth))}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setColumnsRowId(row.id)}
                    >
                      Columns
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setColorRowId(row.id)}
                    >
                      Row color
                    </Button>
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
                    Move up
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
                    Move down
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
                    rowContentInnerClass(parseContentWidth(row.contentWidth)),
                    "py-2",
                  )}
                >
                <div
                  className={cn(
                    "grid grid-cols-1 gap-2 p-2",
                    row.columnWidths.length > 1 &&
                      "md:[grid-template-columns:var(--builder-cols)]",
                  )}
                  style={
                    {
                      backgroundColor: row.backgroundColor || undefined,
                      ...(row.columnWidths.length > 1
                        ? { "--builder-cols": rowGridTemplate(row.columnWidths) }
                        : {}),
                    } as { [key: string]: string }
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
                          "flex min-h-32 flex-col rounded-lg border border-dashed bg-background",
                          dragOverKey === cellKey && "border-foreground bg-muted/50",
                        )}
                      >
                        {cellWidgets.map((widget) => (
                          <StudioWidget
                            key={widget.id}
                            widget={widget}
                            siteTitle={site.title}
                            orgSlug={orgSlug}
                            dense={row.columnWidths.length > 1}
                            fullBleed={
                              parseContentWidth(row.contentWidth) === "full"
                            }
                            darkRow={isDarkBuilderColor(row.backgroundColor)}
                            theme={site.theme}
                            onEdit={() => setEditingId(widget.id)}
                            onDragStart={(event) => {
                              setDraggedId(widget.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", widget.id);
                            }}
                            onDragEnd={() => {
                              setDraggedId(null);
                              setDragOverKey(null);
                            }}
                            onMove={(direction) => {
                              const formData = new FormData();
                              formData.set("sectionId", widget.id);
                              formData.set("direction", direction);
                              void run(moveBuilderSection, formData);
                            }}
                          />
                        ))}
                        <div className="mt-auto p-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              setAddWidgetTarget({ rowId: row.id, columnIndex })
                            }
                          >
                            Add widget
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LayoutPickerDialog
        open={addRowOpen}
        title="Add a row"
        description="Choose how many columns this band should have. You can change it later."
        action={addBuilderRow}
        successMessage="Row added."
        pageId={pageId}
        onOpenChange={setAddRowOpen}
      />

      <LayoutPickerDialog
        open={Boolean(columnsRowId)}
        title="Set columns"
        description="Widgets in columns that disappear move into the last remaining column."
        action={setBuilderRowLayout}
        successMessage="Row layout saved."
        pageId={pageId}
        rowId={columnsRowId}
        selectedLayoutId={
          columnsRowId
            ? layoutIdForWidths(
                rows.find((row) => row.id === columnsRowId)?.columnWidths ?? [100],
              )
            : undefined
        }
        onOpenChange={(next) => {
          if (!next) setColumnsRowId(null);
        }}
      />

      <Dialog open={pageColorsOpen} onOpenChange={setPageColorsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Page colors</DialogTitle>
            <DialogDescription>
              Page background sits behind every row. Use the color wheel, type a
              hex code, or pick a swatch. Leave “use on every row” on so Preview
              matches. A row can still have its own Row color.
            </DialogDescription>
          </DialogHeader>
          <SaveForm
            action={saveBuilderSite}
            successMessage="Page colors saved."
            onSuccess={() => setPageColorsOpen(false)}
            className="space-y-4"
          >
            <input type="hidden" name="pageId" value={pageId} />
            <input type="hidden" name="title" value={site.title} />
            <input type="hidden" name="metaDescription" value={site.metaDescription} />
            <BuilderThemeFields theme={site.theme} onChange={onThemeChange} />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="applyPageBackgroundToRows"
                defaultChecked
                className="mt-1"
              />
              <span>
                Use this page background on every row. Leave this on so Preview
                matches what you pick.
              </span>
            </label>
            <SaveButton>Save colors</SaveButton>
          </SaveForm>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(widthRowId)} onOpenChange={(next) => { if (!next) setWidthRowId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Row width</DialogTitle>
            <DialogDescription>
              This is how wide this row is on the screen. Edge to edge makes a
              hero photo go all the way across. Normal keeps it in a box.
            </DialogDescription>
          </DialogHeader>
          {widthRowId ? (
            <div className="grid grid-cols-2 gap-2">
              {ROW_CONTENT_WIDTHS.map((option) => (
                <SaveForm
                  key={option.id}
                  action={setBuilderRowWidth}
                  successMessage="Row width saved."
                  onSuccess={() => setWidthRowId(null)}
                >
                  <input type="hidden" name="pageId" value={pageId} />
                  <input type="hidden" name="rowId" value={widthRowId} />
                  <input type="hidden" name="contentWidth" value={option.id} />
                  <SaveButton
                    variant={
                      parseContentWidth(
                        rows.find((row) => row.id === widthRowId)?.contentWidth,
                      ) === option.id
                        ? "default"
                        : "outline"
                    }
                    className="h-auto w-full flex-col items-start gap-2 py-3"
                  >
                    <WidthBar width={option.id} />
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {option.hint}
                    </span>
                  </SaveButton>
                </SaveForm>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(colorRowId)} onOpenChange={(next) => { if (!next) setColorRowId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Row color</DialogTitle>
            <DialogDescription>
              Background for this whole row. Default (the slashed swatch) means
              no extra color — the page background shows through.
            </DialogDescription>
          </DialogHeader>
          {colorRowId ? (
            <RowColorForm
              key={colorRowId}
              pageId={pageId}
              rowId={colorRowId}
              value={rows.find((row) => row.id === colorRowId)?.backgroundColor ?? ""}
              onSaved={() => setColorRowId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AddWidgetDialog
        pageId={pageId}
        target={addWidgetTarget}
        onOpenChange={(next) => {
          if (!next) setAddWidgetTarget(null);
        }}
      />

      <EditWidgetDialog
        widget={editing}
        onOpenChange={(next) => {
          if (!next) setEditingId(null);
        }}
        onChange={updateEditing}
        onRemove={() => {
          if (!editing) return;
          const formData = new FormData();
          formData.set("sectionId", editing.id);
          setEditingId(null);
          void run(removeBuilderSection, formData);
        }}
      />
    </div>,
    document.body,
  );
}

function WidthBar({ width }: { width: (typeof ROW_CONTENT_WIDTHS)[number]["id"] }) {
  const grow = { narrow: 42, normal: 68, wide: 86, full: 100 }[width];
  return (
    <span className="flex h-5 w-full items-center justify-center rounded-sm bg-muted px-1">
      <span
        className="h-3 rounded-sm bg-foreground/40"
        style={{ width: `${grow}%` }}
      />
    </span>
  );
}

function StudioWidget({
  widget,
  siteTitle,
  orgSlug,
  dense,
  fullBleed = false,
  darkRow = false,
  theme,
  onEdit,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  widget: BuilderLayoutWidget
  siteTitle: string
  orgSlug: string
  dense: boolean
  fullBleed?: boolean
  darkRow?: boolean
  theme: BuilderTheme
  onEdit: () => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
  onMove: (direction: "up" | "down") => void
}) {
  return (
    <div className={cn("relative border-b last:border-b-0", !widget.visible && "opacity-60")}>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <span className="rounded-md bg-background/95 px-2 py-1 text-xs font-medium shadow-sm">
          {builderSectionLabel(widget.type)}
        </span>
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="inline-flex cursor-grab rounded-md bg-background/95 p-1 shadow-sm active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
          <span className="sr-only">Drag to another column</span>
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onEdit();
          }
        }}
        className="block w-full cursor-pointer text-left outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground"
      >
        <span className="sr-only">Edit {builderSectionLabel(widget.type).toLowerCase()}</span>
        <div className="pointer-events-none">
          <BuilderSectionView
            section={widget}
            orgSlug={orgSlug}
            fallbackTitle={siteTitle}
            headingLevel="h2"
            dense={dense}
            fullBleed={fullBleed}
            darkRow={darkRow}
            theme={theme}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1 px-2 pb-2">
        <Button type="button" size="xs" variant="ghost" onClick={() => onMove("up")}>
          Move up
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => onMove("down")}>
          Move down
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function RowColorForm({
  pageId,
  rowId,
  value,
  onSaved,
}: {
  pageId: string
  rowId: string
  value: string
  onSaved: () => void
}) {
  const [color, setColor] = useState(value);

  return (
    <SaveForm
      action={setBuilderRowBackground}
      successMessage="Row color saved."
      onSuccess={onSaved}
      className="space-y-3"
    >
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="rowId" value={rowId} />
      <BuilderColorField
        id={`row-color-${rowId}`}
        name="backgroundColor"
        label="Background"
        value={color}
        swatches={BUILDER_BACKGROUND_SWATCHES}
        onChange={setColor}
      />
      <SaveButton>Save row color</SaveButton>
    </SaveForm>
  );
}

function LayoutPickerDialog({
  open,
  title,
  description,
  action,
  successMessage,
  pageId,
  rowId,
  selectedLayoutId,
  onOpenChange,
}: {
  open: boolean
  title: string
  description: string
  action: (formData: FormData) => Promise<ActionResult>
  successMessage: string
  pageId: string
  rowId?: string | null
  selectedLayoutId?: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROW_LAYOUTS.map((layout) => (
            <SaveForm
              key={layout.id}
              action={action}
              successMessage={successMessage}
              onSuccess={() => onOpenChange(false)}
            >
              <input type="hidden" name="pageId" value={pageId} />
              {rowId ? <input type="hidden" name="rowId" value={rowId} /> : null}
              <input type="hidden" name="layoutId" value={layout.id} />
              <SaveButton
                variant={selectedLayoutId === layout.id ? "default" : "outline"}
                className="h-auto w-full flex-col items-start gap-1 py-3"
              >
                <LayoutBars widths={layout.widths} />
                <span className="text-xs font-medium">{layout.label}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {layout.hint}
                </span>
              </SaveButton>
            </SaveForm>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWidgetDialog({
  pageId,
  target,
  onOpenChange,
}: {
  pageId: string
  target: AddWidgetTarget | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a widget</DialogTitle>
          <DialogDescription>
            Pick the kind of box to drop into this column. You can change the
            words and image next.
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {BUILDER_SECTION_TYPES.map((type) => (
              <SaveForm
                key={type}
                action={addBuilderSection}
                successMessage="Widget added. Click it to edit."
                onSuccess={() => onOpenChange(false)}
              >
                <input type="hidden" name="pageId" value={pageId} />
                <input type="hidden" name="rowId" value={target.rowId} />
                <input type="hidden" name="columnIndex" value={String(target.columnIndex)} />
                <input type="hidden" name="type" value={type} />
                <SaveButton
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
                >
                  <span className="text-sm font-medium">{builderSectionLabel(type)}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {BUILDER_SECTION_HINTS[type]}
                  </span>
                </SaveButton>
              </SaveForm>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditWidgetDialog({
  widget,
  onOpenChange,
  onChange,
  onRemove,
}: {
  widget: BuilderLayoutWidget | null
  onOpenChange: (open: boolean) => void
  onChange: (patch: { content?: BuilderSectionContent; visible?: boolean }) => void
  onRemove: () => void
}) {
  const imageUrl = widget?.content.imageUrl?.trim() ?? "";
  const showImagePreview =
    widget &&
    (widget.type === "hero" || widget.type === "image_text" || widget.type === "image") &&
    imageUrl.startsWith("https://");

  return (
    <Dialog open={Boolean(widget)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {widget ? `Edit ${builderSectionLabel(widget.type).toLowerCase()}` : "Edit widget"}
          </DialogTitle>
          <DialogDescription>
            Change the words or image here. The page behind this window updates
            as you type. Click Done to keep the change.
          </DialogDescription>
        </DialogHeader>
        {widget ? (
          <SaveForm
            action={saveBuilderSection}
            successMessage="Widget saved."
            onSuccess={() => onOpenChange(false)}
            className="space-y-3"
          >
            <input type="hidden" name="sectionId" value={widget.id} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="visible"
                checked={widget.visible}
                onChange={(event) => onChange({ visible: event.target.checked })}
              />
              Show this widget on the public page
            </label>
            {showImagePreview ? (
              <BuilderRemoteImage
                url={imageUrl}
                alt={widget.content.imageAlt || "Image preview"}
                className="h-40"
              />
            ) : null}
            <BuilderSectionFields
              sectionId={widget.id}
              type={widget.type}
              content={widget.content}
              onChange={(content) => onChange({ content })}
            />
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={onRemove}>
                Remove
              </Button>
              <SaveButton>Done</SaveButton>
            </DialogFooter>
          </SaveForm>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
