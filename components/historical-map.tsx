'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChurchIcon,
  HouseIcon,
  LandmarkIcon,
  Layers3Icon,
  MapIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  WavesIcon,
} from 'lucide-react'
import { geoArea, geoGraticule10, geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, GeoJsonProperties, Geometry, MultiPolygon, Polygon } from 'geojson'
import type { Topology } from 'topojson-specification'
import landTopologyJson from 'world-atlas/land-50m.json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  coordinateInRegion,
  formatHistoricalYear,
  MAP_LANDMARKS,
  MAP_REGIONS,
  MAP_SNAPSHOTS,
  type HistoricalLandmark,
  type HistoricalTerritory,
  type LandmarkKind,
  type MapRegionId,
} from '@/lib/historical-map-data'
import { cn } from '@/lib/utils'

const WIDTH = 1200
const HEIGHT = 680
const MIN_ZOOM = 1
const MAX_ZOOM = 6
const landTopology = landTopologyJson as unknown as Topology
const land = feature(landTopology, landTopology.objects.land)

const landmarkIcons: Record<LandmarkKind, React.ComponentType<{ className?: string }>> = {
  city: Building2Icon,
  town: HouseIcon,
  council: LandmarkIcon,
  sacred: ChurchIcon,
  water: WavesIcon,
}

const landmarkLabels: Record<LandmarkKind, string> = {
  city: 'Major city',
  town: 'Town',
  council: 'Council site',
  sacred: 'Historic church center',
  water: 'Body of water',
}

function territoryGeometry(territory: HistoricalTerritory): Feature<MultiPolygon> {
  return {
    type: 'Feature',
    properties: { id: territory.id, name: territory.name },
    geometry: {
      type: 'MultiPolygon',
      coordinates: territory.polygons.map((ring) => {
        const coordinates = ring.map(([longitude, latitude]) => [longitude, latitude])
        const polygon: Polygon = { type: 'Polygon', coordinates: [coordinates] }
        // Normalize mixed source winding so d3-geo never paints the spherical complement.
        return [geoArea(polygon) > Math.PI * 2 ? coordinates.reverse() : coordinates]
      }),
    },
  }
}

function boundsGeometry(bounds: readonly [number, number, number, number]): Feature<Polygon> {
  const [west, south, east, north] = bounds
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]],
    },
  }
}

