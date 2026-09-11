# Historical Maps: Data and Accuracy

Last reviewed: 2026-09-10

The `/maps` feature is currently a local-data prototype. It does not read or write Supabase and makes no runtime request to a map-tile provider.

## Current data model

- Physical land geometry comes from the public-domain Natural Earth 1:50 million dataset through the bundled `world-atlas` package.
- All places and bodies of water are stored as longitude/latitude pairs in WGS84 (`EPSG:4326`) in `lib/historical-map-data.ts`.
- Political layers are discrete snapshots rather than a false claim of continuous year-by-year precision.
- Every territory includes a confidence level and a note. Generalized boundaries render with softened, dashed edges.
- The region selector changes the projection and viewport; it does not substitute modern national borders.
- Drag with a mouse or one finger to pan. Use the mouse wheel or the on-map `+` and `-` buttons to zoom, and use the reset button to return to the selected region's full extent.
- The map, layer controls, and historical-date slider are constrained to the browser viewport on standard screens so the page itself does not need to scroll.

## Accuracy limits

The first political polygons are generalized research scaffolds. They are suitable for testing the interface and data architecture, but they are not yet sufficiently sourced for an academic or definitive historical claim.

Pre-modern rule was often layered, seasonal, tributary, or contested. A sharp polygon can imply a modern kind of sovereignty that did not exist. Coastlines, river courses, names, and city locations can also change over long periods. The public UI therefore identifies the layers as interpretive and exposes confidence notes.

Before calling a snapshot verified:

1. Choose an exact date or explicitly documented date range.
2. Compare at least two reputable historical atlases or scholarly GIS sources.
3. Record the source, edition/version, page or dataset identifier, license, and retrieval date.
4. Trace or import boundaries in WGS84 GeoJSON without silently converting uncertainty into a hard line.
5. Have a subject-matter reviewer check names, dates, territorial status, and disputed areas.
6. Update the territory confidence and public note.

## Planned source path

- [Natural Earth](https://www.naturalearthdata.com/downloads/) for physical geography.
- [OpenHistoricalMap](https://www.openhistoricalmap.org/) for public-domain temporally tagged places and boundaries where coverage is adequate.
- [Pleiades](https://pleiades.stoa.org/) and the [Ancient World Mapping Center](https://awmc.unc.edu/) for ancient places and geography.
- Library or scholarly historical atlases for comparison and review.

The `historical-basemaps` project can be useful for comparison, but its own maintainers describe it as work in progress and require verification against other sources. Its GPL-licensed files have not been copied into this repository.

## Adding another snapshot

Add a new entry to `MAP_SNAPSHOTS` in `lib/historical-map-data.ts`. The year must be unique and snapshots must remain sorted. A territory polygon must use longitude/latitude coordinate pairs and close each ring by repeating its first coordinate at the end.

Run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

The map-data tests reject duplicate dates/IDs, invalid WGS84 coordinates, open polygon rings, and inverted landmark date ranges.
