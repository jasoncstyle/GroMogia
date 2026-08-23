import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { extractWebsitePage } from "./website-discover";
import {
  classifyWebsitePage,
  discoveredPageFromExtract,
  groupWebsitePages,
  mergeDiscoveredPages,
  pageLabel,
  suggestImportant,
} from "./website-pages";

describe("website page checklist", () => {
  it("classifies home, program, calendar, event, legal, and third-party pages", () => {
    const origin = "https://www.example.com";
    assert.equal(classifyWebsitePage(`${origin}/`, true, origin), "home");
    assert.equal(classifyWebsitePage(`${origin}/workshops`, false, origin), "program");
    assert.equal(
      classifyWebsitePage(`${origin}/training-programs/coastal-training`, false, origin),
      "program",
    );
    assert.equal(
      classifyWebsitePage(`${origin}/calendar-book-now`, false, origin),
      "calendar",
    );
    assert.equal(
      classifyWebsitePage(`${origin}/events/abc123xyz`, false, origin),
      "event",
    );
    assert.equal(classifyWebsitePage(`${origin}/about`, false, origin), "legal");
    assert.equal(classifyWebsitePage(`${origin}/faq`, false, origin), "legal");
    assert.equal(classifyWebsitePage(`${origin}/photos`, false, origin), "other");
    assert.equal(
      classifyWebsitePage("https://books.example.com/widget", false, origin),
      "third_party",
    );
  });

  it("pre-checks useful pages and leaves About unchecked", () => {
    assert.equal(suggestImportant("home"), true);
    assert.equal(suggestImportant("program"), true);
    assert.equal(suggestImportant("calendar"), true);
    assert.equal(suggestImportant("event"), true);
    assert.equal(suggestImportant("third_party"), true);
    assert.equal(suggestImportant("legal"), false);
    assert.equal(suggestImportant("other"), false);
  });

  it("uses a plain name from the title or the path", () => {
    assert.equal(
      pageLabel("https://www.example.com/", "Harbor Skills | Learn with us", "home"),
      "Harbor Skills",
    );
    assert.equal(
      pageLabel(
        "https://www.example.com/workshops",
        "Weekend Workshop",
        "program",
      ),
      "Weekend Workshop",
    );
    assert.equal(
      pageLabel("https://www.example.com/events/saturday-session", "", "event"),
      "Saturday Session",
    );
  });

  it("keeps the owner's check when the same page is found again", () => {
    const incoming = discoveredPageFromExtract(
      extractWebsitePage(
        "https://www.example.com/about",
        `<html><head><title>About</title></head><body><h1>About</h1></body></html>`,
      ),
      "https://www.example.com",
    );
    assert.equal(incoming.important, false);
    const { toUpdate } = mergeDiscoveredPages(
      [{ ...incoming, important: true, label: "Our story" }],
      [incoming],
    );
    assert.equal(toUpdate[0]?.important, true);
    assert.equal(toUpdate[0]?.label, incoming.label);

    const { toUpdate: manualKept } = mergeDiscoveredPages(
      [{ ...incoming, important: true, source: "manual", label: "Our story" }],
      [incoming],
    );
    assert.equal(manualKept[0]?.label, "Our story");
    assert.equal(manualKept[0]?.important, true);
  });

  it("sets the suggested check only on newly found pages", () => {
    const home = discoveredPageFromExtract(
      extractWebsitePage(
        "https://www.example.com/",
        `<html><head><title>Harbor Skills</title></head><body></body></html>`,
      ),
      "https://www.example.com",
    );
    const { toInsert } = mergeDiscoveredPages([], [home]);
    assert.equal(toInsert[0]?.important, true);
    assert.equal(toInsert[0]?.pageGroup, "home");
  });

  it("groups event pages under Calendar instead of listing them on top", () => {
    const groups = groupWebsitePages([
      { pageGroup: "home", label: "Harbor Skills", url: "https://www.example.com/" },
      {
        pageGroup: "calendar",
        label: "Calendar",
        url: "https://www.example.com/calendar-book-now",
      },
      {
        pageGroup: "event",
        label: "Saturday Session",
        url: "https://www.example.com/events/abc123xyz",
      },
      {
        pageGroup: "event",
        label: "Weekday Session",
        url: "https://www.example.com/events/def456uvw",
      },
      { pageGroup: "legal", label: "About", url: "https://www.example.com/about" },
    ]);
    assert.deepEqual(
      groups.map((group) => group.id),
      ["home", "calendar", "legal"],
    );
    const calendar = groups.find((group) => group.id === "calendar");
    assert.equal(calendar?.pages.length, 1);
    assert.equal(calendar?.nested?.heading, "Event pages");
    assert.equal(calendar?.nested?.pages.length, 2);
  });

  it("does not bake industry-specific words into the page checklist", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/growth/website-pages.ts"),
      "utf8",
    );
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
