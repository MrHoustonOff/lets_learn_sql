import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, X } from 'lucide-react';
import { ModalBase } from '../../ui/ModalBase';
import { SqlCodeViewer } from '../../ui/SqlCodeViewer';
import { MOCK_REFERENCE_SQL } from './submitReportMocks';

export const ReferenceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('submit_report');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <ModalBase 
      isOpen={isOpen} 
      onClose={onClose}
      isMonolith={true}
    >
      <div className="h-full flex flex-col bg-background relative">
          <div className="h-14 border-b border-glass-border flex items-center justify-between px-6 shrink-0 bg-hover">
            <div className="flex items-center gap-2">
               <span className="text-sm font-mono text-foreground">{t('author_solution_title', 'Эталонное решение')}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                title={copiedCode ? t('copied', 'Скопировано') : t('copy', 'Копировать')}
                onClick={() => handleCopy(MOCK_REFERENCE_SQL)}
                className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center relative"
              >
                {copiedCode ? <Check size={20} className="text-success" /> : <Copy size={20} />}
              </button>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
             <SqlCodeViewer sqlCode={MOCK_REFERENCE_SQL} />
          </div>
      </div>
    </ModalBase>
  );
};
