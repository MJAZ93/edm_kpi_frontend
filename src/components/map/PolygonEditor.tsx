import React, { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import Tabs from '../ui/Tabs'

type LatLng = [number, number]

interface Props {
  value?: { type: string; coordinates: any } | null
  onChange: (geo: { type: string; coordinates: any } | null) => void
}

function ClickHandler({ onAdd }: { onAdd: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function PolygonEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState('map')
  const [points, setPoints] = useState<LatLng[]>(() => {
    if (value?.type === 'Polygon' && value.coordinates?.[0]) {
      return (value.coordinates[0] as [number, number][]).map(([lng, lat]) => [lat, lng] as LatLng)
    }
    return []
  })
  const [jsonText, setJsonText] = useState(() => value ? JSON.stringify(value, null, 2) : '')
  const [jsonError, setJsonError] = useState('')

  const toGeoJSON = useCallback((pts: LatLng[]) => {
    if (pts.length < 3) return null
    const coords = [...pts, pts[0]].map(([lat, lng]) => [lng, lat])
    return { type: 'Polygon', coordinates: [coords] }
  }, [])

  const addPoint = (latlng: LatLng) => {
    const next = [...points, latlng]
    setPoints(next)
    const geo = toGeoJSON(next)
    onChange(geo)
    if (geo) setJsonText(JSON.stringify(geo, null, 2))
  }

  const removePoint = (idx: number) => {
    const next = points.filter((_, i) => i !== idx)
    setPoints(next)
    const geo = toGeoJSON(next)
    onChange(geo)
    if (geo) setJsonText(JSON.stringify(geo, null, 2))
  }

  const clearAll = () => {
    setPoints([])
    onChange(null)
    setJsonText('')
  }

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    setJsonError('')
    try {
      if (!text.trim()) { onChange(null); setPoints([]); return }
      const parsed = JSON.parse(text)
      if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates?.[0])) {
        onChange(parsed)
        const pts = (parsed.coordinates[0] as [number, number][]).slice(0, -1).map(([lng, lat]) => [lat, lng] as LatLng)
        setPoints(pts)
      } else {
        setJsonError('Formato inválido. Esperado: { type: "Polygon", coordinates: [[[lng, lat], ...]] }')
      }
    } catch {
      setJsonError('JSON inválido.')
    }
  }

  const center: LatLng = points.length > 0
    ? [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
    : [-18.665695, 35.529562] // Mozambique center

  return (
    <div>
      <Tabs
        tabs={[{ key: 'map', label: 'Desenho no mapa' }, { key: 'json', label: 'JSON manual' }]}
        activeKey={tab}
        onChange={setTab}
      >{() => null}</Tabs>

      <div style={{ marginTop: 12 }}>
        {tab === 'map' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Clique no mapa para adicionar pontos. São necessários pelo menos 3 pontos para formar um polígono.
            </p>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <MapContainer center={center} zoom={6} style={{ height: 320, width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                />
                <ClickHandler onAdd={addPoint} />
                {points.length >= 3 && (
                  <Polygon positions={points} pathOptions={{ color: '#e8670a', fillOpacity: 0.2 }} />
                )}
              </MapContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {points.length} ponto{points.length !== 1 ? 's' : ''}
              </span>
              {points.length > 0 && (
                <Button variant="secondary" size="sm" onClick={clearAll}>Limpar</Button>
              )}
            </div>
          </div>
        )}

        {tab === 'json' && (
          <div>
            <Textarea
              label="GeoJSON Polygon"
              value={jsonText}
              onChange={e => handleJsonChange(e.target.value)}
              rows={8}
              placeholder='{ "type": "Polygon", "coordinates": [[[35.5, -18.6], [35.6, -18.6], [35.6, -18.7], [35.5, -18.6]]] }'
            />
            {jsonError && (
              <p style={{ fontSize: 12, color: 'var(--color-traffic-red)', marginTop: 4 }}>{jsonError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
