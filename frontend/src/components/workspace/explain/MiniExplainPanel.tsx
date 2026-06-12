import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createPortal } from 'react-dom';
import { Info, AlertTriangle, Loader2, CheckCircle2, ArrowDown, ArrowUp, ArrowUpDown, X, ChevronLeft, ChevronRight, Copy, Check, ChevronDown, Activity } from 'lucide-react';
import { useExplainStore, type FlatNode } from '../../../store/explainStore';

import pgExplainDocs from '../../../i18n/pg_explain_docs.json';
import explainFieldsDocs from '../../../i18n/explain_fields_i18n.json';

const InfoTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, translateY: '0', translateX: '-50%' });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipHeight = 150; // approximate max height
    const tooltipWidth = 288; // 72 tailwind spacing = 18rem = 288px
    
    let top = rect.top - 8; // Pop upwards by default
    let translateY = '-100%';
    let left = rect.left + rect.width / 2;
    let translateX = '-50%';

    if (top - tooltipHeight < 0) {
      // Not enough space above, pop downwards
      top = rect.bottom + 8;
      translateY = '0';
    }

    if (left - tooltipWidth / 2 < 10) {
      left = 10;
      translateX = '0';
    } else if (left + tooltipWidth / 2 > window.innerWidth - 10) {
      left = window.innerWidth - 10;
      translateX = '-100%';
    }

    setPos({ top, left, translateY, translateX });
    setIsOpen(true);
  };

  return (
    <>
      <div 
        className="inline-flex items-center ml-1 align-middle"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Info size={14} className="text-muted-foreground/50 hover:text-primary cursor-help transition-colors" />
      </div>
      {isOpen && createPortal(
        <div 
          className="fixed z-[99999] w-72 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-2xl border border-glass-border pointer-events-none whitespace-pre-wrap font-sans font-normal normal-case leading-relaxed animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            top: `${pos.top}px`, 
            left: `${pos.left}px`,
            transform: `translate(${pos.translateX}, ${pos.translateY})`
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
};

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
  flatNodes: FlatNode[];
  onNavigate: (nodeId: string) => void;
}

const NodeDetailsOverlay: React.FC<NodeDetailsProps> = ({ nodeId, onClose, rootTree, flatNodesMap, flatNodes, onNavigate }) => {
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

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, value: any) => {
    const copyText = `Операция: ${nodeType}\n${key}: ${String(value)}`;
    navigator.clipboard.writeText(copyText);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Логика навигации
  const chronologicalNodes = [...flatNodes].sort((a, b) => a.step_number - b.step_number);
  const currentIndex = chronologicalNodes.findIndex(n => n.node_id === nodeId);
  
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < chronologicalNodes.length - 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrev) onNavigate(chronologicalNodes[currentIndex - 1].node_id);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext) onNavigate(chronologicalNodes[currentIndex + 1].node_id);
  };

  const dynamicProps = Object.entries(node).filter(([key, value]) => {
    const ignoredKeys = ['Node Type', 'Relation Name', 'Index Name', 'Total Cost', 'Plan Rows', 'Plan Width', 'Plans', 'node_id', 'Parent Relationship', 'Startup Cost', 'Alias'];
    return !ignoredKeys.includes(key) && typeof value !== 'object' && value !== undefined && value !== null;
  });

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
                {flatData && (
                  <span className="text-[10px] uppercase tracking-wider bg-badge text-badge-foreground px-2 py-0.5 rounded-full">
                    Шаг {flatData.step_number}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {objectName ? `Объект: ${objectName}` : 'Операция'}
                {node["Plan Rows"] !== undefined && ` • Строк~: ${node["Plan Rows"]}`}
                {node["Total Cost"] !== undefined && ` • Cost: ${node["Total Cost"]?.toFixed(2)}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Навигация */}
            <div className="flex items-center gap-1 mr-2 border-r border-glass-border pr-3">
              <button 
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`p-2 rounded-xl transition-colors ${hasPrev ? 'hover:bg-hover text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                title="Предыдущий шаг"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={handleNext}
                disabled={!hasNext}
                className={`p-2 rounded-xl transition-colors ${hasNext ? 'hover:bg-hover text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                title="Следующий шаг"
              >
                <ChevronRight size={18} />
              </button>
            </div>

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
              <div className="mb-4 border border-glass-border bg-black/5 dark:bg-white/5 rounded-lg p-4">
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

          {/* Дополнительные параметры (Сворачиваемый блок) */}
          {dynamicProps.length > 0 && (
            <div className="border border-glass-border rounded-lg overflow-hidden">
              <button 
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="flex items-center justify-between bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-4 py-2.5 transition-colors w-full text-left"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase">
                  {isDetailsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Детали операции ({dynamicProps.length})
                </div>
              </button>
              
              {isDetailsOpen && (
                <div className="flex flex-col text-sm font-mono bg-background/30">
                  {dynamicProps.map(([key, value]) => (
                    <div 
                      key={key} 
                      onClick={() => handleCopy(key, value)}
                      className="flex items-start gap-4 px-4 py-2.5 border-t border-glass-border/30 cursor-pointer even:bg-black/[0.02] dark:even:bg-white/[0.02] group"
                      title="Нажмите, чтобы скопировать значение"
                    >
                      <span className="text-muted-foreground whitespace-nowrap min-w-[150px] mt-0.5">{key}:</span>
                      <span className="text-foreground break-all flex-1">{String(value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 text-muted-foreground shrink-0 mt-0.5">
                        {copiedKey === key ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
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
          flatNodes={slot1.plan_parsed.flat_nodes}
          onNavigate={setSelectedNodeId}
        />
      )}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        
        {/* Cost Breakdown Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Cost Breakdown
            </h3>
            <InfoTooltip text={explainFieldsDocs.fields.cost_breakdown.ru} />
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
                    <tr 
                      key={idx} 
                      className="hover:bg-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedNodeId(node.node_id)}
                    >
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
            <InfoTooltip text={explainFieldsDocs.fields.plan_tree.ru} />
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
