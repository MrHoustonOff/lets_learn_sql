import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { DatabaseSchema, TableSchema } from './types';
import crashTestMock from './mock/crash_test.json';
import { Filter, Maximize2, Minimize2 } from 'lucide-react';
import { ReactFlow, Background, BackgroundVariant, Controls, useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode } from './components/TableNode';
import { HotkeysHandler } from './components/HotkeysHandler';
import { getLayoutedElements } from './layoutUtils';
import { RelationEdge } from './components/RelationEdge';
import { ViewMenu } from './components/ViewMenu';
import { FilterPanel } from './components/FilterPanel';
import { Legend } from './components/Legend';
import { TableDetailsModal } from './components/TableDetailsModal';
import { ResizeCenterKeeper } from './components/ResizeCenterKeeper';

interface DBVisualizerProps {
  schema?: DatabaseSchema;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationEdge: RelationEdge,
};

export const DBVisualizer: React.FC<DBVisualizerProps> = ({ schema, isMaximized = true, onToggleMaximize }) => {
  const [showRelations, setShowRelations] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [edgeStyle, setEdgeStyle] = useState<'bezier' | 'smoothstep'>('bezier');
  const [animateEdges, setAnimateEdges] = useState(true);
  
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set());
  const [highlightedColumns, setHighlightedColumns] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const useMock = import.meta.env.VITE_USE_MOCK === 'true' || !schema;
  const activeSchema = useMock ? (crashTestMock as unknown as DatabaseSchema) : schema;

  // Однократный расчет Dagre-layout при загрузке или смене схемы
  React.useEffect(() => {
    if (!activeSchema) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(activeSchema);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [activeSchema, setNodes, setEdges]);

  // Функция полного сброса (пересчет Dagre)
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'tableNode' && node.data?.table) {
      setSelectedTable(node.data.table as TableSchema);
    }
  }, []);

  const handleResetLayout = useCallback(() => {
    if (!activeSchema) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(activeSchema);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [activeSchema, setNodes, setEdges]);

  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Вычисляем связанные элементы при перетаскивании (считается 1 раз в начале drag)
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

  // Жесткий кэш для предотвращения перерисовок
  const [rawNodeCache] = useState(() => new Map<string, Node>());
  const [nodeCache] = useState(() => new Map<string, Node>());

  // Применяем настройки вида
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
      
      // Логика fading: если тащим узел, фейдим все, что с ним не связано
      const isDraggedFade = activeDragItems ? !activeDragItems.nodes.has(node.id) : false;
      const isFilterFade = fadedTables.has(node.id); // ИСПОЛЬЗУЕМ fadedTables!
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


  const [rawEdgeCache] = useState(() => new Map<string, Edge>());
  const [edgeCache] = useState(() => new Map<string, Edge>());

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
          targetOpacity = 0.7; // Слегка приглушаем связи между НЕактивными таблицами (по просьбе: ~0.7)
          targetStrokeDasharray = '5,5';
        } else {
          targetOpacity = 1.0; // Полный цвет для связей АКТИВНОЙ таблицы!
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

  if (!activeSchema) {
    return <div className="text-foreground p-4">No schema provided.</div>;
  }

  return (
    <div className="h-full w-full bg-background text-foreground font-sans overflow-visible relative transition-colors duration-500 flex flex-col">
      {/* Радиальное свечение под холстом */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsla(var(--glow)/var(--glow-opacity)),transparent)]"></div>
      
      <header className={`absolute top-0 left-0 right-0 flex items-start justify-between z-50 pointer-events-none transition-all duration-300 ${isMaximized ? 'p-6' : 'p-2'}`}>
        {/* Левая часть: Кнопка Фильтры и сама Панель */}
        <div className={`relative pointer-events-none flex flex-col items-start gap-2 transition-transform duration-300 origin-top-left ${isMaximized ? 'scale-100' : 'scale-[0.6]'}`}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-base transition-all shadow-sm border ${
              (hiddenTables.size > 0 || highlightedColumns.size > 0)
                ? 'bg-warning/10 text-warning-text border-warning/50 hover:bg-warning/20'
                : showFilters
                  ? 'bg-hover border-glass-border text-foreground'
                  : 'bg-glass backdrop-blur-md border-glass-border hover:bg-hover text-foreground'
            }`}
          >
            <Filter size={16} />
            <span>Фильтры</span>
          </button>
          
          {/* Сама панель фильтров (появляется под кнопкой) */}
          <div className={`absolute top-full left-0 mt-2 transition-all duration-300 origin-top-left ${showFilters ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <FilterPanel 
              schema={activeSchema}
              hiddenTables={hiddenTables}
              onChangeHiddenTables={setHiddenTables}
              highlightedColumns={highlightedColumns}
              onChangeHighlightedColumns={setHighlightedColumns}
            />
          </div>
        </div>

        {/* Правая часть: ViewMenu, ThemeToggle, Maximize */}
        <div className={`flex items-center gap-3 pointer-events-auto transition-transform duration-300 origin-top-right ${isMaximized ? 'scale-100' : 'scale-[0.6]'}`}>
          <ViewMenu 
            showRelations={showRelations}
            onToggleRelations={() => setShowRelations(!showRelations)}
            showMarkers={showMarkers}
            onToggleMarkers={() => setShowMarkers(!showMarkers)}
            showLegend={showLegend}
            onToggleLegend={() => setShowLegend(!showLegend)}
            showToolbar={showToolbar}
            onToggleToolbar={() => setShowToolbar(!showToolbar)}
            edgeStyle={edgeStyle}
            onChangeEdgeStyle={setEdgeStyle}
            animateEdges={animateEdges}
            onChangeAnimateEdges={setAnimateEdges}
            onResetLayout={handleResetLayout}
          />
          
          {onToggleMaximize && (
            <button 
              onClick={onToggleMaximize}
              title={isMaximized ? "Свернуть" : "Развернуть"}
              className="p-2.5 rounded-xl hover:bg-hover transition-colors bg-glass backdrop-blur-md border border-glass-border shadow-sm"
            >
              {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          )}
        </div>
      </header>

      <div className={`flex-1 relative z-10 ${draggedNode ? 'is-global-dragging' : ''}`}>
        <ReactFlow
          nodes={modifiedNodes}
          edges={modifiedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={(_, node) => { hoveredNodeRef.current = node.id; }}
          onNodeMouseLeave={() => { hoveredNodeRef.current = null; }}
          onNodeDragStart={(_, node) => setDraggedNode(node.id)}
          onNodeDragStop={() => setDraggedNode(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
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
          {showToolbar && (
            <Controls 
              showInteractive={false} 
              className={`custom-controls transition-all duration-300 ${isMaximized ? 'scale-100 origin-bottom-left' : 'scale-75 origin-bottom-left'}`} 
            />
          )}
          <HotkeysHandler onResetLayout={handleResetLayout} hoveredNodeRef={hoveredNodeRef} />
          {showLegend && <Legend isMaximized={isMaximized} />}
          <ResizeCenterKeeper />
        </ReactFlow>
      </div>

      {selectedTable && (
        <TableDetailsModal 
          table={selectedTable} 
          onClose={() => setSelectedTable(null)} 
        />
      )}
    </div>
  );
};
