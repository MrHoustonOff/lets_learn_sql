import React from 'react';
import { X, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UniversalPlanTree } from './explain/UniversalPlanTree';

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
            <Network className="text-primary" size={20} />
            <h2 className="font-semibold text-lg">Графовое представление</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          <UniversalPlanTree onClose={onClose} />
        </div>
      </div>
    </div>
  );
};
