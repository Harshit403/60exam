# Task 2: SEO Structured Data (JSON-LD)

## Summary
Added comprehensive JSON-LD structured data and enhanced SEO meta tags to the
MISSION CS TEST SERIES landing page for richer search-engine results (rich
results for Organization, SiteLinks search box, Breadcrumbs, Courses, FAQ, and
Reviews/AggregateRating).

## Files Modified
1. **Modified**: `/home/z/my-project/src/app/layout.tsx`
   - Added `EducationalOrganization`, `WebSite` (with SearchAction), and
     `BreadcrumbList` JSON-LD, each as its own
     `<script type="application/ld+json">` rendered server-side via a small
     `JsonLd` helper component (so crawlers see them in the initial HTML).
   - Entities are linked with stable `@id` anchors
     (`/#organization`, `/#website`, `/#breadcrumb`).
   - Enhanced `metadata`: added `metadataBase`, `alternates.canonical`,
     `robots` (with googleBot directives), expanded `keywords`, `creator`,
     `publisher`, `applicationName`, `category`, OpenGraph `locale`/`images`
     (1200×630 placeholder `og-image.png`), Twitter `summary_large_image`
     image + creator.
2. **Modified**: `/home/z/my-project/src/components/landing/LandingPage.tsx`
   - Added `useMemo` import + a module-level `SITE_URL` constant.
   - Added a single `@graph` JSON-LD script (client-rendered, recomputed when
     reviews load) containing:
     - **3 Course** nodes (CSEET / CS Executive / CS Professional) with
       `name`, `description`, `url`, `inLanguage`, `educationalLevel`,
       `provider` (referencing `#organization`), and `hasCourseInstance`
       (online mode, instructor, workload).
     - **FAQPage** node built from the existing `faqItems` array.
     - **Service** node (`#service`) carrying an `aggregateRating`
       (computed from live reviews, fallback to the static marquee reviews so
       it is never empty) and up to 8 `Review` items with `author`,
       `reviewRating`, `reviewBody`, optional `datePublished` and
       `itemReviewed` course.
   - The `@graph` references the same `#organization` `@id` as the layout so
     all entities resolve to one Organization across the document.

## Hydration / Safety Notes
- `LandingPage` is a client component and only mounts after `useIsClient`
  becomes true (page.tsx returns a loading skeleton on the server), so its
  JSON-LD is injected client-side. The layout's JSON-LD (Organization,
  WebSite, Breadcrumb) is server-rendered and present in the initial HTML.
- `useMemo` builds the JSON-LD from `reviews.length > 0 ? reviews : marqueeReviews`,
  guaranteeing deterministic, non-empty output on the first client render (no
  hydration mismatch). It updates automatically once reviews fetch resolves.
- `datePublished` is only emitted when `createdAt` parses to a valid date
  (guards against `new Date('')` throwing on `toISOString`).
- All JSON-LD is serialized with `JSON.stringify` and injected via
  `dangerouslySetInnerHTML` inside a single `<script type="application/ld+json">`
  per location.

## Verification
- `bun run lint` → passes cleanly (no warnings/errors).
- `dev.log` shows `✓ Compiled in 2.3s` after the edits with no compile errors
  and no references to `layout.tsx` / `LandingPage.tsx` in error output.
- (localhost:3000 was not reachable from the shell sandbox; compilation +
  lint are the verification signals used.)

## Placeholder URLs Used
- `https://missioncstestseries.com` (canonical site URL)
- `https://missioncstestseries.com/logo.png` (organization logo)
- `https://missioncstestseries.com/og-image.png` (OpenGraph/Twitter image)
- `sameAs`: Instagram, YouTube, LinkedIn handles for `missioncs`
