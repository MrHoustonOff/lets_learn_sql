import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export const SelectInput: React.FC<{ value: string | null; onChange: (v: string) => void; options: { value: string; label: string; info?: string }[]; placeholder?: string; className?: string }> = ({ value, onChange, options, placeholder, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-popover border rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all flex items-center justify-between text-left ${isOpen ? 'border-primary ring-2 ring-ring/40' : 'border-border'}`}
      >
        <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedOption ? selectedOption.label : placeholder || 'Выберите значение'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-popover top-full mt-1.5 w-full bg-popover border border-border/80 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {options.map((opt) => (
              <OptionItem 
                key={opt.value}
                opt={opt}
                isSelected={opt.value === value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              />
            ))}
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Нет доступных вариантов
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const OptionItem = ({ opt, isSelected, onClick }: { opt: { value: string; label: string; info?: string }, isSelected: boolean, onClick: () => void }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  const timerRef = React.useRef<NodeJS.Timeout>();

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!opt.info) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 288;
    let left = rect.right + 10;
    if (left + tooltipWidth > window.innerWidth) left = rect.left - tooltipWidth - 10;
    
    let top = rect.top;
    if (top + 100 > window.innerHeight) top = window.innerHeight - 100;

    setStyle({ top: `${top}px`, left: `${left}px` });
    timerRef.current = setTimeout(() => setShowTooltip(true), 500);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
  };

  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <>
      <button
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary/80'
        }`}
      >
        {opt.label}
      </button>
      {showTooltip && opt.info && createPortal(
        <div 
          className="fixed z-tooltip w-72 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-2xl border border-glass-border pointer-events-none whitespace-pre-wrap font-sans font-normal normal-case leading-relaxed animate-in fade-in zoom-in-0 duration-200"
          style={style}
        >
          {opt.info}
        </div>,
        document.body
      )}
    </>
  );
};
