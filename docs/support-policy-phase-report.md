# Support / policy layer and PDP guarantee

Implemented September 18, 2026 on `codex/sendler-finish`. No theme publication, main merge, Admin resource creation, or payment/subscription changes.

## Delivered

- FAQ with native keyboard-accessible disclosures and approved shipping/returns answers.
- Shipping and Returns templates backed by one editable policy section. Content follows the approved US-only/free-shipping, delivery-date guarantee, physical return, customer-paid satisfaction return shipping and fulfillment-error rules.
- Contact page with support@getsendler.com and Shopify's native contact form. Order number is optional; email and message are required.
- Compact guarantee below the main PDP purchase form, anchored to a small guarantee section after product details in the default product template. Gallery, product data and sticky Add to Cart code are unchanged.
- Footer fallback groups: Shop; Find My Essentials / Why Sendler; FAQ / Contact / Shipping Policy / Returns & Refunds. An assigned menu takes precedence. Legal fallbacks use only existing Shopify policy objects. Broken footer apostrophe corrected.

## Exact files

Created:

- sections/sendler-faq.liquid
- sections/sendler-policy.liquid
- sections/sendler-contact.liquid
- sections/sendler-product-guarantee.liquid
- templates/page.faq.json
- templates/page.shipping-policy.json
- templates/page.refund-returns.json
- templates/page.contact.json
- docs/support-policy-phase-report.md

Modified:

- sections/sendler-product-hero.liquid
- templates/product.json
- sections/sendler-footer.liquid
- sections/footer-group.json

## Development previews

The Contact page exists. FAQ, Shipping and Returns were absent from the storefront sitemap/search; hidden Admin drafts were not inspected. A template does not create a Page resource, and `?view=` cannot make a missing page exist.

Working previews using the existing Contact resource:

- http://127.0.0.1:9292/pages/contact?view=faq
- http://127.0.0.1:9292/pages/contact?view=shipping-policy
- http://127.0.0.1:9292/pages/contact?view=refund-returns
- http://127.0.0.1:9292/pages/contact?view=contact
- http://127.0.0.1:9292/products/omega-3-epa-dha

The development footer uses these temporary alternate-template destinations when a target Page resource is missing. When resources exist it uses their own URLs plus the appropriate view parameter. Active themes use canonical Page URLs; unavailable Page links are omitted rather than becoming dead links. The PDP policy link follows the same approach, with support email as the non-development fallback if Returns is unavailable.

After the owner creates the missing Page resources, test the intended development URLs:

- /pages/faq?view=faq
- /pages/shipping-policy?view=shipping-policy
- /pages/refund-returns?view=refund-returns
- /pages/contact?view=contact

No default-page workaround was added. Unpublished templates may not appear in the Admin assignment dropdown.

## Owner Admin steps

1. In Online Store > Pages, check for existing drafts before creating anything. Preserve existing handles. Create FAQ (`faq`), Shipping Policy (`shipping-policy`), and Returns & Refunds (`refund-returns`) if absent. Reuse Contact (`contact`) and rename its title to Contact SENDLER if desired. These templates supply the visible copy, so Page body content can stay empty.
2. For development, retain the current template assignment if the new choices are unavailable. Test using the alternate-template URLs above. Creating or making pages visible affects store resources independently of theme publication; coordinate visibility with launch.
3. At the separately approved launch, ensure the final theme includes these changes. After that theme becomes active, open each Page, choose its Theme template and Save:

   | Page / handle | Template choice (suffix) |
   | --- | --- |
   | FAQ / faq | faq |
   | Shipping Policy / shipping-policy | shipping-policy |
   | Returns & Refunds / refund-returns | refund-returns |
   | Contact SENDLER / contact | contact |

4. Ensure intended launch pages are visible and visit every canonical URL without `?view=`. Check all footer destinations and the PDP policy link. Products using the default product template receive the guarantee automatically; any future separate product templates must include the guarantee section too.
5. Footer menus are optional. In the theme editor's SENDLER footer, leave menus blank to use the configured fallback groups, or select merchant menus to override them. Preserve the Shop / SENDLER / Help fallback selection for each column.
6. Verify contact-form recipient settings and delivery to the support inbox with an owner-submitted message. This phase did not send a message or change mail configuration.

Theme-side Shipping/Returns pages do not populate Shopify Settings > Policies. Native policy records remain a separate owner task; no checkout configuration was changed.

## Validation and limits

- Shopify Theme Check: 75 files, zero offenses.
- Official Shopify AI Toolkit: all 12 changed theme files valid.
- All four support templates checked at 1440, 820 and 390px: no horizontal overflow, one H1 per page. Desktop policy content is 800px wide; mobile content stays within the viewport.
- Native FAQ disclosure opens with Enter. Contact fields have labels; keyboard Tab moves from name to email; order number is not required. Native form action is /contact#contact_form. Support links use the correct mailto destination.
- PDP checked at all three widths; guarantee anchor and Returns link work. Mobile sticky Add to Cart remains visible and separate from guarantee content. Only one lower guarantee section renders.
- No browser console errors observed on tested support/PDP pages. No old Sendler Naturals, Vitasource, Sheridan or obsolete email content in the new support templates.
- Merchant-menu precedence verified in Liquid control flow; no merchant Navigation menu was created or assigned during QA.
- Actual support-message delivery and Shopify's server-side form success/error responses were not exercised, because no message was submitted.
- Canonical new page routes require the owner resource creation/assignment steps. Development previews are verified; launch-route QA remains required after those steps.
- Privacy exists and is linked without changing its content. Its existing “My Store” wording is deferred. Terms was not returned by the store policy lookup and is not fabricated.
