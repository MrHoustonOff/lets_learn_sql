import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface SqlResultPreviewProps {
  sqlSuccess: boolean;
  sqlError: string | null;
  sqlResult: {
    duration_ms: number;
    row_count: number;
    columns: string[];
    rows?: any[][];
  } | null;
}

export const SqlResultPreview: React.FC<SqlResultPreviewProps> = ({ sqlSuccess, sqlError, sqlResult }) => {
  const { t } = useTranslation();

  if (sqlSuccess) {
    const isZeroRows = sqlResult && (sqlResult.rows ? sqlResult.rows.length === 0 : sqlResult.row_count === 0);

    return (
      <div className={`p-3 border rounded-xl space-y-2 ${isZeroRows ? 'bg-warning/5 border-warning/15' : 'bg-success/5 border-success/15'}`}>
        <div className={`flex items-center gap-2 text-xs font-semibold ${isZeroRows ? 'text-warning-text' : 'text-success'}`}>
          {isZeroRows ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          <span>{isZeroRows ? t('import_tasks.sql_passed_zero_rows') : t('import_tasks.sql_passed')}</span>
        </div>
        {sqlResult && (
          <div className={`grid grid-cols-3 gap-2 text-2xs text-muted-foreground pt-1 border-t font-mono ${isZeroRows ? 'border-warning/10' : 'border-success/10'}`}>
            <div>
              <span>{t('import_tasks.duration')} </span>
              <span className="font-semibold text-foreground">{sqlResult.duration_ms.toFixed(1)}ms</span>
            </div>
            <div>
              <span>{t('import_tasks.row_count')} </span>
              <span className="font-semibold text-foreground">
                {sqlResult.rows ? sqlResult.rows.length : sqlResult.row_count}
                {sqlResult.rows && sqlResult.row_count > sqlResult.rows.length && (
                  <span className="text-warning-text ml-1 opacity-100 font-semibold text-2xs">
                    ({sqlResult.row_count})
                  </span>
                )}
              </span>
            </div>
            <div className="truncate" title={sqlResult.columns.join(', ')}>
              <span>{t('import_tasks.columns')} </span>
              <span className="font-semibold text-foreground">{sqlResult.columns.length}</span>
            </div>
          </div>
        )}
        {isZeroRows && (
          <div className="text-2xs text-warning-text/90 font-medium bg-warning/10 p-2 rounded-lg leading-relaxed mt-2">
            {t('import_tasks.zero_rows_warning')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 bg-destructive/5 border border-destructive/15 rounded-xl space-y-2">
      <div className="flex items-start gap-2 text-xs font-semibold text-destructive">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>{t('import_tasks.sql_failed')}</span>
      </div>
      <div className="p-2.5 rounded-lg bg-black/40 text-2xs font-mono text-destructive-text border border-destructive/10 overflow-x-auto whitespace-pre-wrap break-all custom-scrollbar">
        {sqlError || t('import_tasks.errors.unknown_sql_error')}
      </div>
    </div>
  );
};
