import React from 'react';
import { InfoTooltip } from '../../ui/InfoTooltip';

interface ReportBlockCardProps {
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  title: string;
  tooltipText?: string;
  statusIcon?: React.ReactNode;
  children: React.ReactNode;
  cardClassName?: string;
}

export const ReportBlockCard: React.FC<ReportBlockCardProps> = ({
  icon,
  iconBgClass,
  iconColorClass,
  title,
  tooltipText,
  statusIcon,
  children,
  cardClassName = "bg-card border-glass-border"
}) => {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${cardClassName}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconBgClass}`}>
            <div className={iconColorClass}>{icon}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium m-0 text-foreground">{title}</h4>
            {tooltipText && <InfoTooltip text={tooltipText} />}
          </div>
        </div>
        {statusIcon && (
          <div className="shrink-0 ml-4">
            {statusIcon}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};
