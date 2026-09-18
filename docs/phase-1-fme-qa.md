# Phase 1: Find My Essentials

Branch: `codex/sendler-finish`

## Scope and changed files

- `sections/sendler-assessment.liquid`: preserve the existing questions, scoring thresholds, categories and design; add the missing Berberine safety override and consistent psyllium explanations; improve focus, selection semantics, progress, validation, mobile readability and reduced motion. Initialize each instance once and initialize replacement sections on Shopify editor reloads.
- `templates/page.find-my-essentials.json`: render the existing assessment as a dedicated page.
- `tests/sendler-assessment.test.cjs`: dependency-free tests executing the actual production section JavaScript in Node's VM. A test-only closure hook exposes functions; no hook is shipped and no duplicate scoring implementation exists. Small DOM doubles exercise UI handlers and rendering, supplemented by real-browser QA.
- `docs/phase-1-fme-qa.md`: verification evidence, preview instructions and remaining work.

No default-page fallback, localization changes, external dependencies, analytics, persistence, subscription work or Shopify Admin changes were introduced.

## Development rendering

The existing CLI is installed at `C:\Users\Stefan\AppData\Roaming\npm`. The restricted shell could not discover it; the normal host shell did. No CLI reinstall or PATH change was needed.

```powershell
shopify theme dev --store te41si-kg.myshopify.com --nodelete
```

The dedicated template was uploaded to the unpublished development theme and verified at:

`http://127.0.0.1:9292/pages/find-my-essentials?view=find-my-essentials`

The plain `/pages/find-my-essentials` URL was checked separately and currently still renders the default page title. The Shopify Page resource needs its `find-my-essentials` template assignment when that template is available for assignment through the owner's release workflow. Until then, use the explicit preview URL above. Do not publish the unfinished theme to make the dropdown available.

`sections/page.liquid` and navigation were not changed. The normal header link therefore continues to use the plain route; this assignment is an outstanding integration step, not a completed production launch.

## Rule changes and precedence

- Berberine now returns **Needs more context** for prescription-medication or relevant-medical-condition answers even without a metabolic-health goal. The existing already-taking override is preserved. Pregnancy is also covered by its rule, with the global pregnancy stop preventing all product results.
- Every positive psyllium explanation includes the approved food-first caveat. The generic positive path no longer says there is no obvious reason to consider it.
- All scores and thresholds remain unchanged.
- The existing effective precedence is preserved and tested: under-18/pregnancy suppress the whole recommendation list; existing use remains **Already covered**; specified medication/condition overrides prevent positive recommendations; ordinary scoring handles the remaining cases. Working per-product safety guards were retained rather than rewritten into a new engine.
- Magnesium, collagen and curcumin never exceed **Could be useful**. Berberine, CoQ10 and digestive enzymes receive no automatic positive recommendation.
- No email gate, AI integration, storage or health-answer transmission was added. This verifies the theme's assessment code; it is not an audit of store-level third-party pixels/apps.

## Automated verification

```powershell
node --test tests/sendler-assessment.test.cjs
shopify theme check
```

38 tests pass. Coverage includes:

- Personas A–O, including fish-derived omega-3 wording, vitamin D testing caveat and psyllium food-first wording.
- Threshold boundaries and result ceilings.
- Medication/medical-condition overrides for all six specified products, including Berberine without a metabolic-health goal.
- Already-taking overrides, pregnancy and under-18 global stops.
- Prefer-not-to-say and multivitamin notices.
- All five result categories, including **Probably unnecessary**.
- Unlimited goals, exclusive None/Prefer-not-to-say choices, validation, back/restart and all 13 questions.
- Focus, pressed state, progress, reduced-motion scrolling and idempotent theme-editor initialization.
- A source-level guard against adding network/storage/tracking APIs to FME.

The baseline Theme Check inspected 66 files with no offenses. After adding the dedicated template, Theme Check inspected 67 files with no offenses.

The Shopify developer toolkit's `validate_theme` also returned **VALID** for both changed theme files.

## Real-browser verification

Tested on the actual Shopify development storefront, not a static reconstruction:

| Viewport | Checks |
| --- | --- |
| 1440 × 1000 | Start screen, unanswered validation, full 13-question mixed persona, four simultaneous goals, results and long explanations. |
| 820 × 1100 | Start/questions/results, full medication persona, six context overrides, multivitamin notice and restart. |
| 390 × 844 | Start/questions/results, keyboard Space selection, retained focus/pressed state, back navigation, exclusive answers, skipped-safety notice, long explanations and a second complete run ending in the pregnancy stop. |

No horizontal page overflow at these sizes: document widths were 1425, 805 and 375 CSS pixels respectively (scrollbar excluded). Mobile options measured 335 × 61 pixels with 14px text; result explanations also use 14px text. The dark results-panel heading now inherits white text. No warning/error console entries were captured during these FME runs.

The existing homepage assessment was smoke-tested after the initialization change: one instance initialized, Start opened Question 1, focus moved to the question, and scrolling positioned the assessment near the top of the viewport rather than jumping to the top of the homepage.

Reduced-motion behavior and editor replacement initialization were exercised in automated tests; physical-device, screen-reader and live theme-editor interaction tests were not performed.

## Deferred Phase 2 findings

- `sections/sendler-why-no-buy.liquid` is empty despite being referenced by the Why SENDLER template.
- `sections/sendler-why-final-cta.liquid` exists but is absent from that template.
- Footer tagline has a garbled apostrophe; footer menu assignments are empty in this checkout.
- Broader CTA wiring, homepage placeholders, navigation, cart, PDP and other responsive cleanup remain outside Phase 1.

No live theme was published, no merge to main was made, and no payments, subscriptions, products, legal pages or Why SENDLER files were changed.
