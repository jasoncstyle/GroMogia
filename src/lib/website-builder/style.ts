export const BUILDER_HEADING_LEVELS = [
  { id: "h1", label: "Heading 1 (largest)" },
  { id: "h2", label: "Heading 2" },
  { id: "h3", label: "Heading 3" },
  { id: "p", label: "Standard text" },
] as const;

export type BuilderHeadingLevel = (typeof BUILDER_HEADING_LEVELS)[number]["id"];

export type BuilderTheme = {
  pageBackground: string
  textColor: string
  headingColor: string
  buttonBackground: string
  buttonText: string
};

export const EMPTY_BUILDER_THEME: BuilderTheme = {
  pageBackground: "",
  textColor: "",
  headingColor: "",
  buttonBackground: "",
  buttonText: "",
};

/** White page, dark grey type — used by every starter template. */
export const DEFAULT_BUILDER_THEME: BuilderTheme = {
  pageBackground: "#ffffff",
  textColor: "#3f3f46",
  headingColor: "#3f3f46",
  buttonBackground: "#3f3f46",
  buttonText: "#ffffff",
};

export const BUILDER_BACKGROUND_SWATCHES = [
  { label: "Default", value: "" },
  { label: "White", value: "#ffffff" },
  { label: "Off-white", value: "#fafafa" },
  { label: "Light gray", value: "#f4f4f5" },
  { label: "Silver", value: "#e4e4e7" },
  { label: "Cream", value: "#f7f3ea" },
  { label: "Sand", value: "#efe6d5" },
  { label: "Sky", value: "#e8f1f8" },
  { label: "Ice", value: "#eef2ff" },
  { label: "Mint", value: "#ecfdf5" },
  { label: "Blush", value: "#fce7f3" },
  { label: "Peach", value: "#ffedd5" },
  { label: "Lemon", value: "#fef9c3" },
  { label: "Navy", value: "#0f2744" },
  { label: "Royal", value: "#1e3a8a" },
  { label: "Teal", value: "#134e4a" },
  { label: "Forest", value: "#14352c" },
  { label: "Charcoal", value: "#18181b" },
  { label: "Slate", value: "#334155" },
  { label: "Black", value: "#111111" },
  { label: "Brick", value: "#6b2d2d" },
  { label: "Wine", value: "#7f1d1d" },
  { label: "Plum", value: "#581c87" },
] as const;

export const BUILDER_TEXT_SWATCHES = [
  { label: "Default", value: "" },
  { label: "Dark grey", value: "#3f3f46" },
  { label: "Near black", value: "#18181b" },
  { label: "Medium gray", value: "#52525b" },
  { label: "Light gray", value: "#a1a1aa" },
  { label: "White", value: "#ffffff" },
  { label: "Navy", value: "#0f2744" },
  { label: "Forest", value: "#14352c" },
  { label: "Brick", value: "#6b2d2d" },
  { label: "Cream", value: "#f7f3ea" },
] as const;

export function isBuilderHeadingLevel(value: string): value is BuilderHeadingLevel {
  return BUILDER_HEADING_LEVELS.some((level) => level.id === value);
}

export function parseBuilderColor(value: unknown): string {
  if (typeof value !== "string") return "";
  let trimmed = value.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("#")) trimmed = `#${trimmed}`;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    trimmed = `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return "";
  return trimmed.toLowerCase();
}

export function parseBuilderTheme(raw: unknown): BuilderTheme {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    pageBackground: parseBuilderColor(source.pageBackground),
    textColor: parseBuilderColor(source.textColor),
    headingColor: parseBuilderColor(source.headingColor),
    buttonBackground: parseBuilderColor(source.buttonBackground),
    buttonText: parseBuilderColor(source.buttonText),
  };
}

export function parseHeadingLevel(
  value: unknown,
  fallback: BuilderHeadingLevel,
): BuilderHeadingLevel {
  if (typeof value === "string" && isBuilderHeadingLevel(value)) return value;
  return fallback;
}

export function headingClassName(level: BuilderHeadingLevel, dense: boolean): string {
  if (level === "h1") {
    return dense ? "text-2xl font-semibold tracking-tight" : "text-4xl font-semibold tracking-tight";
  }
  if (level === "h2") {
    return dense ? "text-xl font-semibold tracking-tight" : "text-2xl font-semibold tracking-tight";
  }
  if (level === "h3") {
    return dense ? "text-base font-semibold tracking-tight" : "text-xl font-semibold tracking-tight";
  }
  return dense ? "text-sm leading-6" : "text-base leading-7";
}

export function isDarkBuilderColor(value: string): boolean {
  const color = parseBuilderColor(value);
  if (!color) return false;
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 140;
}

export function inheritRowBackgrounds(
  rowBackgrounds: string[],
  previousPageBackground: string,
  applyToAllRows: boolean,
): string[] {
  if (applyToAllRows) return rowBackgrounds.map(() => "");
  const previous = parseBuilderColor(previousPageBackground);
  return rowBackgrounds.map((color) => {
    const parsed = parseBuilderColor(color);
    return previous && parsed === previous ? "" : parsed;
  });
}

export function builderButtonColors(
  theme: BuilderTheme,
  darkRow: boolean,
): { backgroundColor: string; color: string } {
  const background = theme.buttonBackground || (darkRow ? "#ffffff" : "#18181b");
  const color = theme.buttonText || (darkRow ? "#18181b" : "#ffffff");
  if (darkRow && isDarkBuilderColor(background)) {
    return { backgroundColor: "#ffffff", color: "#18181b" };
  }
  return { backgroundColor: background, color };
}
