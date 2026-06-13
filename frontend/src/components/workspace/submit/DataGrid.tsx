import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table2 } from 'lucide-react';
import type { RowSample } from '../../../store/queryStore';
import { InfoTooltip } from '../../ui/InfoTooltip';

export const DataGrid: React.FC<{ sample: RowSample | { total: number, rows: string[][] }; title: string; info: string }> = ({ sample, title, info }) => {
  const { t } = useTranslation('submit_report');
  if (!sample.rows || sample.rows.length === 0) return null;
  return (
    <div className="rounded-md border border-glass-border overflow-hidden mt-3">
      <div className="px-3 py-1.5 text-2xs font-semibold bg-hover flex items-center justify-between border-b border-glass-border">
        <span className="flex items-center gap-1.5">
          <Table2 size={12} className="opacity-70" />
          <span className="leading-none translate-y-[1px]">{title}</span>
          <InfoTooltip text={info} className="" />
        </span>
        <span className="opacity-60 font-normal">{t('shown_of', { shown: sample.rows.length, total: sample.total })}</span>
      </div>
      <div className="overflow-x-auto w-full max-w-[calc(100vw-300px)] custom-scrollbar pb-1 bg-background">
        <table className="w-full text-2xs font-mono">
          <tbody>
            {sample.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-glass-border hover:bg-hover last:border-b-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 whitespace-nowrap border-r border-glass-border last:border-r-0">
                    {cell === null ? <span className="opacity-40 italic">NULL</span> : String(cell)}
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
