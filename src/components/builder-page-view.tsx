"use client";

import { PublicLeadForm } from "@/components/public-lead-form";
import type { BuilderSectionContent } from "@/lib/db/schema";
import {
  isSafeBuilderHref,
  isSafeBuilderImageUrl,
  parseItemLines,
} from "@/lib/website-builder/sections";

export type RenderSection = {
  id: string
  type: string
  content: BuilderSectionContent
};

export function BuilderPageView({
  title,
  orgSlug,
  sections,
}: {
  title: string
  orgSlug: string
  sections: RenderSection[]
}) {
  const primaryHeadingId =
    sections.find((section) => section.type === "hero" && section.content.heading)?.id ??
    sections.find((section) => section.content.heading)?.id;

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      {sections.map((section) => (
        <BuilderSectionView
          key={section.id}
          section={section}
          orgSlug={orgSlug}
          fallbackTitle={title}
          headingLevel={section.id === primaryHeadingId ? "h1" : "h2"}
        />
      ))}
    </div>
  );
}

export function BuilderSectionView({
  section,
  orgSlug,
  fallbackTitle,
  headingLevel,
}: {
  section: RenderSection
  orgSlug: string
  fallbackTitle: string
  headingLevel: "h1" | "h2"
}) {
  const content = section.content;
  const Heading = headingLevel;
  const items = parseItemLines(content.items ?? "");

  if (section.type === "hero") {
    return (
      <section className="px-6 py-20">
        <Heading className="text-4xl font-semibold tracking-tight">
          {content.heading || fallbackTitle}
        </Heading>
        {content.subheading ? (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {content.subheading}
          </p>
        ) : null}
        <SectionImage content={content} className="mt-8 max-w-2xl" />
        <SectionButton content={content} />
      </section>
    );
  }

  if (section.type === "text") {
    return (
      <section className="px-6 py-12">
        {content.heading ? (
          <Heading className="text-2xl font-semibold tracking-tight">
            {content.heading}
          </Heading>
        ) : null}
        {content.body ? (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-muted-foreground">
            {content.body}
          </p>
        ) : null}
      </section>
    );
  }

  if (section.type === "cta") {
    return (
      <section className="px-6 py-12">
        <div className="rounded-xl border bg-muted/40 px-6 py-10">
          {content.heading ? (
            <Heading className="text-2xl font-semibold tracking-tight">
              {content.heading}
            </Heading>
          ) : null}
          {content.body ? (
            <p className="mt-3 max-w-2xl text-muted-foreground">{content.body}</p>
          ) : null}
          <SectionButton content={content} />
        </div>
      </section>
    );
  }

  if (section.type === "lead") {
    return (
      <section id="lead" className="px-6 py-16">
        {content.heading ? (
          <Heading className="text-2xl font-semibold tracking-tight">
            {content.heading}
          </Heading>
        ) : null}
        {content.body ? (
          <p className="mt-2 mb-6 max-w-2xl text-muted-foreground">{content.body}</p>
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
      <section className="px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <SectionImage content={content} />
          <div>
            {content.heading ? (
              <Heading className="text-2xl font-semibold tracking-tight">
                {content.heading}
              </Heading>
            ) : null}
            {content.body ? (
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
                {content.body}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "features") {
    return (
      <section className="px-6 py-12">
        {content.heading ? (
          <Heading className="text-2xl font-semibold tracking-tight">
            {content.heading}
          </Heading>
        ) : null}
        {content.body ? (
          <p className="mt-3 max-w-2xl text-muted-foreground">{content.body}</p>
        ) : null}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.label} className="rounded-xl border px-4 py-4">
              <p className="font-medium">{item.label}</p>
              {item.detail ? (
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (section.type === "testimonials") {
    return (
      <section className="px-6 py-12">
        {content.heading ? (
          <Heading className="text-2xl font-semibold tracking-tight">
            {content.heading}
          </Heading>
        ) : null}
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <blockquote key={item.label} className="rounded-xl border px-4 py-4">
              {item.detail ? (
                <p className="text-muted-foreground">“{item.detail}”</p>
              ) : null}
              <footer className="mt-2 text-sm font-medium">{item.label}</footer>
            </blockquote>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "faq") {
    return (
      <section className="px-6 py-12">
        {content.heading ? (
          <Heading className="text-2xl font-semibold tracking-tight">
            {content.heading}
          </Heading>
        ) : null}
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <details key={item.label} className="rounded-lg border px-4 py-3">
              <summary className="cursor-pointer font-medium">{item.label}</summary>
              {item.detail ? (
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              ) : null}
            </details>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "contact") {
    return (
      <section className="px-6 py-12">
        {content.heading ? (
          <Heading className="text-2xl font-semibold tracking-tight">
            {content.heading}
          </Heading>
        ) : null}
        {content.body ? (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-muted-foreground">
            {content.body}
          </p>
        ) : null}
        <SectionButton content={content} />
      </section>
    );
  }

  return null;
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
    // Arbitrary tenant image hosts; next/image is not used on purpose.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={content.imageAlt?.trim() || content.heading || ""}
      className={["w-full rounded-xl object-cover", className].filter(Boolean).join(" ")}
    />
  );
}

function SectionButton({ content }: { content: BuilderSectionContent }) {
  const href = content.buttonHref?.trim() ?? "";
  const label = content.buttonLabel?.trim() ?? "";
  if (!href || !label || !isSafeBuilderHref(href)) return null;
  return (
    <p className="mt-6">
      <a
        href={href}
        className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        {label}
      </a>
    </p>
  );
}
