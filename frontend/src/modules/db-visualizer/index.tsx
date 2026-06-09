import React from 'react';
import type { DatabaseSchema } from './types';
import northwindMock from './mock/northwind.json';
import { TableCard } from './components/TableCard';

interface DBVisualizerProps {
  schema?: DatabaseSchema;
}

export const DBVisualizer: React.FC<DBVisualizerProps> = ({ schema }) => {
  // Use provided schema or fallback to mock if VITE_USE_MOCK is true or schema is undefined
  const useMock = import.meta.env.VITE_USE_MOCK === 'true' || !schema;
  const activeSchema = useMock ? (northwindMock as DatabaseSchema) : schema;

  if (!activeSchema) {
    return <div className="text-white p-4">No schema provided.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-slate-300 font-sans p-8 overflow-auto relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">DB Visualizer</h1>
            <p className="text-slate-400">Interactive schema representation</p>
          </div>
          {/* Filter Panel will go here */}
        </header>

        <div className="relative">
          {/* SVG Relations Layer will go here, absolute positioned over the grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {activeSchema.tables.map((table) => (
              <TableCard key={`${table.schema}.${table.name}`} table={table} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
