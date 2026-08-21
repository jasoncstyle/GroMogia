"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { BuilderSectionFields } from "@/components/builder-section-fields";
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
  setBuilderRowLayout,
  unpublishBuilderSite,
} from "@/lib/actions/website-builder";
import {
  layoutIdForWidths,
  ROW_LAYOUTS,
  rowGridTemplate,
  widgetsForColumn,
} from "@/lib/website-builder/layout";
import {
  BUILDER_SECTION_HINTS,
  BUILDER_SECTION_TYPES,
  builderSectionLabel,
} from "@/lib/website-builder/sections";
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
  site,
  rows: initialRows,
  orgSlug,
}: {
  open: boolean
  onClose: () => void
  site: { title: string; status: string }
  rows: BuilderLayoutRow[]
  orgSlug: string
}) {
  const router = useRouter();
  const [contentEdits, setContentEdits] = useState<Record<string, BuilderSectionContent>>({});
  const [visibilityEdits, setVisibilityEdits] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [columnsRowId, setColumnsRowId] = useState<string | null>(null);
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
    addRowOpen || Boolean(columnsRowId) || Boolean(addWidgetTarget) || Boolean(editing);

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
            Page editor
          </h2>
          <p className="text-xs text-muted-foreground">
            Add a row and pick the columns. Click a box to change its words or image.
          </p>
        </div>
        <Button type="button" onClick={() => setAddRowOpen(true)}>
          Add a row
        </Button>
        {site.status === "published" ? (
          <SaveForm action={unpublishBuilderSite} successMessage="Unpublished.">
            <SaveButton variant="outline">Unpublish</SaveButton>
          </SaveForm>
        ) : (
          <SaveForm action={publishBuilderSite} successMessage="Published.">
            <SaveButton>Publish</SaveButton>
          </SaveForm>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          <X className="size-4" />
          Close
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
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
          <div className="mx-auto max-w-6xl space-y-4">
            {rows.map((row, rowIndex) => (
              <div key={row.id} className="rounded-xl border">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                  <span className="text-xs font-medium">Row {rowIndex + 1}</span>
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
        onOpenChange={setAddRowOpen}
      />

      <LayoutPickerDialog
        open={Boolean(columnsRowId)}
        title="Set columns"
        description="Widgets in columns that disappear move into the last remaining column."
        action={setBuilderRowLayout}
        successMessage="Row layout saved."
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

      <AddWidgetDialog
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

function StudioWidget({
  widget,
  siteTitle,
  orgSlug,
  dense,
  onEdit,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  widget: BuilderLayoutWidget
  siteTitle: string
  orgSlug: string
  dense: boolean
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
      <button
        type="button"
        onClick={onEdit}
        className="block w-full text-left outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground"
      >
        <span className="sr-only">Edit {builderSectionLabel(widget.type).toLowerCase()}</span>
        <div className="pointer-events-none">
          <BuilderSectionView
            section={widget}
            orgSlug={orgSlug}
            fallbackTitle={siteTitle}
            headingLevel="h2"
            dense={dense}
          />
        </div>
      </button>
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

function LayoutPickerDialog({
  open,
  title,
  description,
  action,
  successMessage,
  rowId,
  selectedLayoutId,
  onOpenChange,
}: {
  open: boolean
  title: string
  description: string
  action: (formData: FormData) => Promise<ActionResult>
  successMessage: string
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
  target,
  onOpenChange,
}: {
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
    (widget.type === "hero" || widget.type === "image_text") &&
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
              <div
                role="img"
                aria-label={widget.content.imageAlt || "Image preview"}
                className="h-40 w-full rounded-lg bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url("${imageUrl.replaceAll('"', "")}")` }}
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
