import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Eye, EyeOff, Waypoints, Spline, CircleDot, RotateCcw, BookOpenText } from 'lucide-react';

interface ViewMenuProps {
  showRelations: boolean;
  onToggleRelations: () => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  edgeStyle: 'bezier' | 'smoothstep';
  onChangeEdgeStyle: (style: 'bezier' | 'smoothstep') => void;
  onResetLayout: () => void;
}

export const ViewMenu: React.FC<ViewMenuProps> = ({
  showRelations,
  onToggleRelations,
  showMarkers,
  onToggleMarkers,
  showLegend,
  onToggleLegend,
  edgeStyle,
  onChangeEdgeStyle,
  onResetLayout,
}) => {
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
        className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors bg-glass backdrop-blur-md border border-glass-border shadow-sm text-sm font-medium"
      >
        <Settings2 size={16} />
        <span>Вид</span>
      </button>
      {/* Выпадающее меню */}
      <div 
        className={`absolute top-full right-0 mt-2 w-64 bg-glass backdrop-blur-xl border border-glass-border rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-2 flex flex-col z-50 transition-all duration-300 origin-top-right ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
          
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
            <span className="flex-1">Отображать связи</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showRelations ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showRelations ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          {/* Переключатель легенды */}
          <button
            onClick={() => onToggleLegend()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full"
          >
            {showLegend ? (
              <BookOpenText size={16} className="text-blue-500" />
            ) : (
              <BookOpenText size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">Отображать легенду</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showLegend ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showLegend ? 'left-4' : 'left-0.5'}`} />
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
            <span className="flex-1">Отображать тип связей (1:1, 1:M)</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showMarkers ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showMarkers ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          <div className="h-px bg-glass-border my-1" />

          {/* Переключатель формы линий */}
          <div className={`px-3 py-2 space-y-2 ${!showRelations ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Форма соединений</span>
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
                Округлые
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
                Квадратные
              </button>
            </div>
          </div>

          <div className="h-px bg-glass-border my-1" />

          {/* Действия */}
          <button
            onClick={() => {
              if (onResetLayout) onResetLayout();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={16} />
            <span className="flex-1">Сбросить расположение</span>
          </button>
      </div>
    </div>
  );
};
