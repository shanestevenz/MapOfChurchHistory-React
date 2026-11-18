/**
 * Site themes: a light/dark mode plus a timeline "skin". Both are applied as
 * attributes on <html> (`.dark` and `data-skin`), and everything that changes
 * between skins lives in CSS (app/themes.css), so switching never re-renders
 * the timeline.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type SkinId = 'modern' | 'manuscript' | 'glass' | 'blueprint'

export const MODE_KEY = 'theme-mode:v1'
export const SKIN_KEY = 'theme-skin:v1'
export const DEFAULT_MODE: ThemeMode = 'dark'
export const DEFAULT_SKIN: SkinId = 'modern'

/** Colours for the picker's little preview, per mode. */
export interface SkinPreview {
  background: string
  card: string
  ink: string
  line: string
  /** Three tradition colours, for the sample nodes. */
  colors: [string, string, string]
  /** Optional backdrop pattern drawn behind the sample. */
  pattern?: 'grid' | 'grain' | 'glow'
}

export interface Skin {
  id: SkinId
  name: string
  description: string
  node: 'ring' | 'double' | 'glass' | 'square'
  font: string
  preview: { light: SkinPreview; dark: SkinPreview }
}

export const SKINS: Skin[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean and quiet, with gold accents.',
    node: 'ring',
    font: 'var(--font-garamond), serif',
    preview: {
      dark: {
        background: 'oklch(0.17 0.022 262)',
        card: 'oklch(0.215 0.024 262)',
        ink: 'oklch(0.94 0.012 85)',
        line: 'oklch(0.8 0.128 84)',
        colors: ['oklch(0.8 0.128 84)', 'oklch(0.66 0.135 249)', 'oklch(0.63 0.178 21)'],
      },
      light: {
        background: 'oklch(0.975 0.006 85)',
        card: 'oklch(0.995 0.004 85)',
        ink: 'oklch(0.24 0.03 262)',
        line: 'oklch(0.66 0.14 75)',
        colors: ['oklch(0.66 0.14 75)', 'oklch(0.52 0.15 252)', 'oklch(0.53 0.19 24)'],
      },
    },
  },
  {
    id: 'glass',
    name: 'Stained Glass',
    description: 'Jewel-toned roundels set in lead.',
    node: 'glass',
    font: 'var(--font-garamond), serif',
    preview: {
      dark: {
        background: 'oklch(0.14 0.03 280)',
        card: 'oklch(0.18 0.035 280)',
        ink: 'oklch(0.95 0.01 90)',
        line: 'oklch(0.83 0.16 88)',
        colors: ['oklch(0.83 0.16 88)', 'oklch(0.62 0.2 262)', 'oklch(0.6 0.22 22)'],
        pattern: 'glow',
      },
      light: {
        background: 'oklch(0.94 0.008 260)',
        card: 'oklch(0.975 0.006 260)',
        ink: 'oklch(0.22 0.03 280)',
        line: 'oklch(0.5 0.18 262)',
        colors: ['oklch(0.72 0.16 80)', 'oklch(0.5 0.2 262)', 'oklch(0.52 0.21 22)'],
        pattern: 'glow',
      },
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'A drafting-table plan of the branches.',
    node: 'square',
    font: 'ui-monospace, monospace',
    preview: {
      dark: {
        background: 'oklch(0.37 0.11 258)',
        card: 'oklch(0.41 0.11 258)',
        ink: 'oklch(0.97 0.01 240)',
        line: 'oklch(0.92 0.1 95)',
        colors: ['oklch(0.92 0.12 95)', 'oklch(0.88 0.09 195)', 'oklch(0.8 0.13 25)'],
        pattern: 'grid',
      },
      light: {
        background: 'oklch(0.975 0.01 240)',
        card: 'oklch(0.99 0.005 240)',
        ink: 'oklch(0.32 0.09 258)',
        line: 'oklch(0.45 0.15 258)',
        colors: ['oklch(0.65 0.13 80)', 'oklch(0.5 0.15 255)', 'oklch(0.55 0.19 25)'],
        pattern: 'grid',
      },
    },
  },
]

/**
 * Skins that are built but not offered. Their styles (app/themes.css) and
 * assets (public/skins/<id>/) stay in place; to bring one back, move it into
 * SKINS above. Shelved skins can't be selected, and a saved choice of one
 * falls back to the default.
 *
 * Manuscript: wax-seal nodes (red crimson wax around the tradition colour),
 * scroll titles, ribbon flags, muted pigment palette, ruled lanes, indigo
 * night mode, and the Ebstorf Map as a faint background.
 */
export const SHELVED_SKINS: Skin[] = [
  {
    id: 'manuscript',
    name: 'Manuscript',
    description: 'Ink on parchment, like an illuminated chronicle.',
    node: 'double',
    font: 'var(--font-fell), serif',
    preview: {
      light: {
        background: 'oklch(0.925 0.04 84)',
        card: 'oklch(0.955 0.032 86)',
        ink: 'oklch(0.3 0.045 55)',
        line: 'oklch(0.55 0.17 32)',
        colors: ['oklch(0.62 0.12 78)', 'oklch(0.45 0.12 262)', 'oklch(0.52 0.17 30)'],
        pattern: 'grain',
      },
      dark: {
        background: 'oklch(0.21 0.026 55)',
        card: 'oklch(0.25 0.03 58)',
        ink: 'oklch(0.88 0.045 85)',
        line: 'oklch(0.78 0.13 82)',
        colors: ['oklch(0.78 0.12 82)', 'oklch(0.66 0.12 255)', 'oklch(0.65 0.17 32)'],
        pattern: 'grain',
      },
    },
  },
]

export const SKIN_IDS = SKINS.map((skin) => skin.id)

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as string[]).includes(value)
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * Runs in <head> before the page paints, so a saved theme never flashes the
 * default first. Kept dependency-free: it is inlined as a string.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(SKIN_KEY)});
var m=localStorage.getItem(${JSON.stringify(MODE_KEY)});
if(${JSON.stringify(SKIN_IDS)}.indexOf(s)<0)s=${JSON.stringify(DEFAULT_SKIN)};
if(m!=='light'&&m!=='dark'&&m!=='system')m=${JSON.stringify(DEFAULT_MODE)};
var d=m==='system'?matchMedia('(prefers-color-scheme: dark)').matches:m==='dark';
var r=document.documentElement;r.setAttribute('data-skin',s);
r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';
}catch(e){}})()`
