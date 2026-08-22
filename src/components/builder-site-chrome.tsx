import { BuilderRemoteImage } from "@/components/builder-remote-image";
import type { ResolvedBuilderChrome } from "@/lib/website-builder/chrome";
import { isSafeBuilderImageUrl } from "@/lib/website-builder/sections";
import { isDarkBuilderColor } from "@/lib/website-builder/style";
import { cn } from "@/lib/utils";

export type ChromePageLink = {
  href: string
  label: string
  current?: boolean
};

export function BuilderSiteHeader({
  chrome,
  pages,
  homeHref,
  inert = false,
}: {
  chrome: ResolvedBuilderChrome
  pages: ChromePageLink[]
  homeHref: string
  inert?: boolean
}) {
  if (!chrome.showHeader) return null;
  const dark = isDarkBuilderColor(chrome.headerBackgroundColor);
  const links = chrome.showPageLinks ? pages : [];
  const logoUrl = chrome.logoUrl.trim();
  const showLogo = Boolean(logoUrl) && isSafeBuilderImageUrl(logoUrl) && logoUrl.startsWith("https://");
  const name = (
    <>
      {showLogo ? (
        <BuilderRemoteImage
          url={logoUrl}
          alt={chrome.title}
          variant="logo"
        />
      ) : null}
      <span className="truncate text-sm font-semibold">{chrome.title}</span>
    </>
  );

  return (
    <header
      className={cn("border-b px-4 py-3", dark && "[&_*]:text-inherit")}
      style={{
        backgroundColor: chrome.headerBackgroundColor || undefined,
        color: dark ? "#f8fafc" : undefined,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        {inert ? (
          <div className="flex min-w-0 items-center gap-3">{name}</div>
        ) : (
          <a href={homeHref} className="flex min-w-0 items-center gap-3">
            {name}
          </a>
        )}
        {links.length > 1 ? (
          <nav aria-label="Pages">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {links.map((page) => (
                <li key={page.href}>
                  {inert ? (
                    <span
                      className={cn(
                        page.current && "font-medium",
                      )}
                    >
                      {page.label}
                    </span>
                  ) : (
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
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export function BuilderSiteFooter({ chrome }: { chrome: ResolvedBuilderChrome }) {
  if (!chrome.showFooter) return null;
  const dark = isDarkBuilderColor(chrome.footerBackgroundColor);
  return (
    <footer
      className={cn("border-t px-4 py-6", dark && "[&_*]:text-inherit")}
      style={{
        backgroundColor: chrome.footerBackgroundColor || undefined,
        color: dark ? "#f8fafc" : undefined,
      }}
    >
      <p className="mx-auto max-w-6xl text-sm opacity-80">{chrome.footerText}</p>
    </footer>
  );
}
