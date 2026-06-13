import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { InfoTooltip } from '../../ui/InfoTooltip';
import { DataGrid } from './DataGrid';

export const Stage1Report: React.FC<{ report: any }> = ({ report }) => {
  const { t } = useTranslation('submit_report');

  if (!report) return null;

  return (
    <CollapsibleSection 
      title={t('stage1_title', 'Первичные тесты')}
      infoText={t('stage1_info', 'Сравнение результатов вашего запроса с эталонным решением.')}
    >
      {/* Summary block with subtle tint */}
      <div className={`flex items-center gap-4 text-xs mb-4 p-2.5 rounded-md border w-fit ${
        report.user_row_count === report.ref_row_count 
          ? 'bg-success/10 border-success/20' 
          : 'bg-destructive/10 border-destructive/20'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('rows_found', 'Найдено строк:')}</span>
          <span className="font-mono font-medium">{report.user_row_count}</span>
        </div>
        <div className="w-px h-4 bg-glass-border"></div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('rows_expected', 'Ожидалось:')}</span>
          <span className="font-mono font-medium">{report.ref_row_count}</span>
        </div>
        <InfoTooltip text={t('rows_ratio_hint', 'Сравнение количества строк: если у вас их меньше, значит запрос отфильтровал нужные данные. Если больше — вывел лишние.')} className="" />
        <div className="w-px h-4 bg-glass-border"></div>
        <div className="flex items-center gap-1.5 text-warning-text font-medium">
          <AlertTriangle size={13} />
          <span className="leading-none translate-y-[1px]">{t('order_matters', 'Порядок важен')}</span>
          <InfoTooltip text={t('order_matters_hint', 'В этой задаче требуется отсортировать результат. Позиции строк будут проверяться.')} className="" />
        </div>
      </div>

      <DataGrid 
        sample={report.extra_rows} 
        title={t('extra_rows_title', 'Лишние строки')}
        info={t('extra_rows_hint', 'Эти строки есть в вашем ответе, но их нет в правильном решении автора.')}
      />
      
      <DataGrid 
        sample={report.missing_rows} 
        title={t('missing_rows_title', 'Недостающие строки')}
        info={t('missing_rows_hint', 'Эти строки должны быть в результате, но ваш запрос их не вывел.')}
      />
    </CollapsibleSection>
  );
};
