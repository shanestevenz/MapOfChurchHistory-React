import * as React from 'react'

/** A decade such as "1960s" (also inside ranges like "1730s–1740s"). */
const DECADE = /(\d+0s)\b/

/**
 * Renders a date label with decades written as "1960’s". Date labels are
 * often set in small caps (`label-caps` uppercases them), which turned
 * "1960s" into "1960S"; the apostrophe separates the suffix and the "s" is
 * kept lowercase even inside uppercased text.
 */
export function DateText({ value }: { value: string }) {
  const parts = value.split(DECADE)
  if (parts.length === 1) return value
  return (
    <>
      {parts.map((part, index) =>
        DECADE.test(part) && /^\d+0s$/.test(part) ? (
          <React.Fragment key={index}>
            {part.slice(0, -1)}’<span className="normal-case">s</span>
          </React.Fragment>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** The same decade style for plain strings, e.g. tooltips. */
export function formatDecades(value: string): string {
  return value.replace(/(\d+0)s\b/g, '$1’s')
}
