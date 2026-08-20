import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildVoicePrompt, fallbackDraft, type VoiceDraftInput } from "./draft";

function input(overrides: Partial<VoiceDraftInput> = {}): VoiceDraftInput {
  return {
    businessName: "Harbor Workshops",
    description: "Hands-on classes for beginners.",
    targetCustomers: "Adults who want a first experience.",
    tone: "warm and practical",
    audience: "first-time guests",
    doSay: "what you will learn",
    dontSay: "guaranteed results",
    examples: [
      {
        title: "Welcome note",
        body: "Come as you are. We will walk through every step.",
        direction: "more_like_this",
      },
      {
        title: "Hard sell",
        body: "Buy now before this deal expires.",
        direction: "less_like_this",
      },
    ],
    purpose: "website_blurb",
    topic: "A weekend introductory class",
    ...overrides,
  };
}

describe("brand voice drafts", () => {
  it("puts approved examples in the prompt and keeps less-like-this as a warning", () => {
    const prompt = buildVoicePrompt(input());
    assert.match(prompt, /more like these approved examples/);
    assert.match(prompt, /Come as you are/);
    assert.match(prompt, /Avoid sounding like these examples/);
    assert.match(prompt, /Buy now before this deal expires/);
    assert.match(prompt, /Do not send email, publish to a website/);
  });

  it("writes a local draft without inventing a send or a Stripe charge", () => {
    const draft = fallbackDraft(input());
    assert.match(draft, /Harbor Workshops/);
    assert.match(draft, /Welcome note/);
    assert.match(draft, /Draft only/);
    assert.equal(draft.toLowerCase().includes("send this email"), false);
    assert.equal(draft.toLowerCase().includes("charge the card"), false);
  });

  it("does not hard-code a sailing business", () => {
    const draft = fallbackDraft(input());
    assert.equal(/ocean sailing|bunk|passage/i.test(draft), false);
  });
});
