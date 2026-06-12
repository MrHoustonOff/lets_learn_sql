import React, { useState, useMemo } from 'react';

import { Info, AlertTriangle, Loader2, CheckCircle2, ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, ChevronDown, Network } from 'lucide-react';
import { useExplainStore, type FlatNode } from '../../../store/explainStore';
import { ExplainModal } from '../ExplainModal';
import { getCostColor } from './utils';
import { NodeDetailsOverlay } from './NodeDetailsOverlay';

import pgExplainDocs from '../../../i18n/pg_explain_docs.json';
import explainFieldsDocs from '../../../i18n/explain_fields_i18n.json';

import { InfoTooltip } from '../../ui/InfoTooltip';
import { PlanTree } from './parts/PlanTextTree';
import { PipelineView, usePipelineData } from './parts/PipelineView';

// Хелпер для поиска узла в дереве






type SortKey = 'step' | 'metric';
type SortDirection = 'asc' | 'desc';

export const MiniExplainPanel: React.FC = () => {
  const { slot1, isLoading } = useExplainStore();
  
  const [sortKey, setSortKey] = useState<SortKey>('metric');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeMetric, setActiveMetric] = useState<'cost' | 'time'>('cost');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(true);
  const [isPlanTreeOpen, setIsPlanTreeOpen] = useState(true);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [activePipelineNodeIds, setActivePipelineNodeIds] = useState<string[]>([]);
  const [clickedBranchId, setClickedBranchId] = useState<string | null>(null);

  const pipelineData = usePipelineData(slot1?.plan_parsed?.tree);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedNodes = useMemo(() => {
    if (!slot1?.plan_parsed?.flat_nodes) return [];
    
    return [...slot1.plan_parsed.flat_nodes].sort((a, b) => {
      if (sortKey === 'step') {
        return sortDirection === 'asc' 
          ? a.step_number - b.step_number 
          : b.step_number - a.step_number;
      } else {
        const valA = activeMetric === 'time' ? (a.actual_time || 0) : a.cost;
        const valB = activeMetric === 'time' ? (b.actual_time || 0) : b.cost;
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });
  }, [slot1, sortKey, sortDirection, activeMetric]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground bg-background">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p>Анализ плана выполнения...</p>
      </div>
    );
  }

  if (!slot1 || !slot1.plan_parsed) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground bg-background">
        <Info size={32} className="mb-4 opacity-50" />
        <p>Выполните запрос, чтобы увидеть анализ плана</p>
      </div>
    );
  }

  const { planning_time } = slot1.plan_parsed;

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />;
  };

  const flatNodesMap = new Map(sortedNodes.map(n => [n.node_id, n]));

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      {selectedNodeId && (
        <NodeDetailsOverlay 
          nodeId={selectedNodeId} 
          onClose={() => setSelectedNodeId(null)} 
          rootTree={slot1.plan_parsed.tree} 
          flatNodesMap={flatNodesMap}
          flatNodes={slot1.plan_parsed.flat_nodes}
          onNavigate={setSelectedNodeId}
        />
      )}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        
        {/* Performance Breakdown Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none group flex-1"
              onClick={() => setIsCostBreakdownOpen(!isCostBreakdownOpen)}
            >
              <div className="flex items-center gap-1">
                {isCostBreakdownOpen ? <ChevronDown size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />}
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  Performance Breakdown
                </h3>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <InfoTooltip text="Относительное распределение ресурсов на узлах дерева" />
              </div>
            </div>

            {/* Toggle COST/TIME */}
            {slot1?.plan_parsed?.tree['Actual Total Time'] !== undefined && (
              <div className="flex gap-1 bg-black/10 dark:bg-white/5 border border-glass-border p-0.5 rounded-md text-[10px] font-bold">
                <button 
                  onClick={() => { setActiveMetric('cost'); setSortKey('metric'); }}
                  className={`px-3 py-1 uppercase rounded transition-colors ${activeMetric === 'cost' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  COST
                </button>
                <button 
                  onClick={() => { setActiveMetric('time'); setSortKey('metric'); }}
                  className={`px-3 py-1 uppercase rounded transition-colors ${activeMetric === 'time' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  TIME
                </button>
              </div>
            )}
          </div>
          
          {isCostBreakdownOpen && (
            <div className="bg-black/5 dark:bg-white/5 border border-glass-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/10 dark:bg-white/10 border-b border-glass-border">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Операция
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/2">
                    Влияние
                  </th>
                  <th 
                    className="px-3 py-2 text-right text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-28"
                    onClick={() => handleSort('metric')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {renderSortIcon('metric')}
                      {activeMetric === 'time' ? 'Time' : 'Cost'}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {sortedNodes.map((node, idx) => {
                  const rootTime = slot1?.plan_parsed?.tree['Actual Total Time'];
                  const pct = activeMetric === 'time' && rootTime
                    ? ((node.actual_time || 0) / rootTime) * 100
                    : node.cost_pct;
                  
                  const colorClass = getCostColor(pct);
                  
                  // Разделяем тип узла и объект (если есть стрелочка)
                  const [nodeType, objectName] = node.operation.split(' → ');

                  return (
                    <tr 
                      key={idx} 
                      className="hover:bg-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedNodeId(node.node_id)}
                    >
                      <td className="px-3 py-2 text-foreground font-medium flex items-center gap-2">
                        <span>
                          {nodeType} {objectName && <span className="text-muted-foreground font-normal">→ {objectName}</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex items-center">
                          <div className={`h-full ${colorClass}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono flex items-center justify-end gap-2 text-xs">
                        {activeMetric === 'time' ? `${(node.actual_time || 0).toFixed(2)} ms` : node.cost.toFixed(2)}
                        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </section>

        {/* Plan Tree Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none group"
              onClick={() => setIsPlanTreeOpen(!isPlanTreeOpen)}
            >
              <div className="flex items-center gap-1">
                {isPlanTreeOpen ? <ChevronDown size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />}
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  Plan Tree
                </h3>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <InfoTooltip text={explainFieldsDocs.fields.plan_tree.ru} />
              </div>
            </div>
            
            <button 
              onClick={() => setIsGraphModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors"
            >
              <Network size={12} />
              Графовое представление
            </button>
          </div>
          
          {isPlanTreeOpen && (
            <div 
              className="font-mono text-sm bg-black/5 dark:bg-white/5 border border-glass-border rounded-lg p-4 space-y-1 cursor-default"
              onClick={() => {
                setClickedBranchId(null);
                setActivePipelineNodeIds([]);
              }}
            >
              
              <PipelineView 
                pipelineData={pipelineData} 
                activePipelineNodeIds={activePipelineNodeIds}
                setActivePipelineNodeIds={setActivePipelineNodeIds}
                setClickedBranchId={setClickedBranchId}
                setSelectedNodeId={setSelectedNodeId}
              />

              <PlanTree
                rootTree={slot1.plan_parsed.tree}
                flatNodesMap={flatNodesMap}
                onSelectNode={setSelectedNodeId}
                clickedBranchId={clickedBranchId}
                setClickedBranchId={setClickedBranchId}
                activePipelineNodeIds={activePipelineNodeIds}
                setActivePipelineNodeIds={setActivePipelineNodeIds}
              />
            </div>
          )}
        </section>

      </div>

      {/* Bottom Status Bar */}
      <div className="shrink-0 border-t border-glass-border bg-hover flex flex-col justify-center px-4 py-2 min-h-[40px] text-xs">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1 w-full max-w-full">
            {slot1.plan_parsed.diagnostics && slot1.plan_parsed.diagnostics.length > 0 ? (
              slot1.plan_parsed.diagnostics.map((diag, idx) => {
                let Icon = CheckCircle2;
                let colorClass = "text-emerald-500";
                
                if (diag.severity === "warning") {
                  Icon = AlertTriangle;
                  colorClass = "text-warning";
                } else if (diag.severity === "critical") {
                  Icon = AlertTriangle;
                  colorClass = "text-destructive";
                } else if (diag.severity === "info") {
                  Icon = Info;
                  colorClass = "text-primary";
                }

                return (
                  <div key={idx} className={`flex items-start gap-2 ${colorClass}`}>
                    <Icon size={14} className="shrink-0 mt-0.5" />
                    <span className="font-medium truncate" title={diag.message}>{diag.message}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="font-medium">Анализ завершен, замечаний нет</span>
              </div>
            )}
          </div>
          
          <div className="text-muted-foreground font-mono whitespace-nowrap ml-4 flex flex-col items-end">
            <div>Planning: {planning_time.toFixed(2)} ms</div>
            <div>Execution: {slot1.plan_parsed.execution_time.toFixed(2)} ms</div>
          </div>
        </div>
      </div>
      
      <ExplainModal 
        isOpen={isGraphModalOpen} 
        onClose={() => setIsGraphModalOpen(false)} 
      />
    </div>
  );
};
