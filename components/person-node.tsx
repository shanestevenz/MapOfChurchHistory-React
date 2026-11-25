import * as React from 'react'
import type { EventIcon } from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

/**
 * People are drawn as a bust in an arched frame — the shape of an icon niche
 * or a lancet window — so they read as "a person" from far away, distinct
 * from the round event nodes. Width and height in canvas pixels; the height
 * matches NODE_SIZE so people line up with events on the lane.
 */
export const PERSON_NODE_WIDTH = 46

/** Arch: straight sides, a semicircular top, a flat base. viewBox 0 0 48 56. */
const FRAME = 'M3 54.5 V24 A21 21 0 0 1 45 24 V54.5 Z'
const HEAD = { cx: 24, cy: 23.5, r: 8.5 }
const SHOULDERS = 'M8.5 54.5 C8.5 43 15.5 36.5 24 36.5 C32.5 36.5 39.5 43 39.5 54.5 Z'

/**
 * The full node drawing. Colours come from CSS variables so each skin can
 * restyle it (app/themes.css, .tl-person): --person-bg fills the frame,
 * --person-figure the bust, and --node-color the outline.
 */
export function PersonFrame({
  icon,
  title,
  className,
}: {
  icon: EventIcon
  title: string
  className?: string
}) {
  const clipId = React.useId()
  return (
    <svg
      viewBox="0 0 48 56"
      className={cn('tl-person-svg block size-full overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={FRAME} />
        </clipPath>
      </defs>
      <path d={FRAME} className="tl-person-bg" />
      {icon.type === 'image' ? (
        <image
          href={icon.src}
          x="3"
          y="3"
          width="42"
          height="51.5"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        >
          <title>{`${title} portrait`}</title>
        </image>
      ) : (
        <g clipPath={`url(#${clipId})`} className="tl-person-figure">
          <circle {...HEAD} />
          <path d={SHOULDERS} />
        </g>
      )}
      <path d={FRAME} className="tl-person-frame" fill="none" />
    </svg>
  )
}

/** A small solid bust, for lists and search results. */
export function PersonGlyph({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="6 12 36 44"
      className={cn('fill-current', className)}
      style={style}
      aria-hidden="true"
    >
      <circle {...HEAD} />
      <path d={SHOULDERS} />
    </svg>
  )
}

/** The portrait at a fixed size, for dialog and panel headers. */
export function PersonPortrait({
  icon,
  title,
  color,
  className,
}: {
  icon: EventIcon
  title: string
  color: string
  className?: string
}) {
  return (
    <span
      className={cn('tl-person inline-block shrink-0', className)}
      style={{ '--node-color': color } as React.CSSProperties}
    >
      <PersonFrame icon={icon} title={title} />
    </span>
  )
}

/** Width of a group node: three arches, the outer two tucked behind. */
export const PERSON_GROUP_WIDTH = 74

/** One bust in an arch, at a given place and scale in the group drawing. */
function Arch({ transform, back }: { transform: string; back?: boolean }) {
  const clipId = React.useId()
  return (
    <g transform={transform} className={back ? 'tl-person-back' : undefined}>
      <defs>
        <clipPath id={clipId}>
          <path d={FRAME} />
        </clipPath>
      </defs>
      <path d={FRAME} className="tl-person-bg" />
      <g clipPath={`url(#${clipId})`} className="tl-person-figure">
        <circle {...HEAD} />
        <path d={SHOULDERS} />
      </g>
      <path d={FRAME} className="tl-person-frame" fill="none" />
    </g>
  )
}

/**
 * Several people drawn as one node: a front bust with two more behind it,
 * like a group portrait, so it still reads as people from far away. Styled
 * by the same .tl-person variables as a single person.
 */
export function PersonGroupFrame({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 56"
      className={cn('tl-person-svg block size-full overflow-visible', className)}
      aria-hidden="true"
    >
      <Arch transform="translate(1 12.5) scale(0.78)" back />
      <Arch transform="translate(41.5 12.5) scale(0.78)" back />
      <Arch transform="translate(16 0)" />
    </svg>
  )
}
