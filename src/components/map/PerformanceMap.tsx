import React, { useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type * as GeoJSONTypes from 'geojson'

type TrafficLight = 'GREEN' | 'YELLOW' | 'RED'

interface MapFeatureProps {
  id: number
  name: string
  total_score: number
  traffic_light: TrafficLight
}

interface Props {
  features: Array<{
    geometry: { type: string; coordinates: number[][][] }
    properties: MapFeatureProps
  }>
  height?: number | string
  onSelect?: (props: MapFeatureProps) => void
}

const TL_FILL: Record<TrafficLight, string> = {
  GREEN:  '#16a34a',
  YELLOW: '#ca8a04',
  RED:    '#dc2626',
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

export default function PerformanceMap({ features, height = 400, onSelect }: Props) {
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
    return {
      fillColor: TL_FILL[tl],
      fillOpacity: 0.45,
      color: TL_FILL[tl],
      weight: 2,
      opacity: 0.8,
    }
  }

  const onEachFeature = (feature: any, layer: any) => {
    const { name, total_score } = feature.properties
    layer.bindTooltip(
      `<div style="font-family:Manrope,sans-serif;padding:4px 8px"><b style="font-size:13px">${name}</b><br/><span style="font-size:12px;color:#5a5f6b">Score: <b>${total_score?.toFixed?.(1) ?? total_score}</b></span></div>`,
      { sticky: true, opacity: 0.97, className: 'commv-tooltip' }
    )
    layer.on({
      mouseover: (e: any) => { e.target.setStyle({ fillOpacity: 0.7, weight: 3 }) },
      mouseout:  (e: any) => { e.target.setStyle({ fillOpacity: 0.45, weight: 2 }) },
      click:     () => onSelect?.(feature.properties),
    })
  }

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

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
        background: 'var(--color-surface-strong)', borderRadius: 10,
        border: '1px solid var(--color-border)', padding: '10px 14px',
        boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {(['GREEN', 'YELLOW', 'RED'] as TrafficLight[]).map(tl => (
          <div key={tl} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: TL_FILL[tl] }} />
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
