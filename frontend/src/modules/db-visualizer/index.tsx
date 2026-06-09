import React, { useMemo } from 'react';
import type { DatabaseSchema } from './types';
import northwindMock from './mock/northwind.json';
import { useTheme } from '../../components/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { ReactFlow, Background, BackgroundVariant, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode } from './components/TableNode';
import { HotkeysHandler } from './components/HotkeysHandler';
import { getLayoutedElements } from './layoutUtils';
import { RelationEdge } from './components/RelationEdge';
import { ViewMenu } from './components/ViewMenu';

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
  const [showRelations, setShowRelations] = React.useState(true);
  const [showMarkers, setShowMarkers] = React.useState(true);
  const [edgeStyle, setEdgeStyle] = React.useState<'bezier' | 'smoothstep'>('bezier');

  const useMock = import.meta.env.VITE_USE_MOCK === 'true' || !schema;
  const activeSchema = useMock ? (northwindMock as DatabaseSchema) : schema;

  const { nodes, edges } = useMemo(() => {
    if (!activeSchema) return { nodes: [], edges: [] };
    return getLayoutedElements(activeSchema);
  }, [activeSchema]);

  // Применяем настройки вида (сокрытие/стиль/маркеры)
  const modifiedEdges = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      hidden: !showRelations,
      data: { ...edge.data, edgeStyle, showMarkers }
    }));
  }, [edges, showRelations, edgeStyle, showMarkers]);

  if (!activeSchema) {
    return <div className="text-foreground p-4">No schema provided.</div>;
  }

  return (
    <div className="h-screen w-full bg-background text-foreground font-sans overflow-hidden relative transition-colors duration-500 z-0 flex flex-col">
      {/* Радиальное свечение под холстом */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsla(var(--glow)/var(--glow-opacity)),transparent)]"></div>
      
      <header className="absolute top-0 left-0 right-0 px-8 py-4 flex items-center justify-between z-20 pointer-events-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">DB Visualizer</h1>
          <p className="text-xs text-muted-foreground">Interactive schema canvas</p>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          <ViewMenu 
            showRelations={showRelations} 
            setShowRelations={setShowRelations} 
            showMarkers={showMarkers}
            setShowMarkers={setShowMarkers}
            edgeStyle={edgeStyle} 
            setEdgeStyle={setEdgeStyle} 
          />
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors bg-glass backdrop-blur-md border border-glass-border shadow-sm"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="flex-1 relative z-10">
        <ReactFlow
          nodes={nodes}
          edges={modifiedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={24} 
            size={2} 
            color="hsl(var(--foreground))" 
            style={{ opacity: theme === 'dark' ? 0.05 : 0.08 }} 
          />
          <Controls showInteractive={false} className="custom-controls" />
          <HotkeysHandler />
        </ReactFlow>
      </div>
    </div>
  );
};
