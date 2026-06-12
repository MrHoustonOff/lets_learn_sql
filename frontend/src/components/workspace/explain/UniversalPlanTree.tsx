import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position, 
  useNodesState, 
  useEdgesState,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useExplainStore, type FlatNode } from '../../../store/explainStore';
import { getCostLevel } from './utils';
import { NodeDetailsOverlay } from './NodeDetailsOverlay';

// Типы метрик для раскраски
type MetricType = 'NONE' | 'COST' | 'DURATION' | 'ROWS';

// Кастомный узел графа
const ExplainNodeComponent = ({ data }: { data: any }) => {
  const { 
    node, 
    flatData, 
    metric, 
    rootTree,
    isHovered,
    setHoveredNode
  } = data;
  
  const nodeType = node["Node Type"];
  
  const duration = node['Actual Total Time'];
  const rows = node['Actual Rows'] !== undefined ? node['Actual Rows'] * (node['Actual Loops'] || 1) : node['Plan Rows'];
  
  // Выбор цвета бордера в зависимости от метрики
  let colorKey = 'none';
  if (metric === 'COST' && flatData) {
    colorKey = getCostLevel(flatData.cost_pct);
  } else if (metric === 'DURATION' && data.maxTime > 0) {
    const dur = duration || 0;
    colorKey = getCostLevel((dur / data.maxTime) * 100);
  } else if (metric === 'ROWS' && data.maxRows > 0) {
    const r = rows || 0;
    colorKey = getCostLevel((r / data.maxRows) * 100);
  }

  let cardClass = 'bg-[hsl(var(--glass-bg))] border-glass-border text-foreground';
  let titleClass = 'text-foreground';
  let textClass = 'text-muted-foreground';

  if (colorKey === 'bad') {
    cardClass = 'bg-destructive/20 border-destructive shadow-[0_0_15px_rgba(220,38,38,0.2)] text-foreground';
    titleClass = 'text-red-400';
  } else if (colorKey === 'warning') {
    cardClass = 'bg-amber-500/20 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-foreground';
    titleClass = 'text-amber-400';
  } else if (colorKey === 'good') {
    cardClass = 'bg-emerald-500/20 border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-foreground';
    titleClass = 'text-emerald-400';
  }

  const isDimmed = data.isDimmed;

  return (
    <div
      className={`relative min-w-[200px] backdrop-blur-md rounded-xl border shadow-lg p-3 cursor-pointer transition-all duration-200 ${cardClass} ${isHovered ? 'ring-4 ring-primary/50 scale-[1.05]' : 'hover:scale-[1.02]'} ${isDimmed ? 'opacity-30 grayscale-[30%]' : ''}`}
      onMouseEnter={() => setHoveredNode(node.node_id)}
      onMouseLeave={() => setHoveredNode(null)}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-bold text-sm flex items-center gap-1.5 ${titleClass}`}>
          {nodeType}
        </h3>
      </div>

      <div className={`flex flex-col gap-0.5 text-xs font-mono mt-2 ${textClass}`}>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Time:</span>
          <span className="font-semibold">{duration !== undefined ? `${duration.toFixed(2)} ms` : '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Rows:</span>
          <span className="font-semibold">{rows !== undefined ? Math.round(rows).toLocaleString() : '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Cost:</span>
          <span className="font-semibold">{node['Total Cost'] !== undefined ? node['Total Cost'].toFixed(2) : '—'}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { explainNode: ExplainNodeComponent };

interface UniversalPlanTreeInnerProps {
  onClose?: () => void;
}

const UniversalPlanTreeInner: React.FC<UniversalPlanTreeInnerProps> = ({ onClose }) => {
  const { slot1 } = useExplainStore();
  const rootTree = slot1?.plan_parsed?.tree;
  const flatNodes = slot1?.plan_parsed?.flat_nodes || [];
  const { fitView } = useReactFlow();
  
  const [metric, setMetric] = useState<MetricType>('DURATION');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const flatNodesMap = useMemo(() => {
    const map = new Map<string, FlatNode>();
    flatNodes.forEach(fn => map.set(fn.node_id, fn));
    return map;
  }, [flatNodes]);

  // nodeId → parentId (для быстрого поиска предков/потомков)
  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    const traverse = (node: any, parentId: string | null) => {
      if (parentId) map.set(node.node_id, parentId);
      if (node.Plans) node.Plans.forEach((child: any) => traverse(child, node.node_id));
    };
    if (rootTree) traverse(rootTree, null);
    return map;
  }, [rootTree]);

  // Возвращает множество id всех потомков узла
  const getDescendants = useCallback((nodeId: string): Set<string> => {
    const result = new Set<string>();
    const findNode = (n: any, targetId: string): any => {
      if (n.node_id === targetId) return n;
      if (n.Plans) { for (const c of n.Plans) { const f = findNode(c, targetId); if (f) return f; } }
      return null;
    };
    const subtree = rootTree ? findNode(rootTree, nodeId) : null;
    if (!subtree?.Plans) return result;
    const collect = (n: any) => { result.add(n.node_id); if (n.Plans) n.Plans.forEach(collect); };
    subtree.Plans.forEach(collect);
    return result;
  }, [rootTree]);

  // Возвращает множество id всех предков узла
  const getAncestors = useCallback((nodeId: string): Set<string> => {
    const result = new Set<string>();
    let current = parentMap.get(nodeId);
    while (current) { result.add(current); current = parentMap.get(current); }
    return result;
  }, [parentMap]);

  const { maxTime, maxRows } = useMemo(() => {
    let mt = 0;
    let mr = 0;
    if (!rootTree) return { maxTime: 0, maxRows: 0 };
    
    const traverse = (n: any) => {
      const dur = n['Actual Total Time'] || 0;
      const r = n['Actual Rows'] !== undefined ? n['Actual Rows'] * (n['Actual Loops'] || 1) : (n['Plan Rows'] || 0);
      if (dur > mt) mt = dur;
      if (r > mr) mr = r;
      if (n.Plans) n.Plans.forEach(traverse);
    };
    traverse(rootTree);
    return { maxTime: mt, maxRows: mr };
  }, [rootTree]);

  // Генерация графа
  useEffect(() => {
    if (!rootTree) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const traverse = (node: any, parentId: string | null = null) => {
      const id = node.node_id;
      
      // Добавляем узел в dagre
      g.setNode(id, { width: 250, height: 100 });
      
      // Рекурсия для детей
      if (node.Plans) {
        node.Plans.forEach((child: any) => {
          traverse(child, id);
        });
      }
      
      if (parentId) {
        g.setEdge(parentId, id);
        newEdges.push({
          id: `e-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2, opacity: 0.5 },
        });
      }
    };

    traverse(rootTree);
    dagre.layout(g);

    g.nodes().forEach((id) => {
      const nodePos = g.node(id);
      if (!nodePos) return; // safety check
      
      // Ищем сам узел в дереве для проброса данных
      const findNode = (n: any, targetId: string): any => {
        if (n.node_id === targetId) return n;
        if (n.Plans) {
          for (const child of n.Plans) {
            const found = findNode(child, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      const originalNode = findNode(rootTree, id);
      const flatData = flatNodesMap.get(id);

      newNodes.push({
        id,
        type: 'explainNode',
        position: { x: nodePos.x - 125, y: nodePos.y - 50 }, // Центрирование
        data: { 
          node: originalNode, 
          flatData, 
          metric, 
          rootTree,
          maxTime,
          maxRows,
          isHovered: id === hoveredNodeId,
          setHoveredNode: setHoveredNodeId
        },
        draggable: false, // Запрет на перетаскивание
        selectable: false,
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    
    // После небольшой задержки для рендера делаем fitView
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [rootTree, flatNodesMap, setNodes, setEdges, fitView]); // Не добавляем metric и hoveredNodeId сюда, иначе пересчитывается layout

  // Обновляем data у узлов + стили рёбер при изменении метрики или ховера
  useEffect(() => {
    const descendants = hoveredNodeId ? getDescendants(hoveredNodeId) : new Set<string>();
    const ancestors = hoveredNodeId ? getAncestors(hoveredNodeId) : new Set<string>();
    const hasHover = hoveredNodeId !== null;

    setNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        metric,
        maxTime,
        maxRows,
        isHovered: n.id === hoveredNodeId,
        isDimmed: hasHover && n.id !== hoveredNodeId && !descendants.has(n.id) && !ancestors.has(n.id),
        setHoveredNode: setHoveredNodeId
      }
    })));

    setEdges(eds => eds.map(e => {
      // e.source = parent, e.target = child
      // Подсвечиваем рёбра от hovered-узла вниз к потомкам
      const isHighlighted = hoveredNodeId && (e.source === hoveredNodeId || descendants.has(e.source));
      // Тусклые — рёбра предков (выше hovered-узла)
      const isAncestorEdge = hasHover && !isHighlighted && ancestors.has(e.source);

      if (!hasHover) {
        return { ...e, animated: true, style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2, opacity: 0.5 } };
      }
      if (isHighlighted) {
        return {
          ...e,
          animated: true,
          style: {
            stroke: 'hsl(var(--primary))',
            strokeWidth: 2.5,
            opacity: 1,
            filter: 'drop-shadow(0 0 6px hsl(var(--primary)))',
          }
        };
      }
      if (isAncestorEdge) {
        return { ...e, animated: false, style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5, opacity: 0.2 } };
      }
      return { ...e, animated: false, style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5, opacity: 0.15 } };
    }));
  }, [metric, hoveredNodeId, maxTime, maxRows, setNodes, setEdges, getDescendants, getAncestors]);

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус в инпутах
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (hoveredNodeId) {
          fitView({ nodes: [{ id: hoveredNodeId }], duration: 500, padding: 0.5 });
        } else {
          fitView({ duration: 500, padding: 0.2 });
        }
      }
      
      if (e.key === 'Escape') {
        if (selectedNodeId) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedNodeId(null);
        } else if (onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [fitView, hoveredNodeId, selectedNodeId, onClose]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setHoveredNodeId(null); // Сбрасываем ховер при открытии модалки, чтобы он не "залипал"
  }, []);

  const onPaneClick = useCallback(() => {
    setHoveredNodeId(null);
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="h-full w-full bg-background text-foreground font-sans overflow-visible relative transition-colors duration-500 flex flex-col">
      {/* Радиальное свечение под холстом как в DB Viewer */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsla(var(--glow)/var(--glow-opacity)),transparent)]"></div>
      
      {/* Панель переключения метрик */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center bg-glass backdrop-blur-md border border-glass-border p-1 rounded-xl shadow-lg">
        <button
          onClick={() => setMetric('NONE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${metric === 'NONE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-hover'}`}
        >
          NONE
        </button>
        <button
          onClick={() => setMetric('COST')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${metric === 'COST' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-hover'}`}
        >
          COST
        </button>
        <button
          onClick={() => setMetric('DURATION')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${metric === 'DURATION' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-hover'}`}
        >
          TIME
        </button>
        <button
          onClick={() => setMetric('ROWS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${metric === 'ROWS' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-hover'}`}
        >
          ROWS
        </button>
      </div>

      <div className="flex-1 relative z-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesSelectable={false}
          edgesSelectable={false}
          onPaneClick={onPaneClick}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={24} 
            size={2} 
            color="currentColor" 
            className="opacity-10 dark:opacity-20"
          />
          <Controls 
            showInteractive={false} 
            className="custom-controls transition-all duration-300 scale-100 origin-bottom-left" 
          />
        </ReactFlow>
      </div>

      {selectedNodeId && (
        <NodeDetailsOverlay
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
          rootTree={rootTree}
          flatNodesMap={flatNodesMap}
          flatNodes={flatNodes}
          onNavigate={() => {}} // Navigation removed per user instruction
        />
      )}
    </div>
  );
};

export const UniversalPlanTree: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <ReactFlowProvider>
    <UniversalPlanTreeInner onClose={onClose} />
  </ReactFlowProvider>
);
