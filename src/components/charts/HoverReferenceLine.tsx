import { useState, useCallback, useRef } from 'react'
import { ReferenceLine } from 'recharts'

interface HoverReferenceLineProps {
  /** The Y-axis value where the line should be drawn */
  y: number
  /** Label text */
  text: string
  /** Full-strength color (visible on hover) */
  color: string
  /** Stroke width */
  strokeWidth?: number
  /** Dash pattern */
  strokeDasharray?: string
  /** Font size for label */
  fontSize?: number
  /** Font weight for label */
  fontWeight?: number
}

/**
 * A ReferenceLine wrapper that renders subtly by default (opacity 0.35)
 * and reveals full solid color + label on mouse hover.
 *
 * Uses Recharts 3.x `shape` prop for custom line rendering and
 * a custom `label` component — both sharing hover state.
 *
 * Usage:
 *   <HoverReferenceLine y={23} text="Meta: 23" color="#16a34a" />
 */
export default function HoverReferenceLine({
  y,
  text,
  color,
  strokeWidth = 1.5,
  strokeDasharray = '6 3',
  fontSize = 11,
  fontWeight = 700,
}: HoverReferenceLineProps) {
  const [hovered, setHovered] = useState(false)

  const onEnter = useCallback(() => setHovered(true), [])
  const onLeave = useCallback(() => setHovered(false), [])

  // We use a ref to communicate hover state to the label renderer
  // because Recharts renders shape and label separately
  const hoveredRef = useRef(false)
  hoveredRef.current = hovered

  const subtleOpacity = 0.35
  const fullOpacity = 1

  // Custom shape renderer — receives { x1, y1, x2, y2, ...svgProps } from Recharts
  const renderShape = useCallback((props: any) => {
    const { x1, y1, x2, y2 } = props
    const isHovered = hoveredRef.current

    return (
      <g
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{ cursor: 'default' }}
      >
        {/* Wide invisible hit area for easy hover */}
        <rect
          x={Math.min(x1, x2)}
          y={y1 - 10}
          width={Math.abs(x2 - x1)}
          height={20}
          fill="transparent"
        />
        {/* Visible dashed line */}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={isHovered ? strokeWidth + 0.5 : strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={isHovered ? fullOpacity : subtleOpacity}
          style={{ transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
        />
      </g>
    )
  }, [color, strokeWidth, strokeDasharray, onEnter, onLeave])

  // Custom label renderer — receives { viewBox } from Recharts
  const renderLabel = useCallback((props: any) => {
    const vb = props?.viewBox ?? props
    const vbX = vb?.x ?? 0
    const vbY = vb?.y ?? 0
    const vbW = vb?.width ?? 0
    const isHovered = hoveredRef.current

    return (
      <text
        x={vbX + vbW - 6}
        y={vbY - 7}
        textAnchor="end"
        fill={color}
        fontSize={isHovered ? fontSize + 1 : fontSize}
        fontWeight={fontWeight}
        opacity={isHovered ? fullOpacity : subtleOpacity}
        style={{ transition: 'opacity 0.2s ease, font-size 0.2s ease', userSelect: 'none' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {text}
      </text>
    )
  }, [color, fontSize, fontWeight, text, onEnter, onLeave])

  return (
    <ReferenceLine
      y={y}
      stroke="transparent"
      shape={renderShape}
      label={renderLabel}
    />
  )
}
