# Present-day branch endpoints

Last reviewed: 2026-09-10

The timeline generates one read-only **Present · 2026** endpoint for each living
tradition except the Undivided Church lane. That lane represents the historical
trunk and later ecumenical encounters, not a denomination that can be counted
today.

The endpoint definitions live in `lib/present-day-data.ts`. They are local UI
data and are not stored in Supabase. At runtime, each endpoint is connected to
the latest database event in its tradition. This means an administrator can add
a newer historical event without having to repair the endpoint's parent link.

## How the figures should be read

These lanes do not all represent the same kind of organization. Roman
Catholicism is one communion, while the Lutheran & Reformed and Anabaptist &
Baptist lanes combine multiple families. The interface therefore preserves the
scope reported by each source instead of adding incompatible figures together.

Membership may mean baptized members, enrolled members, adherents or an
ecumenical estimate. Every endpoint states its definition and reporting date.
It should never silently turn one of these measures into another.

## Principal sources

- World Council of Churches profiles for the Assyrian Church of the East,
  Oriental Orthodox churches and Eastern Orthodox population context.
- Vatican Catholic Church Statistics 2025, reporting data through June 2023.
- Lutheran World Federation and World Communion of Reformed Churches profiles.
- Baptist World Alliance 2025 membership announcement and Mennonite World
  Conference November 2025 statistics.
- Anglican Communion, World Methodist Council and World Assemblies of God
  Fellowship current profiles.

Direct links are attached to the appropriate endpoint in the application.

## Annual update checklist

Review these profiles at least once each year:

1. Open every source link and confirm that it still works.
2. Record the source's reporting year, which may be earlier than its publication
   year.
3. Update the membership figure without broadening its stated scope.
4. Confirm the geographic summary against the source's current regional data.
5. Replace resolved developments with current, durable issues; avoid a rolling
   news feed or unsourced controversy.
6. Update `PRESENT_DAY_YEAR`, every `dateLabel`, and every `asOf` field.
7. Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`.

