import { useState, useMemo } from 'react';
import type { Edge } from '@xyflow/react';

export const useGraphDrag = (edges: Edge[]) => {
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const activeDragItems = useMemo(() => {
    if (!draggedNode) return null;
    const connectedNodes = new Set<string>();
    const connectedEdges = new Set<string>();
    
    connectedNodes.add(draggedNode);
    
    edges.forEach(edge => {
      if (edge.source === draggedNode || edge.target === draggedNode) {
        connectedEdges.add(edge.id);
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    });
    
    return { nodes: connectedNodes, edges: connectedEdges };
  }, [draggedNode, edges]);

  return { draggedNode, setDraggedNode, activeDragItems };
};
