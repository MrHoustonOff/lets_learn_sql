import React from 'react';
import { Info, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useExplainStore } from '../../../store/explainStore';

// Хелпер для цвета в зависимости от стоимости
const getCostColor = (pct: number) => {
  if (pct > 60) return 'bg-destructive';
  if (pct > 20) return 'bg-warning';
  return 'bg-emerald-500';
};

export const MiniExplainPanel: React.FC = () => {
  const { slot1, isLoading } = useExplainStore();

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

  const { flat_nodes, planning_time } = slot1.plan_parsed;

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Операция</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/2">Влияние на стоимость</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-24">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {flat_nodes.map((node, idx) => {
                  const colorClass = getCostColor(node.cost_pct);
                  
                  // Разделяем тип узла и объект (если есть стрелочка)
                  const [nodeType, objectName] = node.operation.split(' → ');

                  return (
                    <tr key={idx} className="hover:bg-hover transition-colors">
                      <td className="px-3 py-2 text-foreground font-medium">
                        {nodeType} {objectName && <span className="text-muted-foreground font-normal">→ {objectName}</span>}
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

        {/* Plan Tree Section (пока мок для шага 5) */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Plan Tree (В разработке)
            </h3>
          </div>
          <div className="font-mono text-sm bg-black/5 dark:bg-white/5 border border-glass-border rounded-lg p-4 text-muted-foreground text-center opacity-50">
            Дерево будет реализовано на Шаге 5
          </div>
        </section>

      </div>

      {/* Bottom Status Bar */}
      <div className="shrink-0 h-10 border-t border-glass-border bg-hover flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span className="font-medium">Запрос проанализирован</span>
        </div>
        <div className="text-muted-foreground font-mono">
          Planning: {planning_time.toFixed(2)} ms
        </div>
      </div>
    </div>
  );
};
