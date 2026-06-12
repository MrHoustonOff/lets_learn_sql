import React from 'react';
import { useTranslation } from 'react-i18next';


export const Legend: React.FC<{ isMaximized?: boolean }> = ({ isMaximized = true }) => {
  const { t } = useTranslation();
  const stroke = "hsl(var(--primary))";
  const strokeWidth = 2;

  return (
    <div className={`absolute bottom-6 right-6 z-50 bg-glass backdrop-blur-xl border border-glass-border shadow-lg rounded-xl p-4 min-w-[200px] animate-in fade-in slide-in-from-bottom-4 transition-all duration-300 ${
      isMaximized ? 'scale-100 origin-bottom-right' : 'scale-75 origin-bottom-right bottom-2 right-2 p-3'
    }`}>
      <h4 className={`font-semibold text-foreground uppercase tracking-wider mb-3 opacity-60 ${isMaximized ? 'text-[10px]' : 'text-[9px] mb-2'}`}>{t('db_visualizer.legend.title')}</h4>
      <div className="flex flex-col gap-3">
        {/* 1:M (Crow's foot) */}
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="-4 -10 24 20" className="opacity-80">
            <g transform="translate(0, 0)">
              <line x1="0" y1="0" x2="8" y2="-5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
              <line x1="0" y1="0" x2="8" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
              <line x1="0" y1="0" x2="16" y2="0" stroke={stroke} strokeWidth={strokeWidth} />
              <circle cx="12" cy="0" r="2.5" fill="hsl(var(--background))" stroke={stroke} strokeWidth={strokeWidth} />
            </g>
          </svg>
          <span className="text-xs font-medium text-foreground">{t('db_visualizer.legend.many')}</span>
        </div>
        
        {/* 1:1 (Mandatory One) */}
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="-4 -10 24 20" className="opacity-80">
            <g transform="translate(0, 0)">
              <line x1="4" y1="-5" x2="4" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
              <line x1="9" y1="-5" x2="9" y2="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
              <line x1="0" y1="0" x2="16" y2="0" stroke={stroke} strokeWidth={strokeWidth} />
            </g>
          </svg>
          <span className="text-xs font-medium text-foreground">{t('db_visualizer.legend.one')}</span>
        </div>
      </div>
    </div>
  );
};
