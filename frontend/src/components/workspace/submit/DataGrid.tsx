import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table2 } from 'lucide-react';
import type { RowSample } from '../../../store/queryStore';
import { InfoTooltip } from '../../ui/InfoTooltip';

export const DataGrid: React.FC<{ sample: RowSample | { total: number, rows: string[][] }; title: string; info: string }> = ({ sample, title, info }) => {
  const { t } = useTranslation('submit_report');
  if (!sample || !sample.rows || sample.rows.length === 0) return null;
  return (
    <div className="rounded-md border border-glass-border overflow-hidden mt-3 bg-hover shadow-inner">
      <div className="px-3 py-1.5 text-xs font-semibold bg-black/10 dark:bg-white/10 flex items-center justify-between border-b border-glass-border">
        <span className="flex items-center gap-1.5">
          <Table2 size={12} className="opacity-70" />
          <span className="leading-none translate-y-[1px]">{title}</span>
          <InfoTooltip text={info} className="" />
        </span>
        <span className="opacity-60 font-normal">{t('shown_of', { shown: sample.rows.length, total: sample.total })}</span>
      </div>
      <div className="overflow-x-auto w-full max-w-[calc(100vw-300px)] custom-scrollbar pb-1">
        <table className="text-left whitespace-nowrap w-full text-sm">
          <tbody className="divide-y divide-glass-border">
            {sample.rows.map((row, ri) => (
              <tr key={ri} className="even:bg-black/[0.02] dark:even:bg-white/[0.02] hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors divide-x divide-glass-border group">
                {row.map((cell, ci) => (
                  <td key={ci} className="truncate group-hover:border-primary/20 transition-colors" style={{ padding: '0.5em 0.8em', maxWidth: '350px' }}>
                    {cell === null ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/50 text-mini font-semibold tracking-widest uppercase shadow-sm border border-glass-border">
                        NULL
                      </span>
                    ) : (
                      <div className="truncate" title={String(cell)}>
                        {String(cell)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
