import React, { useState, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { X, Trash2, Download, GripHorizontal, GripVertical, Database, Code2 } from 'lucide-react';
import { DBVisualizer } from '../../modules/db-visualizer';
import { SqlEditorPane } from './SqlEditorPane';
import { ResultsPane } from './ResultsPane';
import type { DatabaseMock } from '../../pages/DatabasesListPage';

interface DatabaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: DatabaseMock | null;
}

export const DatabaseDetailsModal: React.FC<DatabaseDetailsModalProps> = ({ isOpen, onClose, database }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'editor'>('schema');
  
  // Local state for maximizing panes within the modal
  const [maximizedPane, setMaximizedPane] = useState<'schema' | 'editor' | 'results' | null>(null);

  // Обработка Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (maximizedPane) {
          setMaximizedPane(null);
        } else {
          onClose();
        }
      }
    };

    // Используем capture фазу или просто добавляем обработчик
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, maximizedPane, onClose]);

  if (!isOpen || !database) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-background w-full h-full rounded-2xl border border-glass-border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Modal Header */}
        <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-glass-border bg-glass backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                {database.name}
              </h2>
              <div className="text-xs text-muted-foreground font-mono">
                {database.technicalName}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-hover transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body with PanelGroup */}
        <div className="flex-1 overflow-hidden relative">
          <PanelGroup direction="horizontal" id="db_modal_horizontal" className="h-full w-full">
            
            {/* Left Panel: Info & Actions */}
            <Panel defaultSize={30} minSize={20} className="bg-glass/50 backdrop-blur-sm p-6 flex flex-col gap-8 primary-scrollbar overflow-y-auto">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-glass-border pb-2">Информация</h3>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Название</div>
                      <div className="font-medium text-foreground">{database.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Техническое имя</div>
                      <div className="font-mono text-sm px-2 py-1 bg-black/5 dark:bg-white/5 border border-glass-border rounded-md inline-block text-primary">
                        {database.technicalName}
                      </div>
                    </div>
                    {database.description && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Описание</div>
                        <div className="text-sm text-foreground/80 leading-relaxed">
                          {database.description}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mt-auto">
                    <h3 className="text-lg font-semibold border-b border-glass-border pb-2">Действия</h3>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-colors border border-glass-border bg-glass hover:bg-hover text-foreground">
                      <Download size={16} />
                      Скачать pg_dump
                    </button>
                    <div className="group relative">
                      <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-colors border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 size={16} />
                        Удалить БД
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-lg border border-border shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center">
                        Осторожно! Удаление этой БД может сломать задачи, которые на нее ссылаются.
                      </div>
                    </div>
                  </div>
                </Panel>

                <PanelResizeHandle className="w-[2px] bg-glass-border hover:bg-primary/50 transition-colors relative flex items-center justify-center group cursor-col-resize z-40 outline-none">
                  <div className="absolute inset-y-0 -inset-x-3 z-40"></div>
                  <div className="absolute z-50 bg-background/90 backdrop-blur-md border border-glass-border rounded flex items-center justify-center py-1 px-[1px] text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm">
                    <GripVertical size={12} />
                  </div>
                </PanelResizeHandle>

            {/* Right Panel: Workspace (Tabs) */}
            <Panel defaultSize={70} className="bg-background flex flex-col">
              {/* Tabs Header */}
              <div className="h-12 border-b border-glass-border flex items-end px-6 gap-6 shrink-0 bg-glass/20 backdrop-blur-md">
                  <button
                    onClick={() => setActiveTab('schema')}
                    className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'schema' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-glass-border'}`}
                  >
                    <Database size={16} />
                    Схема БД
                  </button>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'editor' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-glass-border'}`}
                  >
                    <Code2 size={16} />
                    SQL Редактор
                  </button>
                </div>

              {/* Tab Content */}
              <div className="flex-1" style={{ height: 'calc(100% - 48px)' }}>
                {activeTab === 'schema' && (
                  <div className={maximizedPane === 'schema' ? 'absolute inset-0 z-[100] bg-background' : 'h-full w-full'}>
                    <DBVisualizer 
                      isMaximized={maximizedPane === 'schema'} 
                      onToggleMaximize={() => setMaximizedPane(maximizedPane === 'schema' ? null : 'schema')}
                    />
                  </div>
                )}
                
                {activeTab === 'editor' && (
                  <PanelGroup direction="vertical" id="db_modal_editor_vertical" className="h-full w-full">
                    <Panel defaultSize={60} minSize={20} className={`!overflow-visible transition-all duration-300 ${maximizedPane === 'editor' ? 'z-[100]' : ''}`}>
                      <SqlEditorPane 
                        isMaximized={maximizedPane === 'editor'}
                        onToggleMaximize={() => setMaximizedPane(maximizedPane === 'editor' ? null : 'editor')}
                      />
                    </Panel>
                    
                    <PanelResizeHandle className="h-[2px] bg-glass-border hover:bg-primary/50 transition-colors relative flex items-center justify-center group cursor-row-resize z-40 outline-none">
                      <div className="absolute -inset-y-3 inset-x-0 z-40"></div>
                      <div className="absolute z-50 bg-background/90 backdrop-blur-md border border-glass-border rounded flex items-center justify-center px-1 py-[1px] text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm">
                        <GripHorizontal size={12} />
                      </div>
                    </PanelResizeHandle>
                    
                    <Panel defaultSize={40} minSize={20} className={`!overflow-visible transition-all duration-300 ${maximizedPane === 'results' ? 'z-[100]' : ''}`}>
                      <ResultsPane 
                        isMaximized={maximizedPane === 'results'}
                        onToggleMaximize={() => setMaximizedPane(maximizedPane === 'results' ? null : 'results')}
                      />
                    </Panel>
                  </PanelGroup>
                )}
              </div>
            </Panel>

          </PanelGroup>
        </div>
      </div>
    </div>
  );
};
