import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FlatNode } from '../../../../store/explainStore';
import { getCostColor } from '../utils';

const BRANCH_COLORS = [
  'bg-blue-500/50',
  'bg-emerald-500/50',
  'bg-purple-500/50',
  'bg-amber-500/50',
  'bg-pink-500/50',
  'bg-cyan-500/50',
  'bg-rose-500/50',
];

// ─── Внутренний узел дерева ─────────────────────────────────────────────────

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

  const nodeType = node['Node Type'];
  const relation = node['Relation Name'];
  const index = node['Index Name'];
  const objectName = index || relation;

  const filter = node['Filter'] || node['Index Cond'] || node['Hash Cond'];
  const children = node['Plans'] || [];

  const isPipelineHighlight = activePipelineNodeIds.length > 0 && activePipelineNodeIds.includes(nodeId);
  const isBranchHighlight = clickedBranchId ? nodeId.startsWith(clickedBranchId) : false;

  const isHighlighted = isPipelineHighlight || isBranchHighlight;
  const isDimmed = (activePipelineNodeIds.length > 0 || clickedBranchId) && !isHighlighted;

  return (
    <div className={`relative group transition-colors duration-200 ${!isRoot ? 'pl-6' : ''}`}>
      {!isRoot && (
        <>
          <div className={`absolute left-[11px] top-0 ${isLast ? 'bottom-1/2' : 'bottom-[-4px]'} w-[2px] ${branchColor}`} />
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
            <span>cost: {node['Total Cost']?.toFixed(2)}</span>
            <span>rows~: {node['Plan Rows']}</span>
          </div>
        </div>

        {!isCollapsed && filter && (
          <div className="text-xs text-muted-foreground pl-6 ml-5 mt-0.5 opacity-70 truncate max-w-lg">
            Filter/Cond: {filter}
          </div>
        )}
      </div>

      {!isCollapsed && children.length > 0 && (
        <div className="relative mt-1">
          {children.map((child: any, index: number) => (
            <PlanTreeNode
              key={child.node_id}
              node={child}
              flatNodesMap={flatNodesMap}
              lineColorsMap={lineColorsMap}
              isLast={index === children.length - 1}
              onSelectNode={onSelectNode}
              clickedBranchId={clickedBranchId}
              setClickedBranchId={setClickedBranchId}
              activePipelineNodeIds={activePipelineNodeIds}
              setActivePipelineNodeIds={setActivePipelineNodeIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Публичная обёртка (принимает rootTree, сама считает цвета) ─────────────

export interface PlanTreeProps {
  rootTree: any;
  flatNodesMap: Map<string, FlatNode>;
  onSelectNode: (nodeId: string) => void;
  clickedBranchId: string | null;
  setClickedBranchId: (id: string | null) => void;
  activePipelineNodeIds: string[];
  setActivePipelineNodeIds: (ids: string[]) => void;
}

export const PlanTree: React.FC<PlanTreeProps> = ({
  rootTree,
  flatNodesMap,
  onSelectNode,
  clickedBranchId,
  setClickedBranchId,
  activePipelineNodeIds,
  setActivePipelineNodeIds,
}) => {
  const lineColorsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!rootTree) return map;

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

    assignColors(rootTree, 'bg-glass-border');
    return map;
  }, [rootTree]);

  return (
    <PlanTreeNode
      node={rootTree}
      flatNodesMap={flatNodesMap}
      lineColorsMap={lineColorsMap}
      isLast={true}
      isRoot={true}
      onSelectNode={onSelectNode}
      clickedBranchId={clickedBranchId}
      setClickedBranchId={setClickedBranchId}
      activePipelineNodeIds={activePipelineNodeIds}
      setActivePipelineNodeIds={setActivePipelineNodeIds}
    />
  );
};
