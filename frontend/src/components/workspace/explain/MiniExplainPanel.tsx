import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info, AlertTriangle, Loader2, CheckCircle2, ArrowDown, ArrowUp, ArrowUpDown, X, ChevronLeft, ChevronRight, Copy, Check, ChevronDown, Activity, Network } from 'lucide-react';
import { useExplainStore, type FlatNode } from '../../../store/explainStore';
import { ExplainModal } from '../ExplainModal';
import { findNodeById, getCostColor } from './utils';
import { NodeDetailsOverlay } from './NodeDetailsOverlay';

import pgExplainDocs from '../../../i18n/pg_explain_docs.json';
import explainFieldsDocs from '../../../i18n/explain_fields_i18n.json';

import { InfoTooltip } from '../../ui/InfoTooltip';

// Хелпер для поиска узла в дереве


const BRANCH_COLORS = [
  'bg-blue-500/50',
  'bg-emerald-500/50',
  'bg-purple-500/50',
  'bg-amber-500/50',
  'bg-pink-500/50',
  'bg-cyan-500/50',
  'bg-rose-500/50',
];

const getDescendantsMetrics = (node: any): { count: number, maxCost: number } => {
  let count = 0;
  let maxCost = node["Total Cost"] || 0;
  if (node.Plans) {
    for (const child of node.Plans) {
      count += 1;
      const childMetrics = getDescendantsMetrics(child);
      count += childMetrics.count;
      maxCost = Math.max(maxCost, childMetrics.maxCost);
    }
  }
  return { count, maxCost };
};

const SQL_ORDER = [
  'FROM', 'JOIN', 'WHERE', 
  'GROUP BY', 'HAVING', 'WINDOW', 
  'SUBQUERY', 'ORDER BY', 'LIMIT'
];

interface PipelineStep {
  clause: string;
  nodeIds: string[];
}

interface PipelineBranch {
  label: string;
  steps: PipelineStep[];
}

function containsNodeType(node: any, typeName: string): boolean {
  if (node['Node Type'] === typeName) return true;
  if (!node.Plans) return false;
  return node.Plans.some((child: any) => containsNodeType(child, typeName));
}

function countNodeType(node: any, typeName: string): number {
  let count = node['Node Type'] === typeName ? 1 : 0;
  if (node.Plans) {
    for (const child of node.Plans) {
      count += countNodeType(child, typeName);
    }
  }
  return count;
}

function getPipelineMode(rootNode: any): 'simple' | 'complex' {
  const hasSubquery = containsNodeType(rootNode, 'Subquery Scan');
  const hasCTE = containsNodeType(rootNode, 'CTE Scan');
  const hasMultipleAggregates = countNodeType(rootNode, 'Aggregate') > 1;
  
  if (hasSubquery || hasCTE || hasMultipleAggregates) {
    return 'complex';
  }
  return 'simple';
}

function detectBranchLabel(node: any): string {
  if (containsNodeType(node, 'WindowAgg')) return 'Subquery / Window';
  if (containsNodeType(node, 'Aggregate')) return 'Subquery / Group';
  if (node['Node Type'] === 'Subquery Scan') return 'Subquery';
  if (node['Node Type'] === 'CTE Scan') return 'CTE';
  return 'Branch';
}

function toClause(node: any): string | null {
  const type = node['Node Type'];
  const filter = node['Filter'] || null;

  const cleanCond = (cond: string | null) => {
    if (!cond) return null;
    return cond.replace(/\b[a-zA-Z_]+\d*\.([a-zA-Z_]+)\b/g, '$1');
  };

  switch (type) {
    case 'Seq Scan':
    case 'Index Scan':
    case 'Index Only Scan':
    case 'Bitmap Heap Scan':
      if (filter) {
        return `FROM ${node['Relation Name']} WHERE ${cleanCond(filter)}`;
      }
      return `FROM ${node['Relation Name']}`;

    case 'Hash Join':
      return node['Hash Cond'] ? `JOIN ON ${cleanCond(node['Hash Cond'])}` : `JOIN`;

    case 'Merge Join':
      return node['Merge Cond'] ? `JOIN ON ${cleanCond(node['Merge Cond'])}` : `JOIN`;

    case 'Nested Loop':
      if (node['Join Filter']) {
        return `JOIN ON ${cleanCond(node['Join Filter'])}`;
      }
      return `JOIN`;

    case 'Aggregate':
      return `GROUP BY`;

    case 'WindowAgg':
      return `WINDOW`;

    case 'Subquery Scan':
      return `SUBQUERY`;

    case 'Limit':
      return `LIMIT`;

    case 'Sort':
    case 'Incremental Sort':
      return `ORDER BY`;

    case 'Hash':
    case 'Materialize':
    case 'Memoize':
    case 'Gather':
    case 'Gather Merge':
    case 'Bitmap Index Scan':
      return null;

    default:
      return null;
  }
}

