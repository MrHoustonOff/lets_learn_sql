import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Info, AlertTriangle, Loader2, CheckCircle2, ChevronRight, ChevronDown, Network } from 'lucide-react';
import { useExplainStore } from '../../../store/explainStore';
import { ExplainModal } from '../ExplainModal';

import { NodeDetailsOverlay } from './NodeDetailsOverlay';

import { useExplainFieldsDocRaw } from '../../../i18n/content/useExplainContent';

import { InfoTooltip } from '../../ui/InfoTooltip';
import { PlanTree } from './parts/PlanTextTree';
import { PipelineView, usePipelineData } from './parts/PipelineView';
import { PerformanceBreakdown } from './parts/PerformanceBreakdown';

// Хелпер для поиска узла в дереве








export const MiniExplainPanel: React.FC = () => {
  const { t } = useTranslation();
  const explainFieldsDocs = useExplainFieldsDocRaw();

  const { slot1, isLoading } = useExplainStore();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPlanTreeOpen, setIsPlanTreeOpen] = useState(true);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [activePipelineNodeIds, setActivePipelineNodeIds] = useState<string[]>([]);
  const [clickedBranchId, setClickedBranchId] = useState<string | null>(null);

  const pipelineData = usePipelineData(slot1?.plan_parsed?.tree);



  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground bg-background">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p>{t('explain_ui:loading')}</p>
      </div>
    );
  }

  if (!slot1 || !slot1.plan_parsed) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground bg-background">
        <Info size={32} className="mb-4 opacity-50" />
        <p>{t('explain_ui:empty')}</p>
      </div>
    );
  }

  const { planning_time } = slot1.plan_parsed;

  const flatNodesMap = new Map(slot1.plan_parsed.flat_nodes.map(n => [n.node_id, n]));

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
        
        {/* Diagnostics & Recommendations */}
        {(() => {
          const diags = slot1.plan_parsed.diagnostics;
          if (!diags || diags.length === 0) return null;
          
          const hasWarnings = diags.some(d => d.severity === 'warning' || d.severity === 'critical');
          const headerIconColor = hasWarnings ? "text-warning" : "text-emerald-500";
          const HeaderIcon = hasWarnings ? AlertTriangle : Info;
          
          return (
            <section className="bg-black/5 dark:bg-white/5 border border-glass-border p-3.5 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between mb-1 select-none">
                <div className="flex items-center gap-2">
                  <HeaderIcon className={`${headerIconColor} shrink-0`} size={16} />
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {t('explain_ui:diagnostics_title')}
                  </h3>
                </div>
                <InfoTooltip text={t('explain_ui:diagnostics_disclaimer')} />
              </div>
              <div className="flex flex-col gap-1.5">
                {diags.map((diag, idx) => {
                  let Icon = CheckCircle2;
                  let iconColor = "text-emerald-500";
                  
                  if (diag.severity === "warning") {
                    Icon = AlertTriangle;
                    iconColor = "text-warning";
                  } else if (diag.severity === "critical") {
                    Icon = AlertTriangle;
                    iconColor = "text-destructive";
                  } else if (diag.severity === "info") {
                    Icon = Info;
                    iconColor = "text-emerald-500";
                  }

                  const diagText = diag.code 
                    ? t(diag.code, { ...diag.params, defaultValue: diag.message })
                    : diag.message;

                  return (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2.5 text-xs text-foreground/80 py-1"
                    >
                      <Icon size={14} className={`${iconColor} shrink-0 mt-0.5 opacity-80`} />
                      <span className="leading-relaxed">{diagText}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Performance Breakdown Section */}
        <PerformanceBreakdown setSelectedNodeId={setSelectedNodeId} />

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
                <InfoTooltip text={explainFieldsDocs.get('plan_tree')} />
              </div>
            </div>
            
            <button 
              onClick={() => setIsGraphModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors"
            >
              <Network size={12} />
              {t('explain_ui:graph_view')}
            </button>
          </div>
          
          {isPlanTreeOpen && (
            <div 
              className="font-mono text-sm bg-black/5 dark:bg-white/5 shadow-inner border border-glass-border rounded-lg p-4 space-y-1 cursor-default"
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
      <div className="shrink-0 border-t border-glass-border bg-hover flex items-center justify-between px-4 py-2 min-h-[40px] text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {(() => {
            const diags = slot1.plan_parsed.diagnostics;
            if (diags && diags.length > 0) {
              const hasWarnings = diags.some(d => d.severity === 'warning' || d.severity === 'critical');
              if (hasWarnings) {
                return (
                  <>
                    <AlertTriangle size={14} className="text-warning shrink-0" />
                    <span className="font-medium">{t('explain_ui:has_recommendations')}</span>
                  </>
                );
              } else {
                return (
                  <>
                    <Info size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-medium">{t('explain_ui:has_recommendations')}</span>
                  </>
                );
              }
            } else {
              return (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span className="font-medium">{t('explain_ui:no_issues')}</span>
                </>
              );
            }
          })()}
        </div>
        
        <div className="text-muted-foreground font-mono whitespace-nowrap ml-4 flex items-center gap-4">
          <div>Planning: {planning_time.toFixed(2)} ms</div>
          <div>Execution: {slot1.plan_parsed.execution_time.toFixed(2)} ms</div>
        </div>
      </div>
      
      <ExplainModal 
        isOpen={isGraphModalOpen} 
        onClose={() => setIsGraphModalOpen(false)} 
      />
    </div>
  );
};
