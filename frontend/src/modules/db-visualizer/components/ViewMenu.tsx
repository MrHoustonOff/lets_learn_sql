import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Eye, EyeOff, Waypoints, Spline, CircleDot } from 'lucide-react';

interface ViewMenuProps {
  showRelations: boolean;
  setShowRelations: (val: boolean) => void;
  showMarkers: boolean;
  setShowMarkers: (val: boolean) => void;
  edgeStyle: 'bezier' | 'smoothstep';
  setEdgeStyle: (val: 'bezier' | 'smoothstep') => void;
}

export const ViewMenu: React.FC<ViewMenuProps> = ({
  showRelations,
  setShowRelations,
  showMarkers,
  setShowMarkers,
  edgeStyle,
  setEdgeStyle,
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

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-glass backdrop-blur-xl border border-glass-border rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-2 flex flex-col z-50">
          
          {/* Переключатель видимости связей */}
          <button
            onClick={() => setShowRelations(!showRelations)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full"
          >
            {showRelations ? (
              <Eye size={16} className="text-emerald-500" />
            ) : (
              <EyeOff size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">Отображать связи</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showRelations ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showRelations ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          {/* Переключатель маркеров (1:1, 1:M) */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm text-left w-full ${!showRelations ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {showMarkers ? (
              <Waypoints size={16} className="text-amber-500" />
            ) : (
              <CircleDot size={16} className="text-muted-foreground" />
            )}
            <span className="flex-1">Маркеры (1:M, 1:1)</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showMarkers ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${showMarkers ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          <div className="h-px bg-glass-border my-1" />

          {/* Тип соединений */}
          <div className="px-3 py-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground opacity-80 mb-2 block font-bold">
              Стиль соединений
            </span>
            <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setEdgeStyle('bezier')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${
                  edgeStyle === 'bezier' 
                    ? 'bg-background shadow text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Spline size={14} /> Кривые
              </button>
              <button
                onClick={() => setEdgeStyle('smoothstep')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${
                  edgeStyle === 'smoothstep' 
                    ? 'bg-background shadow text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Waypoints size={14} /> Ломаные
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
