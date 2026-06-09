import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DatabaseSchema } from './types';

const nodeWidth = 350;
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

  // Счетчик для подсчета количества связей между одними и теми же таблицами
  const edgePairCount: Record<string, number> = {};

  // Create nodes
  schema.tables.forEach((table) => {
    const tableId = `${table.schema}.${table.name}`;
    
    // Calculate approximate height based on visible columns (max 10) and indexes
    const visibleColumnsCount = Math.min(table.columns.length, 10);
    const hasChevron = table.columns.length > 10;
    const chevronHeight = hasChevron ? 32 : 0;
    const approxHeight = 50 + (visibleColumnsCount * 36) + chevronHeight + (table.indexes.length > 0 ? 50 + table.indexes.length * 20 : 0);
    
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
      
      // Ищем схему целевой таблицы, если она не указана явно
      let resolvedTargetSchema = fk.targetSchema;
      if (!resolvedTargetSchema) {
        // Проверяем, есть ли таблица в той же схеме
        const inSameSchema = schema.tables.some(t => t.schema === table.schema && t.name === fk.targetTable);
        if (inSameSchema) {
          resolvedTargetSchema = table.schema;
        } else {
          // Ищем в других схемах
          const foundTable = schema.tables.find(t => t.name === fk.targetTable);
          resolvedTargetSchema = foundTable ? foundTable.schema : 'public';
        }
      }
      
      const targetId = `${resolvedTargetSchema}.${fk.targetTable}`;
      
      const edgeId = `e-${sourceId}-${fk.column}-${targetId}-${fk.targetColumn}`;

      dagreGraph.setEdge(sourceId, targetId);

      // Определяем тип связи: 1:1 или 1:M
      // Если колонка FK является уникальной ИЛИ первичным ключом, то это 1:1. Иначе 1:M.
      const columnSchema = table.columns.find(c => c.name === fk.column);
      const isOneToOne = columnSchema?.isUnique || columnSchema?.isPrimaryKey;
      const relationType = isOneToOne ? '1:1' : '1:M';

      // Вычисляем локальный индекс связи между этими двумя таблицами
      const pairKey = [sourceId, targetId].sort().join('|');
      if (edgePairCount[pairKey] === undefined) {
        edgePairCount[pairKey] = 0;
      }
      const localEdgeIndex = edgePairCount[pairKey]++;

      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        sourceHandle: `${fk.column}-source`,
        targetHandle: `${fk.targetColumn}-target`,
        type: 'relationEdge', // ИСПОЛЬЗУЕМ КАСТОМНЫЙ EDGE
        animated: true,
        data: { relationType, localEdgeIndex }, // ПЕРЕДАЕМ ТИП В DATA
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
