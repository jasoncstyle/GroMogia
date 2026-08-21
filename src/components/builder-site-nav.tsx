import { cn } from "@/lib/utils";

export function BuilderSiteNav({
  pages,
}: {
  pages: { href: string; label: string; current?: boolean }[]
}) {
  if (pages.length < 2) return null;

  return (
    <nav
      aria-label="Pages"
      className="border-b px-4 py-3"
    >
      <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-2 text-sm">
        {pages.map((page) => (
          <li key={page.href}>
            <a
              href={page.href}
              className={cn(
                "underline-offset-4 hover:underline",
                page.current && "font-medium",
              )}
              aria-current={page.current ? "page" : undefined}
            >
              {page.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
