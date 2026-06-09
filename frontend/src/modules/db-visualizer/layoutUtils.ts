import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DatabaseSchema } from './types';

const nodeWidth = 320;
const nodeHeight = 250;

export const getLayoutedElements = (schema: DatabaseSchema, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 50,
    ranksep: 200,
  });

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create nodes
  schema.tables.forEach((table) => {
    const tableId = `${table.schema}.${table.name}`;
    
    // Calculate approximate height based on columns and indexes (max 300px for columns due to scroll)
    const columnsHeight = Math.min(table.columns.length * 36, 300);
    const approxHeight = 50 + columnsHeight + (table.indexes.length > 0 ? 50 + table.indexes.length * 20 : 0);
    
    dagreGraph.setNode(tableId, { width: nodeWidth, height: approxHeight });

    nodes.push({
      id: tableId,
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: { table },
    });

    // Create edges for foreign keys
    table.foreignKeys.forEach((fk) => {
      const sourceId = tableId;
      const targetId = `${table.schema}.${fk.targetTable}`; // assuming target is in same schema
      
      const edgeId = `e-${sourceId}-${fk.column}-${targetId}-${fk.targetColumn}`;

      dagreGraph.setEdge(sourceId, targetId);

      // Определяем тип связи: 1:1 или 1:M
      // Если колонка FK является уникальной ИЛИ первичным ключом, то это 1:1. Иначе 1:M.
      const columnSchema = table.columns.find(c => c.name === fk.column);
      const isOneToOne = columnSchema?.isUnique || columnSchema?.isPrimaryKey;
      const relationType = isOneToOne ? '1:1' : '1:M';

      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        sourceHandle: `${fk.column}-source`,
        targetHandle: `${fk.targetColumn}-target`,
        type: 'relationEdge', // ИСПОЛЬЗУЕМ КАСТОМНЫЙ EDGE
        animated: true,
        data: { relationType }, // ПЕРЕДАЕМ ТИП В DATA
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, opacity: 0.8 },
      });
    });
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
