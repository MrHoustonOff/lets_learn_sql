import React from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export const MiniExplainPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-6">
        
        {/* Cost Breakdown Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Cost Breakdown
            </h3>
            <Info size={14} className="text-muted-foreground/50 cursor-help" />
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
                {/* Mock Row 1 */}
                <tr className="hover:bg-hover transition-colors">
                  <td className="px-3 py-2 text-foreground font-medium">Hash Join</td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-destructive" style={{ width: '85%' }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono flex items-center justify-end gap-2">
                    35.50
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </td>
                </tr>
                {/* Mock Row 2 */}
                <tr className="hover:bg-hover transition-colors">
                  <td className="px-3 py-2 text-foreground font-medium">Seq Scan <span className="text-muted-foreground font-normal">→ orders</span></td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-warning" style={{ width: '12%' }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono flex items-center justify-end gap-2">
                    4.20
                    <div className="w-2 h-2 rounded-full bg-warning" />
                  </td>
                </tr>
                {/* Mock Row 3 */}
                <tr className="hover:bg-hover transition-colors">
                  <td className="px-3 py-2 text-foreground font-medium">Index Scan <span className="text-muted-foreground font-normal">→ users_pkey</span></td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '3%' }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono flex items-center justify-end gap-2">
                    0.28
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </td>
                </tr>
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
            <Info size={14} className="text-muted-foreground/50 cursor-help" />
          </div>
          
          <div className="font-mono text-sm bg-black/5 dark:bg-white/5 border border-glass-border rounded-lg p-4 space-y-2">
            {/* Mock Node 1 */}
            <div className="flex items-center justify-between group cursor-pointer hover:bg-hover p-1 -mx-1 rounded transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                <span className="font-semibold text-foreground">Hash Join</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>cost: 35.50</span>
                <span>rows~: 1550</span>
              </div>
            </div>
            
            {/* Mock Node 2 */}
            <div className="flex items-start justify-between pl-6 group cursor-pointer hover:bg-hover p-1 -mx-1 rounded transition-colors relative">
              <div className="absolute left-[11px] top-0 bottom-0 w-px bg-glass-border" />
              <div className="absolute left-[11px] top-[14px] w-3 h-px bg-glass-border" />
              
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                  <span className="font-semibold text-foreground">Seq Scan</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-primary">orders</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4">
                  Filter: (user_id = $1)
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground pt-0.5">
                <span>cost: 4.20</span>
                <span>rows~: 800</span>
              </div>
            </div>

            {/* Mock Node 3 */}
            <div className="flex items-center justify-between pl-6 group cursor-pointer hover:bg-hover p-1 -mx-1 rounded transition-colors relative">
              <div className="absolute left-[11px] top-0 bottom-1/2 w-px bg-glass-border" />
              <div className="absolute left-[11px] top-[14px] w-3 h-px bg-glass-border" />
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">Index Scan</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary">users_pkey</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>cost: 0.28</span>
                <span>rows~: 1</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Bottom Status Bar */}
      <div className="shrink-0 h-10 border-t border-glass-border bg-hover flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-2 text-warning-text">
          <AlertTriangle size={14} />
          <span className="font-medium">Seq Scan на большой таблице</span>
        </div>
        <div className="text-muted-foreground font-mono">
          Planning: 0.12 ms
        </div>
      </div>
    </div>
  );
};
