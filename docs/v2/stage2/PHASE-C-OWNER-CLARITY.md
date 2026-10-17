# Stage 2 Phase C — owner-clarity notes (later UX)

Ordinary owner screens must not show S1–S6 codes, provenance IDs, pack schemas, or Fact-Use Gate language. Phase C keeps the five-screen shell as-is.

Recorded for later refinement (not fixed in this phase):

1. Business still says this is “what GroovGro already knows — not a new Fact system.” That is true for the owner surface. The structured store is internal until a later Business screen is designed.
2. “How sure is this?” (`discoveryStatus`: not started / inferred / confirmed by the owner) looks like verification. It is **not** a Stage 2 fact status and must not be treated as VERIFIED.
3. The legacy Brain still has a numeric `confidence` column. It is not shown as a primary trust score on the new Fact model. Do not promote it onto Home / Grow / Business as a percentage complete or truth score.
4. When Facts later appear, use plain language: what GroovGro knows, what it is still checking, what needs the owner. Do not show SUPERSEDED, S2, or gate reasons raw.
5. Dual-read means a confirmed-looking Business form can still be UNKNOWN in the Fact store. A later UX pass should avoid implying those fields are already verified.
6. Related businesses, shared domains, and shared provider accounts must stay visually separate so owners do not think knowledge was merged.
