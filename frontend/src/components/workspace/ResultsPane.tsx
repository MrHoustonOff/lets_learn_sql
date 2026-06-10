import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table2, Activity, Maximize2, Minimize2 } from 'lucide-react';
import { ExplainModal } from './ExplainModal';
import { useUIStore } from '../../store/uiStore';

interface ResultsPaneProps {
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const ResultsPane: React.FC<ResultsPaneProps> = ({
  isMaximized: propIsMaximized,
  onToggleMaximize: propOnToggleMaximize
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'result' | 'explain'>('result');
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const { maximizedPane, setMaximizedPane } = useUIStore();
  
  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : maximizedPane === 'results';
  
  const handleToggleMaximize = () => {
    if (propOnToggleMaximize) {
      propOnToggleMaximize();
    } else {
      setMaximizedPane(isMaximized ? null : 'results');
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl' : 'bg-transparent relative'}`}>
      {/* Header Tabs */}
      <div className="h-10 border-b border-glass-border flex items-center justify-between px-2 shrink-0 bg-hover">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('result')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'result' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <Table2 size={14} />
            {t('result')}
          </button>
          <button 
            onClick={() => setActiveTab('explain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'explain' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <Activity size={14} />
            {t('explain')}
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          {activeTab === 'explain' && (
            <button 
              onClick={() => setIsExplainModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-warning-text hover:bg-warning/10 px-2 py-1 rounded transition-colors mr-1"
            >
              <Maximize2 size={12} />
              {t('full_analysis')}
            </button>
          )}
          <div className="w-px h-4 bg-glass-border mx-1" />
          <button 
            onClick={handleToggleMaximize}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors"
            title={isMaximized ? "Свернуть" : "Развернуть"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-0 overflow-auto scrollbar-thin">
        {activeTab === 'result' ? (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs uppercase bg-glass/80 text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-4 py-2 border-b border-glass-border/50 font-semibold">customer_id</th>
                <th className="px-4 py-2 border-b border-glass-border/50 font-semibold">company_name</th>
                <th className="px-4 py-2 border-b border-glass-border/50 font-semibold">contact_name</th>
                <th className="px-4 py-2 border-b border-glass-border/50 font-semibold">country</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-glass-border/20 hover:bg-glass-hover/50 transition-colors">
                <td className="px-4 py-2 font-mono text-xs">AROUT</td>
                <td className="px-4 py-2">Around the Horn</td>
                <td className="px-4 py-2">Thomas Hardy</td>
                <td className="px-4 py-2">UK</td>
              </tr>
              <tr className="border-b border-glass-border/20 hover:bg-glass-hover/50 transition-colors">
                <td className="px-4 py-2 font-mono text-xs">BSBEV</td>
                <td className="px-4 py-2">B's Beverages</td>
                <td className="px-4 py-2">Victoria Ashworth</td>
                <td className="px-4 py-2">UK</td>
              </tr>
              <tr className="border-b border-glass-border/20 hover:bg-glass-hover/50 transition-colors">
                <td className="px-4 py-2 font-mono text-xs">CONSH</td>
                <td className="px-4 py-2">Consolidated Holdings</td>
                <td className="px-4 py-2">Elizabeth Brown</td>
                <td className="px-4 py-2">UK</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="p-4 h-full flex flex-col items-center justify-center text-center">
            <Activity size={32} className="text-warning/50 mb-3" />
            <h4 className="font-semibold text-foreground mb-1">Мини-превью плана выполнения</h4>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Здесь будет отображаться краткая выжимка по Explain. Для детального разбора нажмите "Полный анализ".
            </p>
          </div>
        )}
      </div>

      <ExplainModal 
        isOpen={isExplainModalOpen} 
        onClose={() => setIsExplainModalOpen(false)} 
      />
    </div>
  );
};
