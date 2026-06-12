import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Waypoints, Spline, CircleDot, RotateCcw, BookOpenText, Activity, Minus, Move } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ViewMenuProps {
  showRelations: boolean;
  onToggleRelations: () => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  showToolbar: boolean;
  onToggleToolbar: () => void;
  edgeStyle: 'bezier' | 'smoothstep';
  onChangeEdgeStyle: (style: 'bezier' | 'smoothstep') => void;
  animateEdges: boolean;
  onChangeAnimateEdges: (animate: boolean) => void;
  onSaveLayout?: () => void;
  onResetLayout: () => void;
}

export const ViewMenu: React.FC<ViewMenuProps> = ({
  showRelations,
  onToggleRelations,
  showMarkers,
  onToggleMarkers,
  showLegend,
  onToggleLegend,
  showToolbar,
  onToggleToolbar,
  edgeStyle,
  onChangeEdgeStyle,
  animateEdges,
  onChangeAnimateEdges,
  onSaveLayout,
  onResetLayout,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-base transition-all shadow-sm border ${
          isOpen 
            ? 'bg-black/10 dark:bg-white/10 border-glass-border text-foreground'
            : 'bg-glass backdrop-blur-md border-glass-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground'
        }`}
        title={t('db_visualizer.view_menu.settings_title')}
      >
        <Eye size={16} />
        <span>{t('db_visualizer.view_menu.view')}</span>
      </button>
      {/* Выпадающее меню */}
      <div 
        className={`absolute top-full right-0 mt-2 w-64 bg-glass backdrop-blur-xl border border-glass-border rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-2 flex flex-col z-50 transition-all duration-300 origin-top-right ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
          {/* Переключатель легенды */}
          <button
            onClick={() => onToggleLegend()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full mb-1"
          >
            {showLegend ? (
              <BookOpenText size={16} className="text-blue-500" />
            ) : (
              <BookOpenText size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">{t('db_visualizer.view_menu.show_legend')}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showLegend ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showLegend ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          {/* Переключатель тулбара */}
          <button
            onClick={() => onToggleToolbar()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full mb-1"
          >
            {showToolbar ? (
              <Move size={16} className="text-blue-500" />
            ) : (
              <Move size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">{t('db_visualizer.view_menu.show_toolbar')}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showToolbar ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showToolbar ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          <div className="h-px bg-glass-border my-1" />
          <div className="px-2 py-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider pl-1">{t('db_visualizer.relations')}</span>
          </div>

          {/* Переключатель связей */}
          <button
            onClick={() => onToggleRelations()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full"
          >
            {showRelations ? (
              <Eye size={16} className="text-blue-500" />
            ) : (
              <EyeOff size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">{t('db_visualizer.view_menu.show_relations')}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showRelations ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showRelations ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          {/* Переключатель маркеров (1:1, 1:M) */}
          <button
            onClick={() => onToggleMarkers()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full ${!showRelations ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {showMarkers ? (
              <CircleDot size={16} className="text-blue-500" />
            ) : (
              <CircleDot size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">{t('db_visualizer.view_menu.show_markers')}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showMarkers ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showMarkers ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          {/* Переключатель формы линий */}
          <div className={`px-3 py-2 space-y-2 ${!showRelations ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-xs text-muted-foreground font-medium">{t('db_visualizer.view_menu.edge_form')}</span>
            <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg border border-glass-border">
              <button
                onClick={() => onChangeEdgeStyle('bezier')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${
                  edgeStyle === 'bezier' 
                    ? 'bg-background shadow-sm text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Spline size={14} />
                {t('db_visualizer.view_menu.bezier')}
              </button>
              <button
                onClick={() => onChangeEdgeStyle('smoothstep')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${
                  edgeStyle === 'smoothstep' 
                    ? 'bg-background shadow-sm text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Waypoints size={14} />
                {t('db_visualizer.view_menu.smoothstep')}
              </button>
            </div>
          </div>

          {/* Переключатель анимации линий */}
          <div className={`px-3 py-2 space-y-2 ${!showRelations ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-xs text-muted-foreground font-medium">{t('db_visualizer.view_menu.edge_style')}</span>
            <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg border border-glass-border">
              <button
                onClick={() => onChangeAnimateEdges(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${
                  animateEdges 
                    ? 'bg-background shadow-sm text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Activity size={14} />
                {t('db_visualizer.view_menu.animated')}
              </button>
              <button
                onClick={() => onChangeAnimateEdges(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${
                  !animateEdges 
                    ? 'bg-background shadow-sm text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Minus size={14} />
                {t('db_visualizer.view_menu.solid')}
              </button>
            </div>
          </div>

          <div className="h-px bg-glass-border my-1" />

          {/* Действия */}
          {onSaveLayout && (
            <button
              onClick={() => {
                onSaveLayout();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm text-left w-full text-foreground font-medium mb-1"
            >
              <Activity size={16} className="text-primary" />
              <span className="flex-1">{t('db_visualizer.view_menu.save_layout')}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onResetLayout) onResetLayout();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={16} />
            <span className="flex-1">{t('db_visualizer.view_menu.reset_layout')}</span>
          </button>
      </div>
    </div>
  );
};