interface PlanTreeNodeProps {
  node: any;
  flatNodesMap: Map<string, FlatNode>;
  lineColorsMap: Map<string, string>;
  isLast: boolean;
  isRoot?: boolean;
  onSelectNode: (nodeId: string) => void;
  clickedBranchId: string | null;
  setClickedBranchId: (id: string | null) => void;
  activePipelineNodeIds: string[];
  setActivePipelineNodeIds: (ids: string[]) => void;
}

const PlanTreeNode: React.FC<PlanTreeNodeProps> = ({ 
  node, flatNodesMap, lineColorsMap, isLast, isRoot = false, onSelectNode,
  clickedBranchId, setClickedBranchId,
  activePipelineNodeIds, setActivePipelineNodeIds,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nodeId = node.node_id;

  const branchColor = lineColorsMap.get(nodeId) || 'bg-glass-border';

  const flatData = flatNodesMap.get(nodeId);
  const costColorClass = flatData ? getCostColor(flatData.cost_pct) : 'bg-muted';
  
  const nodeType = node["Node Type"];
  const relation = node["Relation Name"];
  const index = node["Index Name"];
  const objectName = index || relation;
  
  const filter = node["Filter"] || node["Index Cond"] || node["Hash Cond"];
  const children = node["Plans"] || [];

  const isPipelineHighlight = activePipelineNodeIds.length > 0 && activePipelineNodeIds.includes(nodeId);
  const isBranchHighlight = clickedBranchId ? nodeId.startsWith(clickedBranchId) : false;
  
  const isHighlighted = isPipelineHighlight || isBranchHighlight;
  const isDimmed = (activePipelineNodeIds.length > 0 || clickedBranchId) && !isHighlighted;

  return (
    <div className={`relative group transition-colors duration-200 ${!isRoot ? 'pl-6' : ''}`}>
      {/* Линии отступов для не-корневых узлов */}
      {!isRoot && (
        <>
          {/* Вертикальная линия от родителя (проходит насквозь, если не последний) */}
          <div className={`absolute left-[11px] top-0 ${isLast ? 'bottom-1/2' : 'bottom-[-4px]'} w-[2px] ${branchColor}`} />
          {/* Горизонтальная линия к этому узлу */}
          <div className={`absolute left-[11px] top-[14px] w-3 h-[2px] ${branchColor}`} />
        </>
      )}

      <div 
        className={`flex flex-col hover:bg-hover p-1 -mx-1 rounded relative z-10 cursor-pointer transition-colors ${clickedBranchId === nodeId ? 'ring-1 ring-primary/50 bg-primary/10' : ''} ${isHighlighted ? 'bg-primary/5 ring-1 ring-primary/20' : ''} ${isDimmed ? 'opacity-40 grayscale-[50%]' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setActivePipelineNodeIds([]);
          setClickedBranchId(null);
          onSelectNode(nodeId);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {children.length > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                className="p-0.5 hover:bg-foreground/10 rounded transition-colors text-muted-foreground hover:text-foreground shrink-0"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <div className={`w-2 h-2 rounded-full ${costColorClass} shrink-0 ${children.length === 0 ? 'ml-5' : ''}`} />
            <span className="font-semibold text-foreground">{nodeType}</span>
            {objectName && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary">{objectName}</span>
              </>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground ml-4 shrink-0">
            <span>cost: {node["Total Cost"]?.toFixed(2)}</span>
            <span>rows~: {node["Plan Rows"]}</span>
          </div>
        </div>
        
        {!isCollapsed && filter && (
          <div className="text-xs text-muted-foreground pl-6 ml-5 mt-0.5 opacity-70 truncate max-w-lg">
            Filter/Cond: {filter}
          </div>
        )}
      </div>

      {/* Рендер детей */}
      {!isCollapsed && children.length > 0 && (
        <div className="relative mt-1">
          {children.map((child: any, idx: number) => {
            return (
              <div key={idx}>
                {idx > 0 && <div className="ml-6 border-t border-glass-border/20 my-1" />}
                <PlanTreeNode 
                  node={child} 
                  flatNodesMap={flatNodesMap} 
                  lineColorsMap={lineColorsMap}
                  isLast={idx === children.length - 1} 
                  onSelectNode={onSelectNode}
                  clickedBranchId={clickedBranchId}
                  setClickedBranchId={setClickedBranchId}
                  activePipelineNodeIds={activePipelineNodeIds}
                  setActivePipelineNodeIds={setActivePipelineNodeIds}
                />
              </div>
            );
          })}
        </div>
      )}

      {isCollapsed && children.length > 0 && (() => {
        const metrics = getDescendantsMetrics(node);
        return (
          <div className="text-xs text-muted-foreground/60 italic pl-6 ml-5 mt-1 pb-2">
            [свёрнуто: {metrics.count} узлов, макс. стоимость: {metrics.maxCost.toFixed(2)}]
          </div>
        );
      })()}
    </div>
  );
};



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

  const pipelineData = useMemo(() => {
    if (!slot1?.plan_parsed?.tree) return { mode: 'simple' as const, steps: [], branches: [], finalSteps: [] };
    
    interface RawStep { clause: string; nodeId: string; }
    
    function collectSteps(n: any): RawStep[] {
      const steps: RawStep[] = [];
      const children = n.Plans || [];
      for (const child of children) {
        steps.push(...collectSteps(child));
      }
      const clause = toClause(n);
      if (clause) {
        steps.push({ clause, nodeId: n.node_id });
      }
      return steps;
    }

    function deduplicateAndSortSteps(rawSteps: RawStep[]): PipelineStep[] {
      const seen = new Map<string, PipelineStep>();
      for (const step of rawSteps) {
        if (seen.has(step.clause)) {
          seen.get(step.clause)!.nodeIds.push(step.nodeId);
        } else {
          seen.set(step.clause, { clause: step.clause, nodeIds: [step.nodeId] });
        }
      }
      
      const deduped = Array.from(seen.values());

      // Merge plain 'JOIN' into 'JOIN ON ...' if both exist
      const plainJoinIndex = deduped.findIndex(s => s.clause === 'JOIN');
      const joinOnIndex = deduped.findIndex(s => s.clause.startsWith('JOIN ON'));
      
      if (plainJoinIndex !== -1 && joinOnIndex !== -1) {
        deduped[joinOnIndex].nodeIds.push(...deduped[plainJoinIndex].nodeIds);
        deduped.splice(plainJoinIndex, 1);
      }

      return deduped.sort((a, b) => {
        const aIndex = SQL_ORDER.findIndex(c => a.clause.startsWith(c));
        const bIndex = SQL_ORDER.findIndex(c => b.clause.startsWith(c));
        const safeA = aIndex === -1 ? 99 : aIndex;
        const safeB = bIndex === -1 ? 99 : bIndex;
        return safeA - safeB;
      });
    }

    const mode = getPipelineMode(slot1.plan_parsed.tree);

    if (mode === 'simple') {
      const rawSteps = collectSteps(slot1.plan_parsed.tree);
      return {
        mode: 'simple' as const,
        steps: deduplicateAndSortSteps(rawSteps),
        branches: [],
        finalSteps: []
      };
    }

    // Complex mode
    let splitNode = slot1.plan_parsed.tree;
    const finalRawSteps: RawStep[] = [];
    
    while (splitNode && (!splitNode.Plans || splitNode.Plans.length < 2)) {
      const clause = toClause(splitNode);
      if (clause) {
        finalRawSteps.push({ clause, nodeId: splitNode.node_id });
      }
      if (splitNode.Plans && splitNode.Plans.length === 1) {
        splitNode = splitNode.Plans[0];
      } else {
        break;
      }
    }

    const branches: PipelineBranch[] = [];
    if (splitNode && splitNode.Plans && splitNode.Plans.length >= 2) {
      for (const child of splitNode.Plans) {
        branches.push({
          label: detectBranchLabel(child),
          steps: deduplicateAndSortSteps(collectSteps(child))
        });
      }
      const splitClause = toClause(splitNode);
      if (splitClause) {
        finalRawSteps.push({ clause: splitClause, nodeId: splitNode.node_id });
      }
    } else if (splitNode) {
      // If it doesn't really branch, but was marked complex
      const clause = toClause(splitNode);
      if (clause) {
        finalRawSteps.push({ clause, nodeId: splitNode.node_id });
      }
    }

    return {
      mode: 'complex' as const,
      steps: [],
      branches,
      finalSteps: deduplicateAndSortSteps(finalRawSteps)
    };
  }, [slot1]);

  const lineColorsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!slot1?.plan_parsed?.tree) return map;
    
    let colorIndex = 0;

    const assignColors = (node: any, inheritedColor: string) => {
      map.set(node.node_id, inheritedColor);
      const children = node.Plans || [];
      
      if (children.length === 0) return;
      
      if (children.length === 1) {
        assignColors(children[0], inheritedColor);
        return;
      }
      
      children.forEach((child: any) => {
        const color = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
        colorIndex++;
        assignColors(child, color);
      });
    };

    assignColors(slot1.plan_parsed.tree, 'bg-glass-border');
    return map;
  }, [slot1]);

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
              
              {/* Query Pipeline */}
              {(pipelineData.steps.length > 0 || pipelineData.branches.length > 0) && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2 select-none">
                    <Info size={12} className="shrink-0" />
                    <span>Упрощенная структура (эти данные могут быть немного неточные в отличии от дерева снизу)</span>
                  </div>
                  {pipelineData.mode === 'simple' ? (
                    <div className="flex flex-wrap items-center gap-1 px-1">
                      {pipelineData.steps.map((step, i) => {
                        const isActive = step.nodeIds.every(id => activePipelineNodeIds.includes(id));
                        return (
                          <React.Fragment key={step.nodeIds.join(',')}>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedBranchId(null);
                                setActivePipelineNodeIds(step.nodeIds);
                                setSelectedNodeId(null);
                              }}
                              className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${isActive ? 'bg-primary/20 text-primary font-medium' : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 hover:dark:bg-white/10'}`}
                            >
                              {step.clause}
                            </span>
                            {i < pipelineData.steps.length - 1 && (
                              <span className="text-muted-foreground/40 text-xs">→</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        {pipelineData.branches.map((branch, branchIdx) => (
                          <div key={branchIdx} className="border border-glass-border rounded bg-black/5 dark:bg-white/5 overflow-hidden">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-1 border-b border-glass-border">
                              ┌─ {branch.label}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 p-2">
                              {branch.steps.map((step, i) => {
                                const isActive = step.nodeIds.every(id => activePipelineNodeIds.includes(id));
                                return (
                                  <React.Fragment key={step.nodeIds.join(',')}>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setClickedBranchId(null);
                                        setActivePipelineNodeIds(step.nodeIds);
                                        setSelectedNodeId(null);
                                      }}
                                      className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${isActive ? 'bg-primary/20 text-primary font-medium' : 'bg-background hover:bg-hover text-muted-foreground'}`}
                                    >
                                      {step.clause}
                                    </span>
                                    {i < branch.steps.length - 1 && (
                                      <span className="text-muted-foreground/40 text-xs">→</span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {pipelineData.finalSteps.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 px-1 mt-1">
                          {pipelineData.branches.length > 0 && (
                            <span className="text-muted-foreground/40 text-xs mr-1">JOIN ↔</span>
                          )}
                          {pipelineData.finalSteps.map((step, i) => {
                            const isActive = step.nodeIds.every(id => activePipelineNodeIds.includes(id));
                            return (
                              <React.Fragment key={step.nodeIds.join(',')}>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setClickedBranchId(null);
                                    setActivePipelineNodeIds(step.nodeIds);
                                    setSelectedNodeId(null);
                                  }}
                                  className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${isActive ? 'bg-primary/20 text-primary font-medium' : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 hover:dark:bg-white/10'}`}
                                >
                                  {step.clause}
                                </span>
                                {i < pipelineData.finalSteps.length - 1 && (
                                  <span className="text-muted-foreground/40 text-xs">→</span>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <PlanTreeNode 
                node={slot1.plan_parsed.tree} 
                flatNodesMap={flatNodesMap} 
                lineColorsMap={lineColorsMap}
                isLast={true} 
                isRoot={true}
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
