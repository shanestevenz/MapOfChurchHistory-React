/**
 * Performance budgets for the timeline, checked by `npm run test:perf`
 * against a production build.
 *
 * These are targets, not snapshots of today's numbers: a budget that fails
 * points at a real problem to fix (see the notes), not a test to loosen.
 * Change a budget only on purpose, with a reason next to it.
 *
 * "Mid-range phone" runs throttle the CPU 4x, a common stand-in for a
 * mid-tier mobile device. Timings come from a local production server, so
 * they measure the app, not the network.
 */
export const BUDGETS = {
  /** Compressed bytes transferred on first load, by resource type. */
  transferKB: {
    script: 450,
    stylesheet: 40,
    font: 150,
    /** Was 679 KB when the 732x714 site-logo.png was shown at 36x36; now a 72px WebP. */
    image: 100,
    total: 900,
  },

  /** Local production server, 20 sequential requests. */
  serverMs: {
    pageP95: 300,
    timelineApiP95: 150,
  },

  /** Core Web Vitals-style load metrics. TBT counts main-thread blocking after first paint. */
  loadFast: { fcpMs: 1_500, lcpMs: 2_500, cls: 0.1, tbtMs: 300 },
  /** Was TBT ~910 ms with a 324 ms task: hydrating ~2,000 DOM nodes at once. */
  loadMidPhone: { fcpMs: 2_500, lcpMs: 4_000, cls: 0.1, tbtMs: 600 },

  /**
   * Frame times while wheel-zooming and drag-panning. p95 is the 95th
   * percentile frame; jank is the share of frames over 50 ms.
   */
  zoomFast: { p95FrameMs: 50, jankShare: 0.05 },
  /**
   * Was p95 ~417 ms (~10 fps) when CSS `zoom` re-laid out the whole canvas
   * every frame and every node re-rendered. Zoom frames now use a transform
   * and leave the canvas content alone. Reported only (desktop is the target).
   */
  zoomMidPhone: { p95FrameMs: 100, jankShare: 0.25 },
  panFast: { p95FrameMs: 50, jankShare: 0.05 },
  panMidPhone: { p95FrameMs: 100, jankShare: 0.15 },

  /** Clicking a node until its detail panel is visible. */
  openEventFastMs: 300,
  openEventMidPhoneMs: 1_000,
} as const
