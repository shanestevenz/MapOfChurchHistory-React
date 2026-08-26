# Map of Church History Website Architecture

## Overview

Map of Church History is a client-side Next.js and React application that presents church history as an interactive branching timeline.

The current implementation uses:

- Seed data bundled with the application
- React context for shared timeline state
- `localStorage` for event and suggestion persistence
- `sessionStorage` for the local editor-mode flag
- No backend, database, user accounts, or server-side authorization

The current editor is therefore suitable for a local demo or curator workflow in one browser. It is not production-grade authentication or multi-user content management.

## Application Flow

1. [app/layout.tsx](../app/layout.tsx) defines the document metadata, dark theme, fonts, viewport settings, toast notifications, and production-only Vercel Analytics.
2. [app/page.tsx](../app/page.tsx) mounts `TimelineProvider` around `TimelinePage`.
3. [components/timeline-provider.tsx](../components/timeline-provider.tsx) loads the seed timeline and restores any browser-persisted events, suggestions, and editor status after mount.
4. [components/timeline-page.tsx](../components/timeline-page.tsx) coordinates the header, graph, filters, dialogs, detail panel, editor, and suggestion queue.
5. The graph derives its layout from the current events and renders the visual timeline.

## Shared State

[components/timeline-provider.tsx](../components/timeline-provider.tsx) exposes the main `TimelineContext` and `useTimeline` hook.

The context contains:

- `events`: the current timeline events
- `isAdmin`: whether local editor mode is active
- `hydrated`: whether browser storage has been read
- `hasLocalEdits`: whether the published seed has been changed locally
- `suggestions`: submitted community suggestions
- `pendingCount`: number of suggestions awaiting review
- Event mutation functions
- Admin sign-in and sign-out functions
- Suggestion submission and review functions

Initial event data comes from `SEED_EVENTS` in [lib/timeline-data.ts](../lib/timeline-data.ts). The data has version `1`.

### Browser Persistence

Events are saved under the `church-timeline/v1` `localStorage` key as:

```json
{
  "version": 1,
  "events": []
}
```

Suggestions are saved under `church-timeline/suggestions` in `localStorage`.

Editor status is saved under `church-timeline/admin` in `sessionStorage`, so it lasts for the browser session but is not a server session.

If storage is unavailable or contains invalid data, the application falls back to the seed timeline and keeps changes in memory when possible.

## Timeline Rendering

[components/timeline-graph.tsx](../components/timeline-graph.tsx) renders the interactive timeline canvas.

[lib/timeline-layout.ts](../lib/timeline-layout.ts) calculates the visual geometry:

- Each tradition occupies a horizontal lane.
- Events are ordered primarily by year.
- A child is kept after its parent when the parent exists.
- Each event receives its own horizontal column.
- Parent references become SVG connection paths.
- Cross-lane connections are drawn as branch edges.
- Historical era bars are calculated from event years.
- Hidden traditions are removed from the visible layout and their lanes collapse.

Users can:

- Click a node to open its quick event dialog.
- Open the full detail panel with the `Learn more` action.
- Filter traditions through the legend.
- Zoom with the mouse wheel.
- Pan with middle-button dragging.
- Use the zoom controls to adjust the scale.

The timeline event model is defined in [lib/timeline-types.ts](../lib/timeline-types.ts). Each event can contain:

- ID and numeric year
- Human-readable date label
- Title, summary, and full detail
- Tradition and event kind
- Parent event IDs
- Key figures
- External links
- A Lucide icon or an uploaded image

## Event Exploration

[components/event-dialog.tsx](../components/event-dialog.tsx) shows a concise event view containing the icon, date, title, summary, tradition, and key figures.

[components/event-detail-panel.tsx](../components/event-detail-panel.tsx) shows the long-form view containing:

- Full description paragraphs
- Parent events and child events
- Navigation between connected events
- Key figures
- External reading links
- A visitor suggestion action

## Current Admin Privileges

Admin access is implemented as a local UI gate.

### Sign-In

[components/admin-bar.tsx](../components/admin-bar.tsx) provides the editor sign-in dialog. The passcode is hardcoded in [components/timeline-provider.tsx](../components/timeline-provider.tsx) as:

```text
ecclesia
```

On success, the provider sets `isAdmin` to `true` and stores the string `true` in `sessionStorage`.

Sign-out clears both the React state and the session-storage flag.

### Admin Actions

When editor mode is active, the admin bar provides:

- Add event
- Review suggestions
- Export the current timeline as JSON
- Reset local changes to the seed timeline
- Sign out

The timeline also shows edit controls on nodes, and the event dialog changes from `Suggest an edit` to `Edit event` for admins.

### Event Editing

[components/event-editor.tsx](../components/event-editor.tsx) allows an admin to create or edit the complete event model.

Admins can change:

- Title
- Numeric year used for ordering
- Display date label
- Tradition or branch
- Event kind: milestone, council, division, or reunion
- Summary
- Full description
- Key figures
- Lucide icon
- Uploaded image icon
- Parent events
- External links

New IDs are generated by slugifying the title. New events are rejected when the generated ID already exists. Basic validation requires a title, date label, and finite numeric year.

Uploaded images must be image files smaller than 400 KB and are stored as data URLs inside browser storage.

Deleting an event also removes its ID from the `parents` arrays of remaining events so dangling parent references are avoided.

Resetting restores `SEED_EVENTS`, removes the saved event data, and clears the local-edits indicator. Suggestions are not removed by the reset action.

Export creates a `church-timeline.json` download containing the current event list and data version. Suggestions are not included in the export.

## Suggest Edit Workflow

Visitors can propose changes through [components/suggest-edit-dialog.tsx](../components/suggest-edit-dialog.tsx).

A visitor may suggest changes to only these fields:

- Title
- Date label
- Summary
- Full description

The visitor may also provide:

- An optional supporting source URL and title
- A contributor name, defaulting to `Anonymous`
- A required edit summary explaining the proposed change

Only fields with non-empty values that differ from the current event are included in the suggestion. A source alone is also enough to submit a suggestion.

Each suggestion receives:

- A generated ID
- The target event ID
- A snapshot of the event title
- Contributor name
- Edit summary
- Before-and-after values for changed fields
- Optional source citation
- Creation timestamp
- `pending` status

Nothing is changed on the timeline when the suggestion is submitted.

## Suggestion Review

[components/suggestion-queue.tsx](../components/suggestion-queue.tsx) displays the review sheet available from the editor bar.

The queue has two views:

- `Pending`: suggestions awaiting a decision
- `Reviewed`: approved and declined suggestions retained as history

### Approving a Suggestion

When an admin approves a suggestion:

1. The provider finds the target event by ID.
2. Each submitted text change replaces the corresponding event field.
3. An optional source is appended to the event links unless the same URL is already present.
4. The updated event list is persisted to `localStorage`.
5. The suggestion status becomes `approved` and receives a review timestamp.

If the target event no longer exists, the suggestion is still marked approved, but no event is changed.

### Declining a Suggestion

Declining changes only the suggestion record:

- Status becomes `declined`
- A review timestamp is added
- Timeline events remain unchanged

## Security and Persistence Limitations

The current admin implementation is not real authorization but serves as a proof of concept.


## Current Content Management Model

A production implementation would need a server-backed identity system, role-based authorization, database persistence, shared suggestion records, conflict handling, and server-side validation before these features could be considered secure or multi-user.
