import { useMemo, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { DatabaseSchema } from '../types';

interface UseGraphFiltersProps {
  nodes: Node[];
  edges: Edge[];
  activeSchema: DatabaseSchema;
  hiddenTables: Set<string>;
  highlightedColumns: Set<string>;
  activeDragItems: { nodes: Set<string>; edges: Set<string> } | null;
  showRelations: boolean;
  edgeStyle: 'bezier' | 'smoothstep';
  showMarkers: boolean;
  animateEdges: boolean;
}

export const useGraphFilters = ({
  nodes,
  edges,
  activeSchema,
  hiddenTables,
  highlightedColumns,
  activeDragItems,
  showRelations,
  edgeStyle,
  showMarkers,
  animateEdges
}: UseGraphFiltersProps) => {
  // Жесткий кэш для предотвращения перерисовок
  const [rawNodeCache] = useState(() => new Map<string, Node>());
  const [nodeCache] = useState(() => new Map<string, Node>());
  const [rawEdgeCache] = useState(() => new Map<string, Edge>());
  const [edgeCache] = useState(() => new Map<string, Edge>());

  const fadedTables = useMemo(() => {
    const faded = new Set<string>();
    if (highlightedColumns.size > 0) {
      activeSchema.tables.forEach(table => {
        const hasCol = table.columns.some(col => highlightedColumns.has(col.name));
        if (!hasCol) {
          faded.add(`${table.schema}.${table.name}`);
        }
      });
    }
    return faded;
  }, [activeSchema, highlightedColumns]);

  const modifiedNodes = useMemo(() => {
    return nodes.map(node => {
      const isHidden = hiddenTables.has(node.id);
      
      const isDraggedFade = activeDragItems ? !activeDragItems.nodes.has(node.id) : false;
      const isFilterFade = fadedTables.has(node.id);
      const finalFaded = isDraggedFade || isFilterFade;

      const rawCached = rawNodeCache.get(node.id);
      const cached = nodeCache.get(node.id);
      
      if (
        rawCached === node &&
        cached &&
        cached.hidden === isHidden &&
        cached.data?.highlightedColumns === highlightedColumns &&
        cached.data?.isFaded === finalFaded
      ) {
        return cached;
      }

      const newNode = {
        ...node,
        hidden: isHidden,
        data: {
          ...node.data,
          highlightedColumns,
          isFaded: finalFaded
        }
      };
      
      rawNodeCache.set(node.id, node);
      nodeCache.set(node.id, newNode);
      return newNode;
    });
  }, [nodes, hiddenTables, highlightedColumns, activeDragItems, fadedTables, nodeCache, rawNodeCache]);

  const modifiedEdges = useMemo(() => {
    return edges.map(edge => {
      const bothFaded = fadedTables.has(edge.source) && fadedTables.has(edge.target);
      const isFilterActive = highlightedColumns.size > 0;
      const isDraggedFade = activeDragItems ? !activeDragItems.edges.has(edge.id) : false;
      const isHidden = !showRelations || hiddenTables.has(edge.source) || hiddenTables.has(edge.target);
      
      let targetOpacity = 0.8;
      let targetStrokeDasharray: string | undefined = undefined;

      if (isDraggedFade) {
        targetOpacity = 0.15;
        targetStrokeDasharray = '5,5';
      } else if (isFilterActive) {
        if (bothFaded) {
          targetOpacity = 0.7; // Слегка приглушаем связи между НЕактивными таблицами
          targetStrokeDasharray = '5,5';
        } else {
          targetOpacity = 1.0; // Полный цвет для связей АКТИВНОЙ таблицы
          targetStrokeDasharray = undefined;
        }
      }

      const rawCached = rawEdgeCache.get(edge.id);
      const cached = edgeCache.get(edge.id);

      if (
        rawCached === edge &&
        cached &&
        cached.hidden === isHidden &&
        cached.animated === animateEdges &&
        cached.data?.edgeStyle === edgeStyle &&
        cached.data?.showMarkers === showMarkers &&
        cached.style?.opacity === targetOpacity &&
        cached.type === 'relationEdge'
      ) {
        return cached;
      }

      const newEdge = {
        ...edge,
        hidden: isHidden,
        animated: animateEdges,
        type: 'relationEdge',
        data: {
          ...edge.data,
          edgeStyle,
          showMarkers
        },
        style: {
          ...edge.style,
          opacity: targetOpacity,
          strokeDasharray: targetStrokeDasharray,
        }
      };

      rawEdgeCache.set(edge.id, edge);
      edgeCache.set(edge.id, newEdge);
      return newEdge;
    });
  }, [edges, showRelations, hiddenTables, edgeStyle, showMarkers, fadedTables, animateEdges, activeDragItems, highlightedColumns, edgeCache, rawEdgeCache]);

  return { modifiedNodes, modifiedEdges };
};
