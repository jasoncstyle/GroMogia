"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { PublicLeadForm } from "@/components/public-lead-form";
import { BuilderRemoteImage } from "@/components/builder-remote-image";
import type { BuilderSectionContent } from "@/lib/db/schema";
import {
  builderMapEmbedSrc,
  builderTelHref,
  builderWhatsAppHref,
  parseBuilderVideoEmbed,
} from "@/lib/website-builder/embeds";
import { rowGridTemplate, widgetsForColumn } from "@/lib/website-builder/layout";
import {
  isSafeBuilderHref,
  isSafeBuilderImageUrl,
  parseItemLines,
} from "@/lib/website-builder/sections";
import {
  EMPTY_BUILDER_THEME,
  headingClassName,
  isDarkBuilderColor,
  parseBuilderTheme,
  parseHeadingLevel,
  type BuilderHeadingLevel,
  type BuilderTheme,
} from "@/lib/website-builder/style";
import { cn } from "@/lib/utils";

export type RenderSection = {
  id: string
  type: string
  content: BuilderSectionContent
  columnIndex?: number
  sortOrder?: number
};

export type RenderRow = {
  id: string
  columnWidths: number[]
  backgroundColor?: string
  widgets: RenderSection[]
};

export function BuilderPageView({
  title,
  orgSlug,
  rows,
  theme,
}: {
  title: string
  orgSlug: string
  rows: RenderRow[]
  theme?: BuilderTheme
}) {
  const look = parseBuilderTheme(theme ?? EMPTY_BUILDER_THEME);
  const widgets = rows.flatMap((row) => row.widgets);
  const primaryHeadingId =
    widgets.find((section) => section.type === "hero" && section.content.heading)?.id ??
    widgets.find((section) => section.content.heading)?.id;

  return (
    <div
      className="min-h-full w-full"
      style={{
        backgroundColor: look.pageBackground || undefined,
        color: look.textColor || undefined,
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {rows.map((row) => {
          const dense = row.columnWidths.length > 1;
          const darkRow = isDarkBuilderColor(row.backgroundColor ?? "");
          return (
            <div
              key={row.id}
              className={cn(
                "grid grid-cols-1 gap-4",
                dense && "md:[grid-template-columns:var(--builder-cols)]",
                row.backgroundColor && "-mx-4 px-4 py-2 md:-mx-6 md:px-6",
                darkRow && "[&_*]:text-inherit",
              )}
              style={
                {
                  backgroundColor: row.backgroundColor || undefined,
                  color: darkRow ? "#f8fafc" : undefined,
                  ...(dense
                    ? { "--builder-cols": rowGridTemplate(row.columnWidths) }
                    : {}),
                } as CSSProperties
              }
            >
              {row.columnWidths.map((_, columnIndex) => (
                <div key={`${row.id}-${columnIndex}`}>
                  {widgetsForColumn(
                    row.widgets.map((widget, index) => ({
                      ...widget,
                      columnIndex: widget.columnIndex ?? 0,
                      sortOrder: widget.sortOrder ?? index,
                    })),
                    columnIndex,
                  ).map((section) => (
                    <BuilderSectionView
                      key={section.id}
                      section={section}
                      orgSlug={orgSlug}
                      fallbackTitle={title}
                      headingLevel={section.id === primaryHeadingId ? "h1" : "h2"}
                      dense={dense}
                      theme={look}
                    />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BuilderSectionView({
  section,
  orgSlug,
  fallbackTitle,
  headingLevel,
  dense = false,
  theme = EMPTY_BUILDER_THEME,
}: {
  section: RenderSection
  orgSlug: string
  fallbackTitle: string
  headingLevel: BuilderHeadingLevel
  dense?: boolean
  theme?: BuilderTheme
}) {
  const content = section.content;
  const level = parseHeadingLevel(content.headingLevel, headingLevel);
  const items = parseItemLines(content.items ?? "");
  const pad = dense ? "px-3 py-6" : "px-6 py-12";
  const heroPad = dense ? "px-3 py-8" : "px-6 py-20";
  const boxStyle: CSSProperties = {
    backgroundColor: content.backgroundColor || undefined,
    color: content.textColor || undefined,
  };
  const headingStyle: CSSProperties = {
    color: content.headingColor || theme.headingColor || undefined,
  };

  const heading = (text: string) => (
    <SectionHeading level={level} dense={dense} style={headingStyle}>
      {text}
    </SectionHeading>
  );

  if (section.type === "hero") {
    return (
      <section className={heroPad} style={boxStyle}>
        {heading(content.heading || fallbackTitle)}
        {content.subheading ? (
          <p className="mt-4 max-w-2xl text-lg opacity-80">{content.subheading}</p>
        ) : null}
        <SectionImage content={content} className="mt-8 max-w-2xl" />
        <SectionButton content={content} theme={theme} />
      </section>
    );
  }

  if (section.type === "text") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap opacity-80">{content.body}</p>
        ) : null}
        <SectionTextLink content={content} />
      </section>
    );
  }

  if (section.type === "cta") {
    return (
      <section className={pad} style={boxStyle}>
        <div className="rounded-xl border bg-black/5 px-6 py-10">
          {content.heading ? heading(content.heading) : null}
          {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
          <SectionButton content={content} theme={theme} />
        </div>
      </section>
    );
  }

  if (section.type === "lead") {
    return (
      <section id="lead" className={dense ? "px-3 py-8" : "px-6 py-16"} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? (
          <p className="mt-2 mb-6 max-w-2xl opacity-80">{content.body}</p>
        ) : (
          <div className="mb-6" />
        )}
        <div className="max-w-lg">
          <PublicLeadForm orgSlug={orgSlug} campaign="website-builder" />
        </div>
      </section>
    );
  }

  if (section.type === "image_text") {
    return (
      <section className={pad} style={boxStyle}>
        <div className={dense ? "space-y-4" : "grid gap-8 md:grid-cols-2 md:items-center"}>
          <SectionImage content={content} />
          <div>
            {content.heading ? heading(content.heading) : null}
            {content.body ? (
              <p className="mt-3 whitespace-pre-wrap opacity-80">{content.body}</p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "features" || section.type === "pricing") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.label} className="rounded-xl border px-4 py-4">
              <p className="font-medium">{item.label}</p>
              {item.detail ? <p className="mt-1 text-sm opacity-80">{item.detail}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (section.type === "testimonials") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <blockquote key={item.label} className="rounded-xl border px-4 py-4">
              {item.detail ? <p className="opacity-80">“{item.detail}”</p> : null}
              <footer className="mt-2 text-sm font-medium">{item.label}</footer>
            </blockquote>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "faq") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <details key={item.label} className="rounded-lg border px-4 py-3">
              <summary className="cursor-pointer font-medium">{item.label}</summary>
              {item.detail ? <p className="mt-2 text-sm opacity-80">{item.detail}</p> : null}
            </details>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "contact") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap opacity-80">{content.body}</p>
        ) : null}
        <SectionButton content={content} theme={theme} />
      </section>
    );
  }

  if (section.type === "button") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        <SectionButton content={content} theme={theme} />
      </section>
    );
  }

  if (section.type === "image") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        <SectionImage content={content} className={content.heading ? "mt-4" : undefined} />
      </section>
    );
  }

  if (section.type === "video") {
    const embed = parseBuilderVideoEmbed(content.videoUrl ?? "");
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        {embed ? (
          <div className="mt-4 aspect-video overflow-hidden rounded-xl border">
            <iframe
              src={embed.src}
              title={content.heading || "Video"}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
      </section>
    );
  }

  if (section.type === "gallery") {
    const photos = items.filter((item) => isSafeBuilderImageUrl(item.label));
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((item) => (
            <BuilderRemoteImage
              key={item.label}
              url={item.label}
              alt={item.detail || content.heading || ""}
              className="h-48"
            />
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "map") {
    const src = builderMapEmbedSrc(content.mapQuery ?? "");
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        {src ? (
          <div className="mt-4 aspect-video overflow-hidden rounded-xl border">
            <iframe title={content.heading || "Map"} src={src} className="size-full" />
          </div>
        ) : null}
      </section>
    );
  }

  if (section.type === "hours") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        <dl className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between gap-4 border-b py-2 text-sm">
              <dt className="font-medium">{item.label}</dt>
              <dd className="opacity-80">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  if (section.type === "countdown") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        <CountdownClock endAt={content.endAt ?? ""} />
      </section>
    );
  }

  if (section.type === "social") {
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        <ul className="mt-4 flex flex-wrap gap-2">
          {items.map((item) =>
            item.detail && isSafeBuilderHref(item.detail) ? (
              <li key={item.label}>
                <a
                  href={item.detail}
                  className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium"
                >
                  {item.label}
                </a>
              </li>
            ) : null,
          )}
        </ul>
      </section>
    );
  }

  if (section.type === "call") {
    const tel = builderTelHref(content.phone ?? "");
    const whatsapp = builderWhatsAppHref(content.whatsapp ?? "");
    return (
      <section className={pad} style={boxStyle}>
        {content.heading ? heading(content.heading) : null}
        {content.body ? <p className="mt-3 max-w-2xl opacity-80">{content.body}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {tel ? (
            <a
              href={tel}
              className="inline-flex rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: theme.buttonBackground || "#18181b",
                color: theme.buttonText || "#ffffff",
              }}
            >
              {content.buttonLabel?.trim() || "Call"}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsapp}
              className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}

function SectionHeading({
  level,
  dense,
  style,
  children,
}: {
  level: BuilderHeadingLevel
  dense: boolean
  style?: CSSProperties
  children: string
}) {
  const className = headingClassName(level, dense);
  if (level === "h1") return <h1 className={className} style={style}>{children}</h1>;
  if (level === "h2") return <h2 className={className} style={style}>{children}</h2>;
  if (level === "h3") return <h3 className={className} style={style}>{children}</h3>;
  return <p className={className} style={style}>{children}</p>;
}

function SectionImage({
  content,
  className,
}: {
  content: BuilderSectionContent
  className?: string
}) {
  const url = content.imageUrl?.trim() ?? "";
  if (!url || !isSafeBuilderImageUrl(url)) return null;
  return (
    <BuilderRemoteImage
      url={url}
      alt={content.imageAlt?.trim() || content.heading || ""}
      className={className}
    />
  );
}

function SectionButton({
  content,
  theme,
}: {
  content: BuilderSectionContent
  theme: BuilderTheme
}) {
  const href = content.buttonHref?.trim() ?? "";
  const label = content.buttonLabel?.trim() ?? "";
  if (!href || !label || !isSafeBuilderHref(href)) return null;
  return (
    <p className="mt-6">
      <a
        href={href}
        className="inline-flex rounded-lg px-4 py-2 text-sm font-medium"
        style={{
          backgroundColor: theme.buttonBackground || "#18181b",
          color: theme.buttonText || "#ffffff",
        }}
      >
        {label}
      </a>
    </p>
  );
}

function SectionTextLink({ content }: { content: BuilderSectionContent }) {
  const href = content.linkHref?.trim() ?? "";
  const label = content.linkLabel?.trim() ?? "";
  if (!href || !label || !isSafeBuilderHref(href)) return null;
  return (
    <p className="mt-3">
      <a href={href} className="text-sm font-medium underline underline-offset-4">
        {label}
      </a>
    </p>
  );
}

function CountdownClock({ endAt }: { endAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const target = Date.parse(endAt);
  if (!Number.isFinite(target)) return null;
  const remaining = Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    { label: "days", value: days },
    { label: "hours", value: hours },
    { label: "minutes", value: minutes },
    { label: "seconds", value: seconds },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {parts.map((part) => (
        <div key={part.label} className="min-w-16 rounded-xl border px-3 py-2 text-center">
          <p className="text-2xl font-semibold tabular-nums">{part.value}</p>
          <p className="text-xs opacity-70">{part.label}</p>
        </div>
      ))}
    </div>
  );
}
