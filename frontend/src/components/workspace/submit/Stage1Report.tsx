import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListOrdered, Fingerprint, ArrowRightLeft, Check, X } from 'lucide-react';
import { ReportBlockCard } from './ReportBlockCard';

export const Stage1Report: React.FC<{ report: any }> = ({ report }) => {
  const { t } = useTranslation('submit_report');

  if (!report) return null;

  const isRowsMatch = report.user_row_count === report.ref_row_count;
  const isHashMatch = report.hash_match;
  const hasDiff = report.extra_rows?.total > 0 || report.missing_rows?.total > 0;

  // Helper to format rows as comma separated
  const formatRows = (rows: any[], max = 5) => {
    if (!rows || rows.length === 0) return [];
    return rows.slice(0, max).map(row => 
      Object.values(row).map(val => String(val)).join(', ')
    );
  };

  const extraFormatted = formatRows(report.extra_rows?.rows || []);
  const missingFormatted = formatRows(report.missing_rows?.rows || []);

  return (
    <div className="flex flex-col gap-3 mt-4">
      <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase m-0 mb-1">
        {t('stage1_title', 'Первичные тесты')}
      </p>
      
      {/* --- Количество строк --- */}
      <ReportBlockCard
        icon={<ListOrdered size={16} />}
        iconBgClass={isRowsMatch ? "bg-success/10" : "bg-destructive/10"}
        iconColorClass={isRowsMatch ? "text-success" : "text-destructive"}
        title={t('rows_compare_title', 'Количество строк')}
        tooltipText={t('rows_compare_info', 'Сравнивается количество строк, которое вернул запрос, с количеством строк в эталонном ответе.')}
        statusIcon={isRowsMatch ? <Check size={18} className="text-success" /> : <X size={18} className="text-destructive" />}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className={`${isRowsMatch ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'} rounded-md p-4`}>
            <p className={`text-tiny m-0 mb-1 ${isRowsMatch ? 'text-success' : 'text-destructive'}`}>{t('err_colcount_actual', 'Получено')}</p>
            <p className={`text-2xl font-medium m-0 ${isRowsMatch ? 'text-success' : 'text-destructive'}`}>{report.user_row_count}</p>
          </div>
          <div className="bg-success/10 border border-success/20 rounded-md p-4">
            <p className="text-tiny text-success m-0 mb-1">{t('err_colcount_expected', 'Ожидалось')}</p>
            <p className="text-2xl font-medium m-0 text-success">{report.ref_row_count}</p>
          </div>
        </div>
      </ReportBlockCard>

      {/* --- Контрольная сумма --- */}
      <ReportBlockCard
        icon={<Fingerprint size={16} />}
        iconBgClass={isHashMatch ? "bg-success/10" : "bg-destructive/10"}
        iconColorClass={isHashMatch ? "text-success" : "text-destructive"}
        title={t('hash_compare_title', 'Контрольная сумма')}
        tooltipText={t('hash_compare_info', 'Хэш — это уникальная цифровая подпись данных. Он вычисляется на основе всех строк результата. Если хэши совпадают, значит данные абсолютно идентичны. Несовпадение означает, что в данных есть отличия (другие значения, лишние или недостающие строки).')}
        statusIcon={isHashMatch ? <Check size={18} className="text-success" /> : <X size={18} className="text-destructive" />}
      >
        <div className="flex flex-col gap-1.5">
          <div className="bg-black/5 dark:bg-white/5 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground m-0 mb-0.5">{t('err_colcount_actual', 'Получено')}</p>
            <p className={`font-mono text-xs break-all m-0 ${isHashMatch ? 'text-success' : 'text-destructive'}`}>
              {report.user_hash || 'N/A'}
            </p>
          </div>
          <div className="bg-black/5 dark:bg-white/5 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground m-0 mb-0.5">{t('err_colcount_expected', 'Ожидалось')}</p>
            <p className={`font-mono text-xs break-all m-0 ${isHashMatch ? 'text-success' : 'text-destructive'}`}>
              {report.ref_hash || 'N/A'}
            </p>
          </div>
        </div>
      </ReportBlockCard>

      {/* --- Сравнение содержимого (Diff) --- */}
      {hasDiff && (
        <ReportBlockCard
          icon={<ArrowRightLeft size={16} />}
          iconBgClass="bg-destructive/10"
          iconColorClass="text-destructive"
          title={t('diff_compare_title', 'Сравнение содержимого')}
          tooltipText={t('tooltip_diff')}
          statusIcon={<X size={18} className="text-destructive" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground m-0 mb-1.5">
                {t('extra_rows_count', { count: report.extra_rows?.total || 0 })}
              </p>
              <div className="flex flex-col gap-1">
                {extraFormatted.map((row, i) => (
                  <div key={i} className="bg-black/5 dark:bg-white/5 rounded-md px-2.5 py-1.5 font-mono text-xs text-foreground break-all">
                    {row}
                  </div>
                ))}
                {extraFormatted.length === 0 && (
                  <div className="bg-black/5 dark:bg-white/5 rounded-md px-2.5 py-1.5 font-mono text-xs text-muted-foreground">-</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground m-0 mb-1.5">
                {t('missing_rows_count', { count: report.missing_rows?.total || 0 })}
              </p>
              <div className="flex flex-col gap-1">
                {missingFormatted.map((row, i) => (
                  <div key={i} className="bg-black/5 dark:bg-white/5 rounded-md px-2.5 py-1.5 font-mono text-xs text-foreground break-all">
                    {row}
                  </div>
                ))}
                {missingFormatted.length === 0 && (
                  <div className="bg-black/5 dark:bg-white/5 rounded-md px-2.5 py-1.5 font-mono text-xs text-muted-foreground">-</div>
                )}
              </div>
            </div>
          </div>
        </ReportBlockCard>
      )}

    </div>
  );
};
