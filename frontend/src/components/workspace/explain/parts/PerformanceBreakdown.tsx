import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useExplainStore } from '../../../../store/explainStore';
import { InfoTooltip } from '../../../ui/InfoTooltip';
import { getCostColor } from '../utils';

interface PerformanceBreakdownProps {
  setSelectedNodeId: (id: string) => void;
}

type SortKey = 'step' | 'metric';
type SortDirection = 'asc' | 'desc';

export const PerformanceBreakdown: React.FC<PerformanceBreakdownProps> = ({ setSelectedNodeId }) => {
  const { t } = useTranslation();
  const { slot1 } = useExplainStore();
  
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('metric');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeMetric, setActiveMetric] = useState<'cost' | 'time'>('cost');

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

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />;
  };

  return (
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
            <InfoTooltip text={t('explain_ui:perf_breakdown_tooltip')} />
          </div>
        </div>

        {/* Toggle COST/TIME */}
        {slot1?.plan_parsed?.tree['Actual Total Time'] !== undefined && (
          <div className="flex gap-1 bg-muted/50 border border-glass-border p-0.5 rounded-md text-[10px] font-bold">
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
        <div className="bg-muted/30 border border-glass-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-glass-border">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {t('explain_ui:col_operation')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/2">
                {t('explain_ui:col_impact')}
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
                    <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden flex items-center">
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
  );
};