export function HistoricalMap() {
  const [regionId, setRegionId] = React.useState<MapRegionId>('mediterranean')
  const [snapshotIndex, setSnapshotIndex] = React.useState(1)
  const [selectedLandmark, setSelectedLandmark] = React.useState<HistoricalLandmark | null>(null)
  const [selectedTerritory, setSelectedTerritory] = React.useState<HistoricalTerritory | null>(null)
  const [showTerritories, setShowTerritories] = React.useState(true)
  const [showPlaces, setShowPlaces] = React.useState(true)
  const [showWater, setShowWater] = React.useState(true)
  const [mapTransform, setMapTransform] = React.useState({ x: 0, y: 0, scale: 1 })
  const mapViewportRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const draggedRef = React.useRef(false)

  const region = MAP_REGIONS.find((item) => item.id === regionId) ?? MAP_REGIONS[0]
  const snapshot = MAP_SNAPSHOTS[snapshotIndex]

  const projection = React.useMemo(
    () => geoMercator().fitExtent([[28, 24], [WIDTH - 28, HEIGHT - 24]], boundsGeometry(region.bounds)),
    [region.bounds],
  )
  const path = React.useMemo(() => geoPath(projection), [projection])
  const landPath = path(land as Feature<Geometry, GeoJsonProperties>) ?? ''
  const graticulePath = path(geoGraticule10()) ?? ''

  const visibleLandmarks = MAP_LANDMARKS.filter((landmark) => {
    if (landmark.from > snapshot.year || (landmark.until && landmark.until < snapshot.year)) return false
    if (!coordinateInRegion(landmark.coordinate, region)) return false
    if (landmark.kind === 'water') return showWater
    if (!showPlaces) return false
    return region.id !== 'mediterranean' || landmark.importance >= 2
  })

  const selectSnapshot = (next: number) => {
    setSnapshotIndex(Math.max(0, Math.min(MAP_SNAPSHOTS.length - 1, next)))
    setSelectedLandmark(null)
    setSelectedTerritory(null)
  }

  const resetMapView = React.useCallback(() => {
    setMapTransform({ x: 0, y: 0, scale: 1 })
  }, [])

  React.useEffect(() => {
    resetMapView()
  }, [regionId, resetMapView])

  const constrainTransform = React.useCallback((x: number, y: number, scale: number) => {
    const horizontalLimit = WIDTH * (scale - 1) / 2 + WIDTH * 0.35
    const verticalLimit = HEIGHT * (scale - 1) / 2 + HEIGHT * 0.35
    return {
      x: Math.max(-horizontalLimit, Math.min(horizontalLimit, x)),
      y: Math.max(-verticalLimit, Math.min(verticalLimit, y)),
      scale,
    }
  }, [])

  const zoomMap = React.useCallback((nextScale: number, focusX = WIDTH / 2, focusY = HEIGHT / 2) => {
    setMapTransform((current) => {
      const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale))
      const ratio = scale / current.scale
      return constrainTransform(
        focusX - (focusX - current.x) * ratio,
        focusY - (focusY - current.y) * ratio,
        scale,
      )
    })
  }, [constrainTransform])

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const bounds = mapViewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const focusX = (event.clientX - bounds.left) * WIDTH / bounds.width
    const focusY = (event.clientY - bounds.top) * HEIGHT / bounds.height
    const factor = Math.exp(-event.deltaY * 0.0015)
    zoomMap(mapTransform.scale * factor, focusX, focusY)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button, select, input')) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapTransform.x,
      originY: mapTransform.y,
    }
    draggedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const bounds = mapViewportRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return
    const deltaX = (event.clientX - drag.startX) * WIDTH / bounds.width
    const deltaY = (event.clientY - drag.startY) * HEIGHT / bounds.height
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) draggedRef.current = true
    setMapTransform(constrainTransform(drag.originX + deltaX, drag.originY + deltaY, mapTransform.scale))
  }

  const finishPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div className="flex h-dvh min-w-0 w-full max-w-full flex-col overflow-hidden bg-background">
      <header className="flex h-14 min-w-0 w-full max-w-full shrink-0 items-center gap-3 overflow-hidden border-b border-border bg-card/70 px-4 py-2 backdrop-blur sm:px-6">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/site-logo.png" alt="" width={36} height={36} className="size-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate font-serif text-xl leading-none sm:text-2xl">Historical Atlas</p>
            <p className="mt-1 hidden text-[10px] tracking-[0.14em] text-muted-foreground uppercase sm:block">Map of Church History</p>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">Local prototype data</Badge>
          <Button render={<Link href="/" />} variant="outline" size="sm" className="shrink-0">
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Timeline</span>
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 min-w-0 w-full max-w-full flex-1 grid-cols-[minmax(0,1fr)] gap-2 overflow-hidden p-2 lg:grid-cols-[minmax(0,1fr)_19rem] lg:p-3">
        <section className="flex min-h-0 w-full max-w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card/50 shadow-2xl shadow-black/10">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/80 px-3 py-2">
            <label className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto sm:min-w-48 sm:flex-1">
              <MapIcon className="size-4 text-primary" />
              <span className="sr-only">Map region</span>
              <select
                value={regionId}
                onChange={(event) => {
                  setRegionId(event.target.value as MapRegionId)
                  setSelectedLandmark(null)
                  setSelectedTerritory(null)
                }}
                className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MAP_REGIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>

            <div className="flex w-full items-center gap-1 sm:w-auto" aria-label="Map layers">
              <LayerButton active={showTerritories} onClick={() => setShowTerritories((value) => !value)} icon={Layers3Icon}>Borders</LayerButton>
              <LayerButton active={showPlaces} onClick={() => setShowPlaces((value) => !value)} icon={MapPinIcon}>Places</LayerButton>
              <LayerButton active={showWater} onClick={() => setShowWater((value) => !value)} icon={WavesIcon}>Water</LayerButton>
            </div>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 items-center overflow-hidden bg-[#172733]">
            <div
              ref={mapViewportRef}
              className={cn(
                'relative mx-auto aspect-[1200/680] min-w-0 w-full max-w-full max-h-full select-none touch-none overflow-hidden',
                dragRef.current ? 'cursor-grabbing' : 'cursor-grab',
              )}
              aria-label={`${region.label} historical map for ${formatHistoricalYear(snapshot.year)}. Drag to pan and use the mouse wheel or controls to zoom.`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerDrag}
              onPointerCancel={finishPointerDrag}
              onClickCapture={(event) => {
                if (draggedRef.current) {
                  event.preventDefault()
                  event.stopPropagation()
                  draggedRef.current = false
                }
              }}
            >
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 size-full" role="img">
                <title>{`${region.label}, ${formatHistoricalYear(snapshot.year)}`}</title>
                <defs>
                  <linearGradient id="map-ocean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#203c4b" />
                    <stop offset="1" stopColor="#142a37" />
                  </linearGradient>
                  <filter id="territory-soften"><feGaussianBlur stdDeviation="1.2" /></filter>
                  <clipPath id="land-clip"><path d={landPath} /></clipPath>
                </defs>
                <rect width={WIDTH} height={HEIGHT} fill="url(#map-ocean)" />
                <g transform={`translate(${mapTransform.x} ${mapTransform.y}) scale(${mapTransform.scale})`}>
                  <path d={graticulePath} fill="none" stroke="#9fc1cd" strokeOpacity="0.08" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                  <path d={landPath} fill="#263d38" stroke="#87a39a" strokeOpacity="0.55" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />

                  {showTerritories && (
                    <g clipPath="url(#land-clip)">
                      {snapshot.territories.map((item) => {
                        const d = path(territoryGeometry(item)) ?? ''
                        const active = selectedTerritory?.id === item.id
                        return (
                          <path
                            key={item.id}
                            d={d}
                            fill={item.color}
                            fillOpacity={active ? 0.64 : 0.42}
                            stroke={item.color}
                            strokeWidth={active ? 5 : 2.5}
                            strokeDasharray={item.confidence === 'generalized' ? '9 7' : undefined}
                            vectorEffect="non-scaling-stroke"
                            className="cursor-pointer outline-none transition-opacity hover:fill-opacity-60 focus:fill-opacity-60"
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.name}. ${item.note}`}
                            onClick={() => { setSelectedTerritory(item); setSelectedLandmark(null) }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedTerritory(item)
                                setSelectedLandmark(null)
                              }
                            }}
                            filter={item.confidence === 'generalized' ? 'url(#territory-soften)' : undefined}
                          />
                        )
                      })}
                    </g>
                  )}
                  <path d={landPath} fill="none" stroke="#b7c7b8" strokeOpacity="0.6" strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none" />
                </g>
              </svg>

              {visibleLandmarks.map((landmark) => {
                const point = projection([...landmark.coordinate])
                if (!point) return null
                const [projectedX, projectedY] = point
                const x = mapTransform.x + projectedX * mapTransform.scale
                const y = mapTransform.y + projectedY * mapTransform.scale
                if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) return null
                const Icon = landmarkIcons[landmark.kind]
                const active = selectedLandmark?.id === landmark.id
                return (
                  <button
                    key={landmark.id}
                    type="button"
                    className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left outline-none"
                    style={{ left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` }}
                    aria-label={`${landmark.name}, ${landmarkLabels[landmark.kind]}`}
                    onClick={() => { setSelectedLandmark(landmark); setSelectedTerritory(null) }}
                  >
                    <span className={cn(
                      'flex size-6 items-center justify-center rounded-full border shadow-lg transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-primary sm:size-7',
                      landmark.kind === 'water' ? 'border-sky-200/40 bg-sky-900/80 text-sky-100' : 'border-amber-100/50 bg-slate-950/90 text-amber-300',
                      active && 'scale-125 ring-2 ring-primary',
                    )}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className={cn(
                      'absolute top-1/2 left-full ml-1.5 hidden -translate-y-1/2 rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] leading-none font-medium whitespace-nowrap text-slate-100 shadow sm:block',
                      landmark.importance === 1 && 'lg:hidden',
                    )}>
                      {landmark.name}
                    </span>
                  </button>
                )
              })}

              <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 rounded-lg border border-white/15 bg-slate-950/75 p-1 shadow-xl backdrop-blur">
                <Button variant="ghost" size="icon-sm" className="text-slate-100 hover:bg-white/10" aria-label="Zoom in" disabled={mapTransform.scale >= MAX_ZOOM} onClick={() => zoomMap(mapTransform.scale * 1.4)}>
                  <PlusIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-slate-100 hover:bg-white/10" aria-label="Zoom out" disabled={mapTransform.scale <= MIN_ZOOM} onClick={() => zoomMap(mapTransform.scale / 1.4)}>
                  <MinusIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-slate-100 hover:bg-white/10" aria-label="Reset map view" disabled={mapTransform.scale === 1 && mapTransform.x === 0 && mapTransform.y === 0} onClick={resetMapView}>
                  <RotateCcwIcon />
                </Button>
              </div>

              <div className="pointer-events-none absolute right-3 bottom-3 rounded bg-slate-950/60 px-2 py-1 text-[9px] tracking-wide text-slate-300 uppercase">
                Physical geography: Natural Earth 1:50m · WGS84
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-card/90 px-3 py-2">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon-sm" aria-label="Previous historical snapshot" disabled={snapshotIndex === 0} onClick={() => selectSnapshot(snapshotIndex - 1)}>
                <ChevronLeftIcon />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="font-serif text-lg text-primary">{formatHistoricalYear(snapshot.year)}</p>
                  <p className="truncate text-xs text-muted-foreground">{snapshot.label}</p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={MAP_SNAPSHOTS.length - 1}
                  step={1}
                  value={snapshotIndex}
                  onChange={(event) => selectSnapshot(Number(event.target.value))}
                  aria-label="Historical date"
                  aria-valuetext={`${formatHistoricalYear(snapshot.year)}: ${snapshot.label}`}
                  className="h-2 w-full cursor-pointer accent-primary"
                />
                <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                  {MAP_SNAPSHOTS.map((item) => <span key={item.year}>{item.year}</span>)}
                </div>
              </div>
              <Button variant="outline" size="icon-sm" aria-label="Next historical snapshot" disabled={snapshotIndex === MAP_SNAPSHOTS.length - 1} onClick={() => selectSnapshot(snapshotIndex + 1)}>
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden min-w-0 flex-col gap-3 overflow-y-auto lg:flex lg:min-h-0">
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] tracking-[0.14em] text-primary uppercase">{formatHistoricalYear(snapshot.year)}</p>
            <h1 className="mt-1 font-serif text-2xl">{snapshot.label}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{snapshot.context}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{region.description}. Choose another region to reframe the same dated layer.</p>
          </section>

          {(selectedLandmark || selectedTerritory) && (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
              {selectedLandmark && <LandmarkDetails landmark={selectedLandmark} />}
              {selectedTerritory && <TerritoryDetails territory={selectedTerritory} />}
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-serif text-lg">Territories shown</h2>
            <div className="mt-3 space-y-2">
              {snapshot.territories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md p-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => { setSelectedTerritory(item); setSelectedLandmark(null) }}
                >
                  <span className="mt-1 size-3 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.name}<span className="block text-[10px] text-muted-foreground">{item.confidence} boundary</span></span>
                </button>
              ))}
            </div>
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            Historical borders are interpretive, especially before modern surveyed states. These first layers are generalized research scaffolds—not survey-grade claims—and should be replaced or refined as source-verified GeoJSON is added.
          </p>
        </aside>
      </main>
    </div>
  )
}

function LayerButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Button variant={active ? 'secondary' : 'ghost'} size="sm" aria-pressed={active} onClick={onClick}>
      <Icon />
      <span className="hidden sm:inline">{children}</span>
    </Button>
  )
}

function LandmarkDetails({ landmark }: { landmark: HistoricalLandmark }) {
  const [longitude, latitude] = landmark.coordinate
  return (
    <>
      <Badge variant="outline">{landmarkLabels[landmark.kind]}</Badge>
      <h2 className="mt-2 font-serif text-xl">{landmark.name}</h2>
      {landmark.alternateName && <p className="mt-0.5 text-xs text-muted-foreground">{landmark.alternateName}</p>}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{landmark.note}</p>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        {Math.abs(latitude).toFixed(4)}°{latitude >= 0 ? 'N' : 'S'}, {Math.abs(longitude).toFixed(4)}°{longitude >= 0 ? 'E' : 'W'}
      </p>
    </>
  )
}

function TerritoryDetails({ territory }: { territory: HistoricalTerritory }) {
  return (
    <>
      <Badge variant="outline">{territory.confidence} boundary</Badge>
      <h2 className="mt-2 font-serif text-xl">{territory.name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{territory.note}</p>
    </>
  )
}
