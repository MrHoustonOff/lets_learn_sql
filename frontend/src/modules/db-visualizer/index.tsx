import React, { useState, useCallback, useRef } from 'react';
import type { DatabaseSchema, TableSchema } from './types';
import { useSchema } from './hooks/useSchema';
import { Filter, Maximize2, Minimize2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { useGraphDrag } from './hooks/useGraphDrag';
import { useGraphFilters } from './hooks/useGraphFilters';
import { type SlotId } from '../../store/uiStore';
import { DragHandle } from '../../components/workspace/DragHandle';

interface DBVisualizerProps {
  schema?: DatabaseSchema;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  slotId?: SlotId;
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationEdge: RelationEdge,
};

export const DBVisualizer: React.FC<DBVisualizerProps> = ({ schema, isMaximized = true, onToggleMaximize, onClose, slotId }) => {
  const { t } = useTranslation();
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

  const { schema: fetchedSchema, loading, error } = useSchema();
  const activeSchema = schema || fetchedSchema;

  // Загрузка сохраненного базового расположения
  const loadSavedLayout = useCallback((layoutedNodes: Node[]) => {
    if (!activeSchema) return layoutedNodes;
    try {
      const savedLayoutStr = localStorage.getItem(`db_layout_${activeSchema.name}`);
      if (savedLayoutStr) {
        const savedLayout = JSON.parse(savedLayoutStr) as Record<string, { x: number; y: number }>;
        return layoutedNodes.map(node => {
          if (savedLayout[node.id]) {
            return { ...node, position: savedLayout[node.id] };
          }
          return node;
        });
      }
    } catch (e) {
      console.error('Failed to load saved layout', e);
    }
    return layoutedNodes;
  }, [activeSchema]);

  // Первоначальное создание узлов при загрузке или смене схемы
  React.useEffect(() => {
    if (!activeSchema) return;
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(activeSchema);
      const nodesWithSavedPositions = loadSavedLayout(layoutedNodes);
      setNodes(nodesWithSavedPositions);
      setEdges(layoutedEdges);
    } catch (err: any) {
      console.error('Crash during getLayoutedElements:', err);
      // We don't have setError from useSchema here, but we can avoid crashing
    }
  }, [activeSchema, setNodes, setEdges, loadSavedLayout]);

  // Выбор таблицы
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'tableNode' && node.data?.table) {
      setSelectedTable(node.data.table as TableSchema);
    }
  }, []);

  const handleSaveLayout = useCallback(() => {
    if (!activeSchema) return;
    const layout: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      layout[node.id] = node.position;
    });
    localStorage.setItem(`db_layout_${activeSchema.name}`, JSON.stringify(layout));
  }, [activeSchema, nodes]);

  const handleResetLayout = useCallback(() => {
    if (!activeSchema) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(activeSchema);
    const nodesWithSavedPositions = loadSavedLayout(layoutedNodes);
    setNodes(nodesWithSavedPositions);
    setEdges(layoutedEdges);
  }, [activeSchema, setNodes, setEdges, loadSavedLayout]);

  const handleClearLayout = useCallback(() => {
    if (!activeSchema) return;
    localStorage.removeItem(`db_layout_${activeSchema.name}`);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(activeSchema);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [activeSchema, setNodes, setEdges]);

  const { draggedNode, setDraggedNode, activeDragItems } = useGraphDrag(edges);

  const { modifiedNodes, modifiedEdges } = useGraphFilters({
    nodes,
    edges,
    activeSchema: activeSchema as DatabaseSchema,
    hiddenTables,
    highlightedColumns,
    activeDragItems,
    showRelations,
    edgeStyle,
    showMarkers,
    animateEdges
  });

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div>{t('db_visualizer:loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background text-destructive">
        <div className="flex flex-col items-center gap-2 max-w-md text-center">
          <X size={32} />
          <div className="font-semibold text-lg">{t('db_visualizer:load_error')}</div>
          <div className="text-sm opacity-80">{error}</div>
        </div>
      </div>
    );
  }

  if (!activeSchema) {
    return <div className="text-foreground p-4">{t('db_visualizer:no_schema')}</div>;
  }

  return (
    <div className="h-full w-full bg-background text-foreground font-sans overflow-visible relative transition-colors duration-500 flex flex-col">
      {/* Радиальное свечение под холстом */}
      <div className="absolute inset-0 z-base pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsla(var(--glow)/var(--glow-opacity)),transparent)]"></div>
      
      <header className={`absolute top-0 left-0 right-0 flex items-start justify-between z-layout pointer-events-none transition-all duration-300 min-w-0 ${isMaximized ? 'p-6' : 'p-2'}`}>
        {/* Левая часть: Кнопка Фильтры и сама Панель */}
        <div className={`relative pointer-events-none flex flex-col items-start gap-2 transition-transform duration-300 origin-top-left shrink min-w-0 ${isMaximized ? 'scale-100' : 'scale-[0.6]'}`}>
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
            <span>{t('db_visualizer:filter_button')}</span>
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
        <div className={`flex items-center gap-3 pointer-events-auto transition-transform duration-300 origin-top-right shrink-0 min-w-0 ${isMaximized ? 'scale-100' : 'scale-[0.6]'}`}>
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
            onSaveLayout={handleSaveLayout}
            onResetLayout={handleResetLayout}
            onClearLayout={handleClearLayout}
          />
          
          {onToggleMaximize && (
            <button 
              onClick={onToggleMaximize}
              title={isMaximized ? t('sql_results:minimize') : t('sql_results:maximize')}
              className="p-2.5 rounded-xl hover:bg-hover transition-colors bg-glass backdrop-blur-md border border-glass-border shadow-sm outline-none focus:outline-none"
            >
              {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          )}

          {slotId && !isMaximized && (
            <div className="bg-glass backdrop-blur-md border border-glass-border rounded-xl flex items-center justify-center p-2.5 shadow-sm hover:bg-hover transition-colors">
              <DragHandle slotId={slotId} />
            </div>
          )}

          {onClose && (
            <button 
              onClick={onClose}
              title={t('close')}
              className="p-2.5 rounded-xl hover:bg-hover transition-colors bg-glass backdrop-blur-md border border-glass-border shadow-sm text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      <div className={`flex-1 relative z-base ${draggedNode ? 'is-global-dragging' : ''}`}>
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
            id="db-visualizer-background"
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
