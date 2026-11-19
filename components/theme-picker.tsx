'use client'

import * as React from 'react'
import { CheckIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SKINS, type Skin, type SkinPreview, type ThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

const MODES: { id: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { id: 'light', label: 'Light', Icon: SunIcon },
  { id: 'dark', label: 'Dark', Icon: MoonIcon },
  { id: 'system', label: 'System', Icon: MonitorIcon },
]

/** Header button that opens the mode switch and the skin gallery. */
export function ThemePicker() {
  const { mode, skin, resolved, setMode, setSkin } = useTheme()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Theme">
            <PaletteIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Theme</span>
          </Button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-[22rem] gap-4 p-4">
        <div className="flex flex-col gap-2">
          <h2 className="label-caps text-[10px] text-muted-foreground">Mode</h2>
          <div
            role="radiogroup"
            aria-label="Mode"
            className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
          >
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  mode === id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="label-caps text-[10px] text-muted-foreground">Timeline style</h2>
          <div role="radiogroup" aria-label="Timeline style" className="grid grid-cols-2 gap-2">
            {SKINS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={skin === item.id}
                onClick={() => setSkin(item.id)}
                className={cn(
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  skin === item.id
                    ? 'border-primary shadow-[0_0_0_1px_var(--primary)]'
                    : 'border-border hover:border-foreground/30',
                )}
              >
                <SkinSample skin={item} preview={item.preview[resolved]} />
                <span className="flex flex-col gap-0.5 px-2.5 py-2">
                  <span className="text-[13px] font-medium" style={{ fontFamily: item.font }}>
                    {item.name}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                {skin === item.id && (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * A miniature of the skin: three nodes joined by a line and a dashed branch,
 * drawn in the skin's own colours for the current mode.
 */
function SkinSample({ skin, preview }: { skin: Skin; preview: SkinPreview }) {
  const id = React.useId().replace(/:/g, '')
  const [a, b, c] = preview.colors
  const nodes: { x: number; y: number; color: string }[] = [
    { x: 26, y: 24, color: a },
    { x: 78, y: 24, color: b },
    { x: 126, y: 48, color: c },
  ]
  const dash = {
    ring: '1 5',
    double: '5 3.5',
    glass: '0.1 5',
    square: '6 3',
  }[skin.node]
  const cap = skin.node === 'square' ? 'butt' : 'round'

  return (
    <svg viewBox="0 0 152 68" className="block h-16 w-full" aria-hidden="true">
      <defs>
        <pattern id={`grid-${id}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke={preview.ink} strokeOpacity="0.13" strokeWidth="0.6" />
        </pattern>
        <filter id={`grain-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.1 0 0 0 0.16 0" />
        </filter>
        <radialGradient id={`glow-${id}`} cx="0.2" cy="0" r="0.9">
          <stop offset="0" stopColor={b} stopOpacity="0.35" />
          <stop offset="1" stopColor={b} stopOpacity="0" />
        </radialGradient>
        {nodes.map((node, index) => (
          <radialGradient key={index} id={`pane-${id}-${index}`} cx="0.5" cy="0.35" r="0.65">
            <stop offset="0" stopColor="white" stopOpacity="0.55" />
            <stop offset="0.45" stopColor={node.color} />
            <stop offset="1" stopColor={node.color} stopOpacity="0.75" />
          </radialGradient>
        ))}
      </defs>

      <rect width="152" height="68" fill={preview.background} />
      {preview.pattern === 'grid' && <rect width="152" height="68" fill={`url(#grid-${id})`} />}
      {preview.pattern === 'grain' && (
        <rect width="152" height="68" filter={`url(#grain-${id})`} opacity="0.8" />
      )}
      {preview.pattern === 'glow' && <rect width="152" height="68" fill={`url(#glow-${id})`} />}

      <path
        d="M26 24H78"
        stroke={a}
        strokeWidth={skin.node === 'square' ? 1.2 : 2}
        strokeOpacity="0.75"
        strokeLinecap={cap}
      />
      <path
        d="M78 24C102 24 102 48 126 48"
        fill="none"
        stroke={c}
        strokeWidth={skin.node === 'glass' ? 3 : 2}
        strokeDasharray={dash}
        strokeLinecap={cap}
        strokeOpacity="0.9"
      />

      {nodes.map((node, index) => {
        const r = 9
        if (skin.node === 'square') {
          return (
            <rect
              key={index}
              x={node.x - r}
              y={node.y - r}
              width={r * 2}
              height={r * 2}
              rx="1.5"
              fill={preview.card}
              stroke={node.color}
              strokeWidth="1.3"
            />
          )
        }
        if (skin.node === 'glass') {
          return (
            <g key={index}>
              <circle cx={node.x} cy={node.y} r={r + 3} fill={node.color} opacity="0.25" />
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={`url(#pane-${id}-${index})`}
                stroke="oklch(0.15 0.01 280)"
                strokeWidth="2"
              />
            </g>
          )
        }
        if (skin.node === 'double') {
          return (
            <g key={index}>
              <circle cx={node.x} cy={node.y} r={r} fill={preview.card} stroke={node.color} strokeWidth="1" />
              <circle cx={node.x} cy={node.y} r={r - 2.5} fill="none" stroke={node.color} strokeWidth="1" />
            </g>
          )
        }
        return (
          <circle
            key={index}
            cx={node.x}
            cy={node.y}
            r={r}
            fill={preview.card}
            stroke={node.color}
            strokeWidth="1.8"
          />
        )
      })}
    </svg>
  )
}
