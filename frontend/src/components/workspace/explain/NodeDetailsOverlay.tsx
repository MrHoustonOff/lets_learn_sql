import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, X, Info, AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '../../ui/InfoTooltip';
import { type FlatNode } from '../../../store/explainStore';
import { findNodeById, getCostColor } from './utils';

import pgExplainDocs from '../../../i18n/pg_explain_docs.json';
import explainFieldsDocs from '../../../i18n/explain_fields_i18n.json';
import { NodePropertiesList } from './parts/NodePropertiesList';

interface NodeDetailsProps {
  nodeId: string;
  onClose: () => void;
  rootTree: any;
  flatNodesMap: Map<string, FlatNode>;
  flatNodes: FlatNode[];
  onNavigate: (nodeId: string) => void;
}

export const NodeDetailsOverlay: React.FC<NodeDetailsProps> = ({ nodeId, onClose, rootTree, flatNodesMap, flatNodes, onNavigate }) => {
  // Закрытие по ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

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

  return createPortal(
    <div 
      className="fixed inset-0 bg-background/90 z-[99999] p-4 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200"
      onClick={onClose}
    >
      <div 
        className="border border-glass-border bg-[hsl(var(--glass-bg))] rounded-lg shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Не закрывать при клике на саму карточку
      >
        {/* HEADER (Fixed) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-hover shrink-0 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg relative overflow-hidden">
              <Activity size={24} className="relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{nodeType}</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {objectName ? `Объект: ${objectName}` : 'Операция'}
                {node["Plan Rows"] !== undefined && ` • Строк~: ${node["Plan Rows"]}`}
                {node["Total Cost"] !== undefined && ` • Cost: ${node["Total Cost"]?.toFixed(2)}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">

          {/* Документация/описание типа узла */}
          <div className="mb-4 bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/90 leading-relaxed flex items-start gap-2">
            <Info size={16} className="text-primary shrink-0 mt-0.5" />
            <span>
              {((pgExplainDocs as any)[nodeType] && (pgExplainDocs as any)[nodeType].ru) || explainFieldsDocs.general.no_description.ru}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 font-mono text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase flex items-center">
                cost <InfoTooltip text={explainFieldsDocs.fields.cost.ru} />
              </span>
              <span>{node["Total Cost"]?.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase flex items-center">
                rows~ <InfoTooltip text={explainFieldsDocs.fields.rows.ru} />
              </span>
              <span>{node["Plan Rows"]}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase flex items-center">
                width <InfoTooltip text={explainFieldsDocs.fields.width.ru} />
              </span>
              <span>{width ? `${width} bytes` : '—'}</span>
            </div>
          </div>

          {/* --- DATA FLOW BLOCK --- */}
          <div className="mb-4 border border-primary/20 bg-primary/5 rounded-lg p-4">
            <h4 className="text-xs font-bold text-primary uppercase mb-3 flex items-center gap-2">
              Поток данных (Data Flow)
            </h4>
            <div className="flex flex-col gap-3 font-mono text-sm">
              {/* Вошло */}
              {(() => {
                let inputRows = 0;
                let hasInputRows = false;
                if (node.Plans && node.Plans.length > 0) {
                  inputRows = node.Plans.reduce((sum: number, child: any) => {
                    const childRows = child['Actual Rows'] ?? child['Plan Rows'] ?? 0;
                    const loops = child['Actual Loops'] ?? 1;
                    return sum + (childRows * loops);
                  }, 0);
                  hasInputRows = true;
                } else if (node['Rows Removed by Filter'] !== undefined && node['Actual Rows'] !== undefined) {
                  inputRows = (node['Actual Rows'] * (node['Actual Loops'] || 1)) + Math.round(node['Rows Removed by Filter']);
                  hasInputRows = true;
                }

                if (!hasInputRows) return null;
                
                const outputTotal = Math.round(node['Actual Rows'] !== undefined ? node['Actual Rows'] * (node['Actual Loops'] || 1) : node['Plan Rows']);
                const filteredRows = Math.max(0, inputRows - outputTotal);
                const selectivityPct = inputRows > 0 ? ((filteredRows / inputRows) * 100).toFixed(1) : '0.0';

                return (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground w-24 shrink-0 mt-0.5 flex items-center">
                        Вошло: <InfoTooltip text={explainFieldsDocs.fields.input_rows.ru} />
                      </span>
                      <span className="text-foreground">~{Math.round(inputRows)} строк</span>
                    </div>
                    
                    {/* Условие */}
                    {(() => {
                      const condition = node['Filter'] || node['Index Cond'] || node['Hash Cond'] || node['Join Filter'] || node['Merge Cond'];
                      if (!condition) return null;
                      return (
                        <div className="flex items-start gap-2 relative">
                          <span className="text-muted-foreground w-24 shrink-0 mt-0.5 flex items-center">
                            Условие: <InfoTooltip text={explainFieldsDocs.fields.condition.ru} />
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="text-amber-500 break-all bg-amber-500/10 px-2 py-0.5 rounded">{condition}</span>
                            {filteredRows > 0 && (
                              <span className="text-muted-foreground text-xs">
                                Отсев: <span className="font-bold text-foreground">{selectivityPct}%</span> ({filteredRows} строк удалено)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground w-24 shrink-0 mt-0.5 flex items-center">
                        Вышло: <InfoTooltip text={explainFieldsDocs.fields.output_rows.ru} />
                      </span>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                          {outputTotal} строк
                        </span>
                        <span className="text-muted-foreground text-xs">→ идут дальше</span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Колонки */}
              {node['Output'] && Array.isArray(node['Output']) && (
                <div className="flex items-start gap-2 mt-1 pt-3 border-t border-glass-border/50">
                  <span className="text-muted-foreground w-24 shrink-0 mt-0.5 flex items-center">
                    Колонки: <InfoTooltip text={explainFieldsDocs.fields.columns.ru} />
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {node['Output'].map((col: string, i: number) => (
                      <span key={i} className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs text-foreground/80 break-all">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- INSIGHTS BLOCK --- */}
          {(() => {
            const actualTotalTime = node['Actual Total Time'];
            const rootTime = rootTree['Actual Total Time'];
            const outputTotal = Math.round(node['Actual Rows'] !== undefined ? node['Actual Rows'] * (node['Actual Loops'] || 1) : node['Plan Rows']);
            const timePerRow = (actualTotalTime !== undefined && outputTotal > 0) ? (actualTotalTime / outputTotal).toFixed(4) : null;
            const timePct = (actualTotalTime !== undefined && rootTime !== undefined && rootTime > 0) ? ((actualTotalTime / rootTime) * 100).toFixed(1) : null;
            
            const sharedHits = node['Shared Hit Blocks'] || 0;
            const sharedReads = node['Shared Read Blocks'] || 0;
            const peakMemory = node['Peak Memory Usage']; // В килобайтах

            const planRows = node['Plan Rows'];
            const actualRows = node['Actual Rows'] !== undefined ? node['Actual Rows'] * (node['Actual Loops'] || 1) : null;
            let accuracyWarning = null;
            if (actualRows !== null && planRows !== undefined && planRows > 0) {
              const ratio = actualRows > planRows ? actualRows / planRows : planRows / actualRows;
              if (ratio >= 10) {
                accuracyWarning = `Планировщик ошибся в ~${Math.round(ratio)} раз (Ожидалось ${planRows}, по факту ${Math.round(actualRows)})`;
              }
            }

            if (!actualTotalTime && !sharedHits && !sharedReads && !peakMemory && !accuracyWarning) return null;

            return (
              <div className="mb-4 border border-glass-border bg-muted/30 rounded-lg p-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                  Аналитика (Insights)
                </h4>
                <div className="flex flex-col gap-3 font-mono text-sm">
                  
                  {actualTotalTime !== undefined && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground w-32 shrink-0 mt-0.5 flex items-center">
                        Время узла: <InfoTooltip text={explainFieldsDocs.fields.node_time.ru + " " + explainFieldsDocs.fields.time_per_row.ru} />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">{actualTotalTime.toFixed(3)} ms {timePct && <span className="text-muted-foreground">({timePct}% от запроса)</span>}</span>
                        {timePerRow && <span className="text-muted-foreground text-xs">{timePerRow} ms на строку</span>}
                      </div>
                    </div>
                  )}

                  {(sharedHits > 0 || sharedReads > 0) && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground w-32 shrink-0 mt-0.5 flex items-center">
                        Буферы: <InfoTooltip text={explainFieldsDocs.fields.buffers_hit.ru + " " + explainFieldsDocs.fields.buffers_read.ru} />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {sharedHits > 0 && <span className="text-emerald-500">Hits: {sharedHits} <span className="text-muted-foreground text-xs">(прочитано из кэша)</span></span>}
                        {sharedReads > 0 && <span className="text-destructive font-bold">Reads: {sharedReads} <span className="text-muted-foreground font-normal text-xs">(прочитано с диска ⚠)</span></span>}
                      </div>
                    </div>
                  )}

                  {peakMemory && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground w-32 shrink-0 mt-0.5 flex items-center">
                        Память: <InfoTooltip text={explainFieldsDocs.fields.peak_memory.ru} />
                      </span>
                      <span className="text-amber-500">{peakMemory} kB <span className="text-muted-foreground text-xs">(Peak Memory)</span></span>
                    </div>
                  )}

                  {accuracyWarning && (
                    <div className="flex items-start gap-2 mt-1 pt-3 border-t border-glass-border/50">
                      <span className="text-muted-foreground w-32 shrink-0 mt-0.5 flex items-center">
                        Прогноз: <InfoTooltip text={explainFieldsDocs.fields.planner_accuracy.ru} />
                      </span>
                      <span className="text-destructive font-bold flex items-start gap-1">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{accuracyWarning}</span>
                      </span>
                    </div>
                  )}

                </div>
              </div>
            );
          })()}

          <NodePropertiesList node={node} />

        </div>
      </div>
    </div>,
    document.body
  );
};
