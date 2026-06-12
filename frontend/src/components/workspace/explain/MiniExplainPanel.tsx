import React, { useState, useMemo } from 'react';
import { Info, AlertTriangle, Loader2, CheckCircle2, ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react';
import { useExplainStore, type FlatNode } from '../../../store/explainStore';

// Хелпер для поиска узла в дереве
const findNodeById = (node: any, id: string): any => {
  if (node.node_id === id) return node;
  if (node.Plans) {
    for (const child of node.Plans) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
};

// Хелпер для цвета в зависимости от стоимости
const getCostColor = (pct: number) => {
  if (pct > 60) return 'bg-destructive';
  if (pct > 20) return 'bg-warning';
  return 'bg-emerald-500';
};

interface PlanTreeNodeProps {
  node: any;
  flatNodesMap: Map<string, FlatNode>;
  isLast: boolean;
  isRoot?: boolean;
  onSelectNode: (nodeId: string) => void;
}

const PlanTreeNode: React.FC<PlanTreeNodeProps> = ({ node, flatNodesMap, isLast, isRoot = false, onSelectNode }) => {
  const flatData = flatNodesMap.get(node.node_id);
  const colorClass = flatData ? getCostColor(flatData.cost_pct) : 'bg-muted';
  
  const nodeType = node["Node Type"];
  const relation = node["Relation Name"];
  const index = node["Index Name"];
  const objectName = index || relation;
  
  const filter = node["Filter"] || node["Index Cond"] || node["Hash Cond"];
  const children = node["Plans"] || [];

  return (
    <div className={`relative group transition-colors ${!isRoot ? 'pl-6' : ''}`}>
      {/* Линии отступов для не-корневых узлов */}
      {!isRoot && (
        <>
          {/* Вертикальная линия от родителя (проходит насквозь, если не последний) */}
          <div className={`absolute left-[11px] top-0 ${isLast ? 'bottom-1/2' : 'bottom-[-4px]'} w-px bg-glass-border`} />
          {/* Горизонтальная линия к этому узлу */}
          <div className="absolute left-[11px] top-[14px] w-3 h-px bg-glass-border" />
        </>
      )}

      <div 
        className="flex flex-col hover:bg-hover p-1 -mx-1 rounded relative z-10 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node.node_id);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colorClass} shrink-0`} />
            <span className="font-semibold text-foreground">{nodeType}</span>
            {objectName && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary">{objectName}</span>
              </>
            )}
            {flatData && (
              <span className="flex items-center justify-center w-4 h-4 rounded bg-background border border-glass-border text-[10px] text-muted-foreground font-mono ml-1">
                {flatData.step_number}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground ml-4">
            <span>cost: {node["Total Cost"]?.toFixed(2)}</span>
            <span>rows~: {node["Plan Rows"]}</span>
          </div>
        </div>
        
        {filter && (
          <div className="text-xs text-muted-foreground pl-4 mt-0.5 opacity-70 truncate max-w-lg">
            Filter/Cond: {filter}
          </div>
        )}
      </div>

      {/* Рендер детей */}
      {children.length > 0 && (
        <div className="relative">
          {children.map((child: any, idx: number) => (
            <PlanTreeNode 
              key={idx} 
              node={child} 
              flatNodesMap={flatNodesMap} 
              isLast={idx === children.length - 1} 
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface NodeDetailsProps {
  nodeId: string;
  onClose: () => void;
  rootTree: any;
  flatNodesMap: Map<string, FlatNode>;
}

const NodeDetailsOverlay: React.FC<NodeDetailsProps> = ({ nodeId, onClose, rootTree, flatNodesMap }) => {
  const node = findNodeById(rootTree, nodeId);
  if (!node) return null;

  const flatData = flatNodesMap.get(node.node_id);
  const colorClass = flatData ? getCostColor(flatData.cost_pct) : 'bg-muted';
  
  const nodeType = node["Node Type"];
  const relation = node["Relation Name"];
  const index = node["Index Name"];
  const objectName = index || relation;
  const filter = node["Filter"] || node["Index Cond"] || node["Hash Cond"];
  const width = node["Plan Width"];

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 p-4 overflow-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="border border-glass-border bg-black/5 dark:bg-white/5 rounded-lg p-4 shadow-xl">
        <div className="flex items-start justify-between mb-4 border-b border-glass-border pb-3">
          <div className="flex items-center gap-2 text-lg">
            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
            <span className="font-bold text-foreground">{nodeType}</span>
            {objectName && (
              <>
                <span className="text-muted-foreground">—</span>
                <span className="text-primary">{objectName}</span>
              </>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-hover rounded-md text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 font-mono text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase">cost</span>
            <span>{node["Total Cost"]?.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase">rows~</span>
            <span>{node["Plan Rows"]}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase">width</span>
            <span>{width ? `${width} bytes` : '—'}</span>
          </div>
        </div>

        {filter && (
          <div className="mb-4 bg-background/50 p-2 rounded border border-glass-border/50 text-sm font-mono">
            <span className="text-muted-foreground">Filter/Cond:</span> {filter}
          </div>
        )}

        <div className="mt-6 border-t border-glass-border pt-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
            PREVIEW — первые 5 строк которые проходят через этот узел:
          </h4>
          <div className="text-sm font-mono opacity-50 bg-background/50 p-4 rounded border border-glass-border/30 text-center italic">
            Табличное превью данных находится в разработке...
          </div>
        </div>

      </div>
    </div>
  );
};

type SortKey = 'step' | 'cost';
type SortDirection = 'asc' | 'desc';

export const MiniExplainPanel: React.FC = () => {
  const { slot1, isLoading } = useExplainStore();
  
  const [sortKey, setSortKey] = useState<SortKey>('step');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
        return sortDirection === 'asc' 
          ? a.cost - b.cost 
          : b.cost - a.cost;
      }
    });
  }, [slot1, sortKey, sortDirection]);

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
        />
      )}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        
        {/* Cost Breakdown Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Cost Breakdown
            </h3>
            <Info size={14} className="text-muted-foreground/50 cursor-help" title="Влияние операций на общую стоимость запроса" />
          </div>
          
          <div className="bg-black/5 dark:bg-white/5 border border-glass-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/10 dark:bg-white/10 border-b border-glass-border">
                <tr>
                  <th 
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    onClick={() => handleSort('step')}
                  >
                    <div className="flex items-center gap-1">
                      Операция (порядок)
                      {renderSortIcon('step')}
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/2">
                    Влияние на стоимость
                  </th>
                  <th 
                    className="px-3 py-2 text-right text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-28"
                    onClick={() => handleSort('cost')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {renderSortIcon('cost')}
                      Cost
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {sortedNodes.map((node, idx) => {
                  const colorClass = getCostColor(node.cost_pct);
                  
                  // Разделяем тип узла и объект (если есть стрелочка)
                  const [nodeType, objectName] = node.operation.split(' → ');

                  return (
                    <tr key={idx} className="hover:bg-hover transition-colors">
                      <td className="px-3 py-2 text-foreground font-medium flex items-center gap-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded bg-background border border-glass-border text-[10px] text-muted-foreground font-mono">
                          {node.step_number}
                        </span>
                        <span>
                          {nodeType} {objectName && <span className="text-muted-foreground font-normal">→ {objectName}</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex items-center">
                          <div className={`h-full ${colorClass}`} style={{ width: `${Math.max(node.cost_pct, 1)}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono flex items-center justify-end gap-2">
                        {node.cost.toFixed(2)}
                        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Plan Tree Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Plan Tree
            </h3>
            <Info size={14} className="text-muted-foreground/50 cursor-help" title="Иерархия выполнения запроса" />
          </div>
          <div className="font-mono text-sm bg-black/5 dark:bg-white/5 border border-glass-border rounded-lg p-4 space-y-1">
            <PlanTreeNode 
              node={slot1.plan_parsed.tree} 
              flatNodesMap={flatNodesMap} 
              isLast={true} 
              isRoot={true}
              onSelectNode={setSelectedNodeId}
            />
          </div>
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
    </div>
  );
};
