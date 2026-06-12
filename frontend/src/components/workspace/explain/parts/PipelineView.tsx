import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export interface PipelineData {
  mode: 'simple' | 'complex';
  steps: PipelineStep[];
  branches: PipelineBranch[];
  finalSteps: PipelineStep[];
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

export function usePipelineData(rootNode: any): PipelineData {
  return useMemo(() => {
    if (!rootNode) return { mode: 'simple' as const, steps: [], branches: [], finalSteps: [] };
    
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

    const mode = getPipelineMode(rootNode);

    if (mode === 'simple') {
      const rawSteps = collectSteps(rootNode);
      return {
        mode: 'simple' as const,
        steps: deduplicateAndSortSteps(rawSteps),
        branches: [],
        finalSteps: []
      };
    }

    // Complex mode
    let splitNode = rootNode;
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
  }, [rootNode]);
}

interface PipelineViewProps {
  pipelineData: PipelineData;
  activePipelineNodeIds: string[];
  setActivePipelineNodeIds: (ids: string[]) => void;
  setClickedBranchId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  pipelineData,
  activePipelineNodeIds,
  setActivePipelineNodeIds,
  setClickedBranchId,
  setSelectedNodeId
}) => {
  const { t } = useTranslation();
  if (pipelineData.steps.length === 0 && pipelineData.branches.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2 select-none">
        <Info size={12} className="shrink-0" />
        <span>{t('explain_ui:pipeline_hint')}</span>
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
                  className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${isActive ? 'bg-primary/20 text-primary font-medium' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
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
              <div key={branchIdx} className="border border-glass-border rounded bg-muted/50 overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1 border-b border-glass-border">
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
                      className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${isActive ? 'bg-primary/20 text-primary font-medium' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
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
  );
};
