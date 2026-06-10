import React from 'react';
import { X, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-glass backdrop-blur-3xl w-full h-full max-w-7xl max-h-[90vh] rounded-xl border border-glass-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 border-b border-glass-border flex items-center justify-between px-6 shrink-0 bg-glass/50">
          <div className="flex items-center gap-2">
            <Activity className="text-amber-500" size={20} />
            <h2 className="font-semibold text-lg">{t('full_analysis')}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
              <Activity size={48} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Анализ плана выполнения</h3>
            <p className="text-muted-foreground">
              Здесь будет отображаться подробный граф плана выполнения запроса (EXPLAIN ANALYZE) с визуализацией узлов (Seq Scan, Hash Join, и т.д.) через React Flow, аналогично визуализатору БД.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
