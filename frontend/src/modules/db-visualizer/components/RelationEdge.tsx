import React from 'react';
import { BaseEdge, getSmoothStepPath, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export const RelationEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  animated,
}) => {
  const edgeStyleType = data?.edgeStyle as 'bezier' | 'smoothstep' | undefined;
  const localEdgeIndex = (data?.localEdgeIndex as number) || 0;
  
  // Стабильный "веерный" сдвиг на основе локального индекса (от -2 до +2)
  const shift = (localEdgeIndex % 5) - 2;

  const pathParams = {
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  };

  // Сдвигаем центр излома для ломаных линий, чтобы они не сливались
  const centerX = (sourceX + targetX) / 2 + shift * 20;

  const [edgePath] = edgeStyleType === 'smoothstep' 
    ? getSmoothStepPath({ ...pathParams, borderRadius: 20, centerX })
    : getBezierPath({ ...pathParams, curvature: 0.25 + shift * 0.08 });

  const relationType = data?.relationType as '1:1' | '1:M' | undefined;
  
  // Базовый цвет и толщина линии
  const stroke = 'hsl(var(--primary))';
  const strokeWidth = 2;

  // Source находится справа от ноды (Position.Right). Линии идут вправо (+x).
  const renderManyMarker = (x: number, y: number) => {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Ветка вверх */}
        <line x1="0" y1="0" x2="8" y2="-5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Ветка вниз */}
        <line x1="0" y1="0" x2="8" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Центральная линия сквозь маркер */}
        <line x1="0" y1="0" x2="16" y2="0" stroke={stroke} strokeWidth={strokeWidth} />
        {/* Кружок (Zero or Many) */}
        <circle cx="12" cy="0" r="2.5" fill="hsl(var(--background))" stroke={stroke} strokeWidth={strokeWidth} />
      </g>
    );
  };

  const renderOneMarker = (x: number, y: number) => {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Две вертикальные риски (Mandatory One) */}
        <line x1="4" y1="-5" x2="4" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1="9" y1="-5" x2="9" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1="0" y1="0" x2="16" y2="0" stroke={stroke} strokeWidth={strokeWidth} />
      </g>
    );
  };

  // Target находится слева от ноды (Position.Left). Линии идут влево (-x).
  const renderTargetOneMarker = (x: number, y: number) => {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Две вертикальные риски (Mandatory One) */}
        <line x1="-4" y1="-5" x2="-4" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1="-9" y1="-5" x2="-9" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1="0" y1="0" x2="-16" y2="0" stroke={stroke} strokeWidth={strokeWidth} />
      </g>
    );
  };

  const showMarkers = data?.showMarkers !== false; // По умолчанию true

  const opacity = style.opacity !== undefined ? style.opacity : 0.8;

  return (
    <g opacity={opacity} className="transition-opacity duration-300">
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ ...style, stroke, strokeWidth }} 
        className={animated ? 'react-flow__edge-animated' : ''}
      />
      {/* Рисуем SVG маркеры вручную поверх линии для идеального позиционирования */}
      
      {/* Source Marker (Many or One) */}
      {showMarkers && relationType === '1:M' && renderManyMarker(sourceX, sourceY)}
      {showMarkers && relationType === '1:1' && renderOneMarker(sourceX, sourceY)}

      {/* Target Marker (Always One in our DB schema context) */}
      {showMarkers && renderTargetOneMarker(targetX, targetY)}
    </g>
  );
};
