import React, { useState, useMemo, useCallback } from 'react';
import type { DatabaseSchema, TableSchema } from './types';
import crashTestMock from './mock/crash_test.json';
import { useTheme } from '../../components/theme-provider';
import { Moon, Sun, Filter } from 'lucide-react';
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

interface DBVisualizerProps {
  schema?: DatabaseSchema;
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationEdge: RelationEdge,
};

export const DBVisualizer: React.FC<DBVisualizerProps> = ({ schema }) => {
  const { theme, setTheme } = useTheme();
  const [showRelations, setShowRelations] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [edgeStyle, setEdgeStyle] = useState<'bezier' | 'smoothstep'>('bezier');
  const [animateEdges, setAnimateEdges] = useState(true);
  
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set());
  const [highlightedColumns, setHighlightedColumns] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
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

  // Модификация узлов (скрытие + проброс подсветки)
  const modifiedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      hidden: hiddenTables.has(node.id),
      data: {
        ...node.data,
        highlightedColumns
      }
    }));
  }, [nodes, hiddenTables, highlightedColumns]);

  // Применяем настройки вида (сокрытие/стиль/маркеры)
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

  const modifiedEdges = useMemo(() => {
    return edges.map(edge => {
      const isFaded = fadedTables.has(edge.source) || fadedTables.has(edge.target);
      return {
        ...edge,
        hidden: !showRelations || hiddenTables.has(edge.source) || hiddenTables.has(edge.target),
        animated: animateEdges,
        type: 'relationEdge',
        data: {
          ...edge.data,
          edgeStyle,
          showMarkers
        },
        style: {
          ...edge.style,
          opacity: isFaded ? 0.5 : 0.8,
        }
      };
    });
  }, [edges, showRelations, hiddenTables, edgeStyle, showMarkers, fadedTables, animateEdges]);

  if (!activeSchema) {
    return <div className="text-foreground p-4">No schema provided.</div>;
  }

  return (
    <div className="h-full w-full bg-background text-foreground font-sans overflow-hidden relative transition-colors duration-500 z-0 flex flex-col">
      {/* Радиальное свечение под холстом */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsla(var(--glow)/var(--glow-opacity)),transparent)]"></div>
      
      <header className="absolute top-6 left-6 right-6 flex items-start justify-between z-20 pointer-events-none">
        {/* Левая часть: Кнопка Фильтры и сама Панель */}
        <div className="relative pointer-events-auto flex flex-col items-start gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm border ${
              (hiddenTables.size > 0 || highlightedColumns.size > 0)
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/50 hover:bg-amber-500/20'
                : showFilters
                  ? 'bg-black/10 dark:bg-white/10 border-glass-border text-foreground'
                  : 'bg-glass backdrop-blur-md border-glass-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground'
            }`}
          >
            <Filter size={16} />
            <span>Фильтры</span>
          </button>
          
          {/* Сама панель фильтров (появляется под кнопкой) */}
          <div className={`transition-all duration-300 origin-top-left ${showFilters ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <FilterPanel 
              schema={activeSchema}
              hiddenTables={hiddenTables}
              onChangeHiddenTables={setHiddenTables}
              highlightedColumns={highlightedColumns}
              onChangeHighlightedColumns={setHighlightedColumns}
            />
          </div>
        </div>

        {/* Правая часть: ViewMenu и ThemeToggle */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <ViewMenu 
            showRelations={showRelations}
            onToggleRelations={() => setShowRelations(!showRelations)}
            showMarkers={showMarkers}
            onToggleMarkers={() => setShowMarkers(!showMarkers)}
            showLegend={showLegend}
            onToggleLegend={() => setShowLegend(!showLegend)}
            edgeStyle={edgeStyle}
            onChangeEdgeStyle={setEdgeStyle}
            animateEdges={animateEdges}
            onChangeAnimateEdges={setAnimateEdges}
            onResetLayout={handleResetLayout}
          />
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors bg-glass backdrop-blur-md border border-glass-border shadow-sm"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="flex-1 relative z-10">
        <ReactFlow
          nodes={modifiedNodes}
          edges={modifiedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
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
          <Controls showInteractive={false} className="custom-controls" />
          <HotkeysHandler onResetLayout={handleResetLayout} />
          {showLegend && <Legend />}
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
