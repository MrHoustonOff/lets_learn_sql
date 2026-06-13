import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListOrdered, Fingerprint, ArrowRightLeft, ArrowUpDown, Check, X } from 'lucide-react';
import { ReportBlockCard } from './ReportBlockCard';
import { CollapsibleSection } from '../../ui/CollapsibleSection';

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
    <CollapsibleSection
      title={t('stage1_title', 'Первичные тесты')}
      infoText={t('stage1_info', 'Первичные тесты автоматически сравнивают ваш результат с эталонным ответом по множеству признаков (хэш, строки, типы).')}
      defaultOpen={true}
    >
      <div className="flex flex-col gap-3 mt-2">
      
      {/* --- Количество строк --- */}
      <ReportBlockCard
        icon={<ListOrdered size={16} />}
        iconBgClass={isRowsMatch ? "bg-success/10" : "bg-destructive/10"}
        iconColorClass={isRowsMatch ? "text-success" : "text-destructive"}
        title={t('rows_compare_title', 'Количество строк')}
        tooltipText={t('rows_compare_info', 'Сравнивается количество строк, которое вернул запрос, с количеством строк в эталонном ответе.')}
        statusIcon={isRowsMatch ? <Check size={18} className="text-success" /> : <X size={18} className="text-destructive" />}
        cardClassName={isRowsMatch ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-glass-border rounded-md p-4">
            <p className="text-tiny text-muted-foreground m-0 mb-1">{t('err_colcount_actual', 'Получено')}</p>
            <p className={`text-2xl font-medium m-0 ${isRowsMatch ? 'text-success' : 'text-destructive'}`}>{report.user_row_count}</p>
          </div>
          <div className="bg-card border border-glass-border rounded-md p-4">
            <p className="text-tiny text-muted-foreground m-0 mb-1">{t('err_colcount_expected', 'Ожидалось')}</p>
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
        cardClassName={isHashMatch ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}
      >
        <div className="flex flex-col gap-1.5">
          <div className="bg-card border border-glass-border rounded-md p-3">
            <p className="text-xs text-muted-foreground m-0 mb-1">{t('err_colcount_actual', 'Получено')}</p>
            <p className={`font-mono text-xs break-all m-0 ${isHashMatch ? 'text-success' : 'text-destructive'}`}>
              {report.user_hash || 'N/A'}
            </p>
          </div>
          <div className="bg-card border border-glass-border rounded-md p-3">
            <p className="text-xs text-muted-foreground m-0 mb-1">{t('err_colcount_expected', 'Ожидалось')}</p>
            <p className={`font-mono text-xs break-all m-0 text-success`}>
              {report.ref_hash || 'N/A'}
            </p>
          </div>
        </div>
      </ReportBlockCard>

      {/* --- Порядок строк (Order Check) --- */}
      {report.order_matters && (
        <ReportBlockCard
          icon={<ArrowUpDown size={16} />}
          iconBgClass={report.order_passed ? "bg-success/10" : "bg-destructive/10"}
          iconColorClass={report.order_passed ? "text-success" : "text-destructive"}
          title={t('order_matters', 'Порядок важен')}
          tooltipText={t('order_matters_hint', 'В этой задаче требуется отсортировать результат. Позиции строк будут проверяться.')}
          statusIcon={report.order_passed ? <Check size={18} className="text-success" /> : <X size={18} className="text-destructive" />}
          cardClassName={report.order_passed ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}
        >
          <div className="bg-card border border-glass-border rounded-md p-3">
            <p className={`text-sm font-medium m-0 ${report.order_passed ? 'text-success' : 'text-destructive'}`}>
              {report.order_passed ? t('stage1_order_ok', 'Порядок строк верный') : t('stage1_order_fail', 'Данные верны, но порядок строк не совпадает')}
            </p>
          </div>
        </ReportBlockCard>
      )}

      {/* --- Сравнение содержимого (Diff) --- */}
      {hasDiff && (
        <ReportBlockCard
          icon={<ArrowRightLeft size={16} />}
          iconBgClass="bg-destructive/10"
          iconColorClass="text-destructive"
          title={t('diff_compare_title', 'Сравнение содержимого')}
          tooltipText={t('tooltip_diff')}
          statusIcon={<X size={18} className="text-destructive" />}
          cardClassName="bg-destructive/5 border-destructive/20"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground m-0 mb-1.5">
                {t('extra_rows_count', { count: report.extra_rows?.total || 0 })}
              </p>
              <div className="flex flex-col gap-1 w-full overflow-hidden">
                {extraFormatted.map((row, i) => (
                  <div key={i} className="bg-card border border-glass-border rounded-md px-2.5 py-1.5 font-mono text-xs text-foreground overflow-x-auto whitespace-nowrap">
                    {row}
                  </div>
                ))}
                {extraFormatted.length === 0 && (
                  <div className="bg-card border border-glass-border rounded-md px-2.5 py-1.5 font-mono text-xs text-muted-foreground">-</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground m-0 mb-1.5">
                {t('missing_rows_count', { count: report.missing_rows?.total || 0 })}
              </p>
              <div className="flex flex-col gap-1 w-full overflow-hidden">
                {missingFormatted.map((row, i) => (
                  <div key={i} className="bg-card border border-glass-border rounded-md px-2.5 py-1.5 font-mono text-xs text-foreground overflow-x-auto whitespace-nowrap">
                    {row}
                  </div>
                ))}
                {missingFormatted.length === 0 && (
                  <div className="bg-card border border-glass-border rounded-md px-2.5 py-1.5 font-mono text-xs text-muted-foreground">-</div>
                )}
              </div>
            </div>
          </div>
        </ReportBlockCard>
      )}
      </div>
    </CollapsibleSection>
  );
};
