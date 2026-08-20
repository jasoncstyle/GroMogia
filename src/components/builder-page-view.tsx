import { PublicLeadForm } from "@/components/public-lead-form";
import type { BuilderSectionContent } from "@/lib/db/schema";
import { isSafeBuilderHref } from "@/lib/website-builder/sections";

type RenderSection = {
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
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      {sections.map((section) => (
        <BuilderSectionView
          key={section.id}
          section={section}
          orgSlug={orgSlug}
          fallbackTitle={title}
        />
      ))}
    </div>
  );
}

function BuilderSectionView({
  section,
  orgSlug,
  fallbackTitle,
}: {
  section: RenderSection
  orgSlug: string
  fallbackTitle: string
}) {
  const content = section.content;
  if (section.type === "hero") {
    return (
      <section className="px-6 py-20">
        <h1 className="text-4xl font-semibold tracking-tight">
          {content.heading || fallbackTitle}
        </h1>
        {content.subheading ? (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {content.subheading}
          </p>
        ) : null}
        <SectionButton content={content} />
      </section>
    );
  }

  if (section.type === "text") {
    return (
      <section className="px-6 py-12">
        {content.heading ? (
          <h2 className="text-2xl font-semibold tracking-tight">{content.heading}</h2>
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
            <h2 className="text-2xl font-semibold tracking-tight">{content.heading}</h2>
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
          <h2 className="text-2xl font-semibold tracking-tight">{content.heading}</h2>
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

  return null;
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
