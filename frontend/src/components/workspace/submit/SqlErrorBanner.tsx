import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, Columns, ArrowRightLeft, Clock, Check, X } from 'lucide-react';

// Internal reusable card for errors to maintain DRY
const ErrorCard: React.FC<{
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  duration: number;
  children: React.ReactNode;
  cardBgClass?: string;
  cardBorderClass?: string;
}> = ({ icon, iconBgClass, title, duration, children, cardBgClass = "bg-destructive/5", cardBorderClass = "border-destructive/20" }) => (
  <div className={`${cardBgClass} rounded-xl border ${cardBorderClass} p-4 sm:p-5`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconBgClass}`}>
          {icon}
        </div>
        <p className="text-sm font-medium m-0 text-foreground">{title}</p>
      </div>
      {duration > 0 && <span className="text-xs text-muted-foreground">{duration} мс</span>}
      {duration === 0 && <span className="text-xs text-muted-foreground">&gt; 5000 мс</span>}
    </div>
    {children}
  </div>
);

export const SqlErrorBanner: React.FC<{ error: string; duration?: number }> = ({ error, duration = 0 }) => {
  const { t } = useTranslation('submit_report');

  if (!error.startsWith('PREFLIGHT:')) {
    // Fallback for non-preflight generic errors
    return (
      <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4 sm:p-5">
        <p className="m-0 text-tiny text-destructive">{error}</p>
      </div>
    );
  }

  const parts = error.split('|');
  const code = parts[0];

  switch (code) {
    case 'PREFLIGHT:TIMEOUT':
      return (
        <ErrorCard
          icon={<Clock size={16} className="text-warning-text" />}
          iconBgClass="bg-warning/10"
          title={t('err_timeout_title', 'Запрос выполняется слишком долго')}
          duration={0}
          cardBgClass="bg-warning/5"
          cardBorderClass="border-warning/20"
        >
          <div className="bg-black/5 dark:bg-white/5 rounded-md px-3 py-2.5 mb-2.5">
            <p className="font-mono text-tiny leading-relaxed m-0 text-warning-text">
              canceling statement due to statement timeout
            </p>
          </div>
          <p className="text-tiny text-foreground/80 m-0">
            {t('err_timeout_desc', 'Выполнение прервано по таймауту (5 сек).')}
          </p>
        </ErrorCard>
      );

    case 'PREFLIGHT:SYNTAX':
    case 'PREFLIGHT:RUNTIME':
    case 'PREFLIGHT:PLATFORM': {
      const errTrace = parts.slice(1).join('|');
      const isPlatform = code === 'PREFLIGHT:PLATFORM';
      const title = isPlatform ? t('err_platform_title', 'Внутренняя ошибка платформы') : t('err_syntax_title', 'Ошибка в запросе');
      const [firstLine, ...rest] = errTrace.split('\n');
      return (
        <ErrorCard
          icon={<Bug size={16} className="text-destructive" />}
          iconBgClass="bg-destructive/10"
          title={title}
          duration={duration}
        >
          <div className="bg-black/5 dark:bg-white/5 rounded-md px-3 py-2.5 mb-2.5">
            <p className="font-mono text-tiny leading-relaxed m-0 text-destructive">{firstLine || errTrace}</p>
            {rest.length > 0 && (
              <p className="font-mono text-xs leading-relaxed mt-1 mb-0 text-muted-foreground whitespace-pre-wrap">{rest.join('\n')}</p>
            )}
          </div>
          <p className="text-tiny text-foreground/80 m-0">
            {isPlatform 
              ? t('err_platform_desc', 'К сожалению, эталонный запрос упал с ошибкой. Пожалуйста, сообщите администратору.') 
              : t('err_syntax_desc', 'Postgres не смог выполнить запрос.')}
          </p>
        </ErrorCard>
      );
    }

    case 'PREFLIGHT:COL_COUNT': {
      const actualCount = parts[1];
      const expectedCount = parts[2];
      const isMore = Number(actualCount) > Number(expectedCount);
      return (
        <ErrorCard
          icon={<Columns size={16} className="text-destructive" />}
          iconBgClass="bg-destructive/10"
          title={t('err_colcount_title', 'Несовпадение количества колонок')}
          duration={duration}
        >
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            <div className="bg-card border border-glass-border rounded-md p-4">
              <p className="text-tiny text-foreground/80 m-0 mb-1">{t('err_colcount_expected', 'Ожидалось колонок')}</p>
              <p className="text-2xl font-medium m-0 text-success">{expectedCount}</p>
            </div>
            <div className="bg-card border border-glass-border rounded-md p-4">
              <p className="text-tiny text-destructive m-0 mb-1">{t('err_colcount_actual', 'Получено')}</p>
              <p className="text-2xl font-medium m-0 text-destructive">{actualCount}</p>
            </div>
          </div>
          <p className="text-tiny text-foreground/80 m-0">
            {isMore ? t('err_colcount_desc_more', 'Ваш запрос возвращает больше колонок, чем требуется по условию.') : t('err_colcount_desc_less', 'Ваш запрос возвращает меньше колонок, чем требуется по условию.')}
          </p>
        </ErrorCard>
      );
    }

    case 'PREFLIGHT:COL_TYPES': {
      try {
        const typesData = JSON.parse(parts.slice(1).join('|'));
        return (
          <ErrorCard
            icon={<ArrowRightLeft size={16} className="text-destructive" />}
            iconBgClass="bg-destructive/10"
            title={t('err_coltype_title', 'Несовпадение типов данных')}
            duration={duration}
          >
            <div className="flex flex-col gap-1.5 mb-2.5">
              {typesData.map((col: any) => {
                if (col.match) {
                  return (
                    <div key={col.pos} className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_20px] items-center gap-2.5 px-2.5 py-2 bg-black/5 dark:bg-white/5 rounded-md">
                      <span className="text-xs text-muted-foreground">#{col.pos}</span>
                      <div className="min-w-0">
                        <p className="text-tiny font-medium text-foreground m-0 truncate">{col.name}</p>
                        <p className="text-xs font-mono text-muted-foreground m-0 truncate">{col.u_type}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground m-0">{t('expected_lbl', 'ожидался')}</p>
                        <p className="text-xs font-mono text-muted-foreground m-0 truncate">{col.r_type}</p>
                      </div>
                      <Check size={16} className="text-success justify-self-end shrink-0" />
                    </div>
                  );
                } else {
                  return (
                    <div key={col.pos} className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_20px] items-center gap-2.5 px-2.5 py-2 bg-destructive/10 border border-destructive/20 rounded-md">
                      <span className="text-xs font-medium text-destructive/70">#{col.pos}</span>
                      <div className="min-w-0">
                        <p className="text-tiny font-medium text-destructive m-0 truncate">{col.name}</p>
                        <p className="text-xs font-mono text-destructive m-0 truncate">{col.u_type}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-destructive/70 m-0">{t('expected_lbl', 'ожидался')}</p>
                        <p className="text-xs font-mono text-destructive m-0 truncate">{col.r_type}</p>
                      </div>
                      <X size={16} className="text-destructive justify-self-end shrink-0" />
                    </div>
                  );
                }
              })}
            </div>
            <p className="text-tiny text-foreground/80 m-0">
              {t('err_coltype_desc', 'Типы некоторых колонок не совпадают с эталонным решением. Попробуйте привести их (CAST).')}
            </p>
          </ErrorCard>
        );
      } catch (e) {
        return (
          <ErrorCard
            icon={<ArrowRightLeft size={16} className="text-destructive" />}
            iconBgClass="bg-destructive/10"
            title={t('err_coltype_title', 'Несовпадение типов данных')}
            duration={duration}
          >
            <div className="bg-black/5 dark:bg-white/5 rounded-md px-3 py-2.5">
              <p className="font-mono text-tiny leading-relaxed m-0 text-destructive">{parts.slice(1).join('|')}</p>
            </div>
          </ErrorCard>
        );
      }
    }

    default:
      return (
        <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4 sm:p-5">
          <p className="m-0 text-tiny text-destructive">{error}</p>
        </div>
      );
  }
};
