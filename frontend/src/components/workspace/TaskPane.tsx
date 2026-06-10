import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { Maximize2, Minimize2, Check, Bookmark } from 'lucide-react';

export const TaskPane: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'task' | 'solution'>('task');
  const [isSolved, setIsSolved] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'task';

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl' : 'bg-transparent'}`}>
      <div className="h-10 border-b border-glass-border flex items-center px-2 shrink-0 bg-hover justify-between">
        <div className="flex items-center gap-1">
          <button 
          onClick={() => setActiveTab('task')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'task' 
              ? 'bg-background text-foreground shadow-sm border border-border/40' 
              : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
          }`}
        >
          {t('task')}
        </button>
        <button 
          onClick={() => setActiveTab('solution')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'solution' 
              ? 'bg-background text-foreground shadow-sm border border-border/40' 
              : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
          }`}
        >
          {t('solution')}
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => setIsSolved(!isSolved)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${
            isSolved 
              ? 'bg-success/10 border-success/30 text-success shadow-sm' 
              : 'bg-transparent border-transparent text-muted-foreground hover:bg-hover hover:text-foreground'
          }`}
          title="Пометить как решено"
        >
          <Check size={14} className={isSolved ? 'opacity-100' : 'opacity-40'} strokeWidth={isSolved ? 3 : 2} />
          <span className="text-xs font-medium">Решено</span>
        </button>

        <button 
          onClick={() => setIsBookmarked(!isBookmarked)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${
            isBookmarked 
              ? 'bg-warning/10 border-warning/30 text-warning-text shadow-sm' 
              : 'bg-transparent border-transparent text-muted-foreground hover:bg-hover hover:text-foreground'
          }`}
          title="В закладки"
        >
          <Bookmark size={14} className={isBookmarked ? 'opacity-100 fill-current' : 'opacity-40'} />
          <span className="text-xs font-medium">Пометить</span>
        </button>

        <div className="w-[1px] h-4 bg-glass-border mx-1"></div>

        <button 
          onClick={() => setMaximizedPane(isMaximized ? null : 'task')}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors"
          title={isMaximized ? "Свернуть" : "Развернуть"}
        >
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto prose dark:prose-invert max-w-none text-sm scrollbar-thin">
        {activeTab === 'task' ? (
          <div className="animate-in fade-in duration-300">
            <h3 className="mt-0 mb-4 text-lg font-bold">1. Все клиенты</h3>
            <p>Напишите SQL запрос, который выводит все колонки из таблицы <code>customers</code>.</p>
            
            <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-xl">
              <p className="text-info m-0 leading-relaxed">
                <strong className="block mb-1">Подсказка:</strong> 
                Используйте символ <code>*</code> для выбора всех колонок.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <h3 className="mt-0 mb-4 text-lg font-bold">Решение</h3>
            <p>Оно открывается после того, как вы совершите хотя бы одну попытку решения.</p>
            <pre className="bg-hover p-4 rounded-xl mt-4 border border-glass-border/50 shadow-inner">
              <code className="text-success font-mono text-[13px]">
                SELECT * FROM public.customers;
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
