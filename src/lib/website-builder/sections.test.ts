import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BUILDER_SECTION_HINTS,
  BUILDER_SECTION_TYPES,
  defaultBuilderSections,
  defaultContentForType,
  isSafeBuilderHref,
  isSafeBuilderImageUrl,
  parseBuilderSectionContent,
  parseItemLines,
  publishedSectionsOnly,
} from "./sections";

describe("website builder sections", () => {
  it("starts from brand copy without requiring a connected website", () => {
    const sections = defaultBuilderSections({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
    });
    assert.equal(sections.some((section) => section.type === "hero"), true);
    assert.equal(sections.some((section) => section.type === "lead"), true);
    assert.equal(
      /ocean sailing|myrtle beach/i.test(JSON.stringify(sections)),
      false,
    );
  });

  it("rejects unsafe button links and keeps mailto and tel", () => {
    assert.equal(isSafeBuilderHref("https://example.com/join"), true);
    assert.equal(isSafeBuilderHref("#lead"), true);
    assert.equal(isSafeBuilderHref("/contact"), true);
    assert.equal(isSafeBuilderHref("mailto:hello@example.com"), true);
    assert.equal(isSafeBuilderHref("tel:+15555550100"), true);
    assert.equal(isSafeBuilderHref("javascript:alert(1)"), false);
    assert.throws(() =>
      parseBuilderSectionContent("cta", {
        heading: "Go",
        buttonLabel: "Go",
        buttonHref: "javascript:alert(1)",
      }),
    );
  });

  it("accepts public https image URLs and rejects others", () => {
    assert.equal(isSafeBuilderImageUrl(""), true);
    assert.equal(
      isSafeBuilderImageUrl("https://images.example.com/hero.jpg"),
      true,
    );
    assert.equal(isSafeBuilderImageUrl("http://images.example.com/hero.jpg"), false);
    assert.equal(isSafeBuilderImageUrl("javascript:alert(1)"), false);
    assert.throws(() =>
      parseBuilderSectionContent("image_text", {
        heading: "Photo",
        imageUrl: "http://127.0.0.1/secret.png",
      }),
    );
  });

  it("parses feature lines without nested JSON", () => {
    const items = parseItemLines(
      "Clear next step | People know what to do.\n\nHuman follow-up | A person replies.",
    );
    assert.deepEqual(items, [
      { label: "Clear next step", detail: "People know what to do." },
      { label: "Human follow-up", detail: "A person replies." },
    ]);
    const features = parseBuilderSectionContent("features", {
      heading: "Expect",
      items: "One | First\nTwo | Second\nThree | Third\nFour | Fourth\nFive | Fifth\nSix | Sixth\nSeven | Seventh\nEight | Eighth\nNine | Dropped",
    });
    assert.equal(features.items?.split("\n").length, 8);
  });

  it("keeps extra section types generic", () => {
    const faq = defaultContentForType("faq", "Harbor Workshops");
    assert.match(faq.heading ?? "", /Questions/);
    assert.equal(/ocean sailing|bunk/i.test(JSON.stringify(faq)), false);
  });

  it("keeps contact body line breaks", () => {
    const contact = parseBuilderSectionContent("contact", {
      heading: "Contact",
      body: "Weekdays\nBy appointment",
    });
    assert.equal(contact.body, "Weekdays\nBy appointment");
  });

  it("explains every widget type in the add-widget popup", () => {
    for (const type of BUILDER_SECTION_TYPES) {
      assert.equal(BUILDER_SECTION_HINTS[type].length > 8, true);
    }
  });

  it("saves a text link and a heading size", () => {
    const text = parseBuilderSectionContent("text", {
      heading: "Visit us",
      body: "We are nearby.",
      headingLevel: "h3",
      linkLabel: "Get directions",
      linkHref: "https://maps.example.com/place",
    });
    assert.equal(text.headingLevel, "h3");
    assert.equal(text.linkLabel, "Get directions");
    assert.equal(text.linkHref, "https://maps.example.com/place");
  });

  it("accepts a YouTube widget and rejects a random video host", () => {
    const video = parseBuilderSectionContent("video", {
      heading: "Watch",
      videoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    });
    assert.equal(video.videoUrl?.includes("youtube.com"), true);
    assert.throws(() =>
      parseBuilderSectionContent("video", {
        heading: "Watch",
        videoUrl: "https://example.com/movie.mp4",
      }),
    );
  });

  it("keeps box colors on a widget", () => {
    const box = parseBuilderSectionContent("text", {
      heading: "Hello",
      backgroundColor: "#0f2744",
      textColor: "#ffffff",
    });
    assert.equal(box.backgroundColor, "#0f2744");
    assert.equal(box.textColor, "#ffffff");
  });

  it("hides unpublished sections from the live page", () => {
    const visible = publishedSectionsOnly([
      { visible: true, id: "a" },
      { visible: false, id: "b" },
    ]);
    assert.deepEqual(visible, [{ visible: true, id: "a" }]);
  });
});
