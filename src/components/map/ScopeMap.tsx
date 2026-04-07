import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type * as GeoJSONTypes from 'geojson'

export interface ScopeFeature {
  name: string
  scopeType: string
  geometry: { type: string; coordinates: number[][][] }
  // optional progress data
  currentValue?: number
  targetValue?: number
  startValue?: number
  taskCount?: number
  taskTitles?: string[]
}

interface Props {
  features: ScopeFeature[]
  height?: number | string
}

function pctOf(f: ScopeFeature): number | null {
  if (f.targetValue == null || f.currentValue == null) return null
  const start = f.startValue ?? 0
  const range = f.targetValue - start
  if (range <= 0) return null
  return Math.min(100, Math.max(0, ((f.currentValue - start) / range) * 100))
}

function trafficColor(pct: number | null): string {
  if (pct == null) return '#94a3b8'   // grey — no data
  if (pct >= 90)   return '#16a34a'   // green
  if (pct >= 60)   return '#ca8a04'   // yellow
  return '#dc2626'                     // red
}

function MapBounds({ geoJsonData }: { geoJsonData: GeoJSONTypes.FeatureCollection }) {
  const map = useMap()
  useEffect(() => {
    if (!geoJsonData.features.length) { map.setView([-18.5, 35.5], 5); return }
    const layer = L.geoJSON(geoJsonData)
    const bounds = layer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32] })
  }, [geoJsonData, map])
  return null
}

interface SelectedInfo {
  name: string
  scopeType: string
  pct: number | null
  currentValue?: number
  targetValue?: number
  taskCount?: number
  taskTitles?: string[]
  x: number
  y: number
}

export default function ScopeMap({ features, height = 380 }: Props) {
  const [selected, setSelected] = useState<SelectedInfo | null>(null)

  const geoJsonData: GeoJSONTypes.FeatureCollection = {
    type: 'FeatureCollection',
    features: features.map((f, i) => ({
      type: 'Feature',
      geometry: f.geometry as GeoJSONTypes.Geometry,
      properties: { ...f, _idx: i },
    })),
  }

  const style = (feature: any) => {
    const f: ScopeFeature = feature.properties
    const pct = pctOf(f)
    const color = trafficColor(pct)
    return {
      fillColor: color,
      fillOpacity: 0.40,
      color,
      weight: 2.5,
      opacity: 0.85,
    }
  }

  const onEachFeature = (feature: any, layer: any) => {
    const f: ScopeFeature = feature.properties
    const pct = pctOf(f)
    const color = trafficColor(pct)
    const pctStr = pct != null ? `${pct.toFixed(1)}%` : 'Sem dados'

    layer.bindTooltip(
      `<div style="font-family:Manrope,sans-serif;padding:6px 10px;min-width:140px">
        <b style="font-size:13px">${f.name}</b>
        <div style="font-size:11px;color:#5a5f6b;text-transform:uppercase;margin-bottom:4px">${f.scopeType}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
          <b style="font-size:13px;color:${color}">${pctStr}</b>
        </div>
      </div>`,
      { sticky: true, opacity: 0.97, className: 'scope-tooltip' }
    )

    layer.on({
      mouseover: (e: any) => { e.target.setStyle({ fillOpacity: 0.65, weight: 3.5 }) },
      mouseout:  (e: any) => { e.target.setStyle({ fillOpacity: 0.40, weight: 2.5 }) },
      click: (e: any) => {
        const containerPoint = e.containerPoint
        setSelected({
          name:         f.name,
          scopeType:    f.scopeType,
          pct,
          currentValue: f.currentValue,
          targetValue:  f.targetValue,
          taskCount:    f.taskCount,
          taskTitles:   f.taskTitles,
          x: containerPoint.x,
          y: containerPoint.y,
        })
      },
    })
  }

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', position: 'relative' }}>
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
            <GeoJSON
              key={JSON.stringify(features.map(f => `${f.name}-${f.currentValue}`))}
              data={geoJsonData}
              style={style}
              onEachFeature={onEachFeature}
            />
            <MapBounds geoJsonData={geoJsonData} />
          </>
        )}
        {features.length === 0 && <MapBounds geoJsonData={{ type: 'FeatureCollection', features: [] }} />}
      </MapContainer>

      {/* Click popup */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: Math.min(selected.y + 12, (typeof height === 'number' ? height : 380) - 200),
            left: Math.min(selected.x + 12, 400),
            zIndex: 1000,
            background: 'var(--color-surface-strong)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            minWidth: 220,
            maxWidth: 280,
          }}
        >
          {/* Close */}
          <button
            onClick={e => { e.stopPropagation(); setSelected(null) }}
            style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1 }}
          >×</button>

          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>{selected.name}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>{selected.scopeType}</p>

          {/* Progress ring + pct */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `conic-gradient(${trafficColor(selected.pct)} ${(selected.pct ?? 0) * 3.6}deg, var(--color-border-strong) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: trafficColor(selected.pct) }}>
                  {selected.pct != null ? `${selected.pct.toFixed(0)}%` : '—'}
                </span>
              </div>
            </div>
            <div>
              {selected.currentValue != null && (
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
                  {selected.currentValue.toLocaleString('pt-PT')} <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>realizado</span>
                </p>
              )}
              {selected.targetValue != null && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Objectivo: <b style={{ color: 'var(--color-text)' }}>{selected.targetValue.toLocaleString('pt-PT')}</b>
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {selected.pct != null && (
            <div style={{ height: 6, borderRadius: 999, background: 'var(--color-border-strong)', marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${selected.pct}%`, borderRadius: 999, background: trafficColor(selected.pct), transition: 'width 300ms' }} />
            </div>
          )}

          {/* Tasks */}
          {selected.taskCount != null && (
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: selected.taskTitles?.length ? 6 : 0 }}>
              <b style={{ color: 'var(--color-text)' }}>{selected.taskCount}</b> tarefa{selected.taskCount !== 1 ? 's' : ''} nesta área
            </p>
          )}
          {selected.taskTitles?.map((t, i) => (
            <p key={i} style={{ fontSize: 11, color: 'var(--color-text-muted)', paddingLeft: 8, borderLeft: '2px solid var(--color-primary)', marginTop: 3 }}>
              {t}
            </p>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 999,
        background: 'var(--color-surface-strong)', borderRadius: 10,
        border: '1px solid var(--color-border)', padding: '10px 14px',
        boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {([['#16a34a', '≥ 90%'], ['#ca8a04', '60–89%'], ['#dc2626', '< 60%'], ['#94a3b8', 'Sem dados']] as [string, string][]).map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .scope-tooltip { background: var(--color-surface-strong) !important; border: 1px solid var(--color-border) !important; border-radius: 10px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important; padding: 0 !important; }
        .scope-tooltip::before { display: none !important; }
        .leaflet-tooltip-scope-tooltip { padding: 0 !important; }
      `}</style>
    </div>
  )
}
