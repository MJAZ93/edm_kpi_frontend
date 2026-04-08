import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type * as GeoJSONTypes from 'geojson'

type TrafficLight = 'GREEN' | 'YELLOW' | 'RED'

export interface MapFeatureProps {
  id: number
  name: string
  total_score: number
  execution_score?: number
  goal_score?: number
  traffic_light: TrafficLight
}

interface SelectedState {
  props: MapFeatureProps
  x: number
  y: number
}

interface Props {
  features: Array<{
    geometry: { type: string; coordinates: number[][][] }
    properties: MapFeatureProps
  }>
  height?: number | string
  onSelect?: (props: MapFeatureProps) => void
  /** If provided, renders extra content inside the click popup (below the default score info) */
  renderPopupContent?: (props: MapFeatureProps, onClose: () => void) => React.ReactNode
}

const TL_FILL: Record<TrafficLight, string> = {
  GREEN:  '#16a34a',
  YELLOW: '#ca8a04',
  RED:    '#dc2626',
}

const TL_LABEL: Record<TrafficLight, string> = {
  GREEN: 'Bom desempenho', YELLOW: 'Desempenho médio', RED: 'Requer atenção',
}

function MapBounds({ geoJsonData }: { geoJsonData: GeoJSONTypes.FeatureCollection }) {
  const map = useMap()
  useEffect(() => {
    if (!geoJsonData.features.length) return
    const layer = L.geoJSON(geoJsonData)
    const bounds = layer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
  }, [geoJsonData, map])
  return null
}

export default function PerformanceMap({ features, height = 400, onSelect, renderPopupContent }: Props) {
  const [selected, setSelected] = useState<SelectedState | null>(null)

  const geoJsonData: GeoJSONTypes.FeatureCollection = {
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      geometry: f.geometry as GeoJSONTypes.Geometry,
      properties: f.properties,
    })),
  }

  const style = (feature: any) => {
    const tl: TrafficLight = feature?.properties?.traffic_light || 'YELLOW'
    const isSelected = selected?.props.id === feature?.properties?.id
    return {
      fillColor: TL_FILL[tl],
      fillOpacity: isSelected ? 0.7 : 0.45,
      color: TL_FILL[tl],
      weight: isSelected ? 3.5 : 2,
      opacity: 0.8,
    }
  }

  const onEachFeature = (feature: any, layer: any) => {
    const props: MapFeatureProps = feature.properties
    const color = TL_FILL[props.traffic_light || 'RED']
    layer.bindTooltip(
      `<div style="font-family:Manrope,sans-serif;padding:6px 10px;min-width:130px">
        <b style="font-size:13px">${props.name}</b>
        <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
          <span style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0"></span>
          <span style="font-size:12px;color:${color};font-weight:700">${props.total_score?.toFixed?.(1) ?? props.total_score}</span>
          <span style="font-size:11px;color:#5a5f6b">/ 100</span>
        </div>
      </div>`,
      { sticky: true, opacity: 0.97, className: 'commv-tooltip' }
    )
    layer.on({
      mouseover: (e: any) => { e.target.setStyle({ fillOpacity: 0.65, weight: 3 }) },
      mouseout:  (e: any) => {
        const isSel = selected?.props.id === props.id
        e.target.setStyle({ fillOpacity: isSel ? 0.7 : 0.45, weight: isSel ? 3.5 : 2 })
      },
      click: (e: any) => {
        const cp = e.containerPoint
        setSelected({ props, x: cp.x, y: cp.y })
        onSelect?.(props)
      },
    })
  }

  const close = () => setSelected(null)

  const mapH = typeof height === 'number' ? height : 400

  return (
    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', position: 'relative' }}>
      <MapContainer
        center={[-18.5, 35.5]}
        zoom={5}
        style={{ height, width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {features.length > 0 && (
          <>
            <GeoJSON key={JSON.stringify(features)} data={geoJsonData} style={style} onEachFeature={onEachFeature} />
            <MapBounds geoJsonData={geoJsonData} />
          </>
        )}
      </MapContainer>

      {/* ── Click popup ──────────────────────────────────────────────────────── */}
      {selected && (() => {
        const p = selected.props
        const color = TL_FILL[p.traffic_light || 'RED']
        const pct = Math.min(100, Math.max(0, p.total_score ?? 0))
        // Clamp so popup doesn't overflow the map container
        const popW = 260
        const popLeft = Math.min(selected.x + 14, mapH > 0 ? (mapH < 260 ? selected.x - popW - 6 : selected.x + 14) : selected.x + 14)
        const safeLeft = Math.max(8, Math.min(popLeft, mapH - popW - 8))  // fallback calc
        const safeTop  = Math.max(8, Math.min(selected.y + 14, mapH - 20))

        return (
          <div
            style={{
              position: 'absolute',
              top: safeTop, left: selected.x + popW > mapH ? Math.max(8, selected.x - popW - 6) : selected.x + 14,
              zIndex: 1000,
              background: 'var(--color-surface-strong)',
              border: `1.5px solid ${color}40`,
              borderRadius: 14,
              padding: '14px 16px',
              boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              minWidth: popW,
              maxWidth: popW,
              maxHeight: mapH - 40,
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={close}
              style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>

            {/* Header */}
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2, paddingRight: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>ASC</p>

            {/* Score ring + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {/* Conic ring */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: `conic-gradient(${color} ${pct * 3.6}deg, var(--color-border-strong) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1 }}>{pct.toFixed(0)}</span>
                  <span style={{ fontSize: 8, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{TL_LABEL[p.traffic_light || 'RED']}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Score: <b style={{ color: 'var(--color-text)' }}>{p.total_score?.toFixed(1)}</b>
                </p>
              </div>
            </div>

            {/* Score bar */}
            <div style={{ height: 5, borderRadius: 999, background: 'var(--color-border-strong)', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color, transition: 'width 400ms' }} />
            </div>

            {/* Execution / Goal breakdown */}
            {(p.execution_score != null || p.goal_score != null) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ textAlign: 'center', padding: '8px 6px', background: 'var(--color-bg-strong)', borderRadius: 9 }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 3 }}>Execução</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                    {(p.execution_score ?? 0).toFixed(1)}
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>%</span>
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 6px', background: 'var(--color-bg-strong)', borderRadius: 9 }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 3 }}>Objectivos</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                    {(p.goal_score ?? 0).toFixed(1)}
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>%</span>
                  </p>
                </div>
              </div>
            )}

            {/* Custom content injected from parent */}
            {renderPopupContent?.(p, close)}
          </div>
        )
      })()}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 999,
        background: 'var(--color-surface-strong)', borderRadius: 10,
        border: '1px solid var(--color-border)', padding: '10px 14px',
        boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {(['GREEN', 'YELLOW', 'RED'] as TrafficLight[]).map(tl => (
          <div key={tl} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: TL_FILL[tl] }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: TL_FILL[tl] }}>
              {tl === 'GREEN' ? '≥ 90%' : tl === 'YELLOW' ? '60–89%' : '< 60%'}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .commv-tooltip { background: var(--color-surface-strong) !important; border: 1px solid var(--color-border) !important; border-radius: 8px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
        .commv-tooltip::before { display: none !important; }
      `}</style>
    </div>
  )
}
