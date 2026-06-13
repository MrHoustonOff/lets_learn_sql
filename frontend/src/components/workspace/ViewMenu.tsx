import React, { useState, useRef, useEffect } from 'react';
import { AppWindow, RefreshCw, LayoutTemplate, Type, Minus, Plus, WrapText, Check, RotateCcw, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { InfoTooltip } from '../ui/InfoTooltip';

interface ViewMenuProps {
  onResetProportions: () => void;
}

export const ViewMenu: React.FC<ViewMenuProps> = ({ onResetProportions }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { resetSlots, editorFontSize, setEditorFontSize, editorWordWrap, setEditorWordWrap, hiddenPanels, toggleHiddenPanel } = useUIStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleResetProportions = () => {
    onResetProportions();
    setIsOpen(false);
  };

  const handleResetSlots = () => {
    resetSlots();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-menu flex flex-col items-center justify-end">
      {/* Dropdown Menu (Appears above the button, or below? The button is AT THE TOP EDGE OF THE WORKSPACE.
          Since the button is translating Y full UPWARDS, the menu should probably drop DOWN INTO the workspace!
          Wait, if the button is sticking UP out of the workspace, a menu dropping DOWN will cover the workspace.
          If we use absolute top-full left-1/2 -translate-x-1/2, it will drop into the workspace. */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl border border-glass-border bg-glass backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-1.5 flex flex-col gap-1 z-dropdown">
          <div className="px-2 py-1.5">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground/70">
              {t('view_menu.layout', 'Layout')}
            </span>
          </div>
          

          <button 
            onClick={handleResetProportions}
            className="w-full flex items-center px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-white/10 dark:hover:bg-white/10 transition-colors outline-none group"
          >
            <RefreshCw size={14} className="text-muted-foreground group-hover:text-primary transition-colors mr-2.5 flex-shrink-0" />
            <span className="flex-1 text-left">{t('view_menu.reset_proportions', 'Reset proportions')}</span>
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-2">
              <InfoTooltip text={t('view_menu.reset_proportions_tooltip')} />
            </div>
          </button>

          <button 
            onClick={handleResetSlots}
            className="w-full flex items-center px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-white/10 dark:hover:bg-white/10 transition-colors outline-none group"
          >
            <LayoutTemplate size={14} className="text-muted-foreground group-hover:text-primary transition-colors mr-2.5 flex-shrink-0" />
            <span className="flex-1 text-left">{t('view_menu.reset_slots', 'Default panels layout')}</span>
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-2">
              <InfoTooltip text={t('view_menu.reset_slots_tooltip')} />
            </div>
          </button>

          {/* ---- Panels section ---- */}
          <div className="w-full h-px bg-glass-border my-1" />
          <div className="px-2 py-1.5 flex items-center gap-2">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground/70 flex-1">
              {t('view_menu.panels', 'Окна')}
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <InfoTooltip text={t('view_menu.panels_tooltip', 'Отключите тумблер — и панель полностью исчезнет из раскладки, освободив место остальным.')} />
            </div>
          </div>

          {(['task', 'editor', 'db', 'results'] as const).map((panel) => {
            const labels: Record<string, string> = {
              task: t('view_menu.panel_task', 'Задание'),
              editor: t('view_menu.panel_editor', 'SQL Editor'),
              db: t('view_menu.panel_db', 'DB Viewer'),
              results: t('view_menu.panel_results', 'Output / Explain'),
            };
            const isHidden = hiddenPanels.includes(panel);
            return (
              <button
                key={panel}
                onClick={(e) => { e.stopPropagation(); toggleHiddenPanel(panel); }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-hover transition-colors outline-none group"
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={14} className={`transition-colors ${isHidden ? 'text-muted-foreground/40' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className={isHidden ? 'text-muted-foreground/50' : ''}>{labels[panel]}</span>
                </div>
                {/* Toggle pill */}
                <div className={`relative w-7 h-4 rounded-full transition-colors flex-shrink-0 ${
                  isHidden ? 'bg-muted-foreground/20' : 'bg-primary'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${
                    isHidden ? 'left-0.5' : 'left-3.5'
                  }`} />
                </div>
              </button>
            );
          })}

          <div className="w-full h-px bg-glass-border my-1" />
          <div className="px-2 py-1.5">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground/70">
              {t('view_menu.editor', 'Editor')}
            </span>
          </div>

          <div className="w-full flex items-center justify-between px-2.5 py-2">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
              <Type size={14} className="text-muted-foreground" />
              {t('view_menu.font_size', 'Font size')}
            </div>
            <div className="flex items-center gap-1">
              {editorFontSize !== 14 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditorFontSize(14); }} 
                  className="p-1 hover:bg-white/10 dark:hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground mr-1"
                  title={t('view_menu.reset_font_size', 'Reset font size')}
                >
                  <RotateCcw size={12} />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); setEditorFontSize(Math.max(10, editorFontSize - 1)); }} 
                className="p-1 hover:bg-white/10 dark:hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                <Minus size={14} />
              </button>
              <span className="w-5 text-center text-xs font-mono">{editorFontSize}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditorFontSize(Math.min(30, editorFontSize + 1)); }} 
                className="p-1 hover:bg-white/10 dark:hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditorWordWrap(!editorWordWrap);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-white/10 dark:hover:bg-white/10 transition-colors outline-none group"
          >
            <div className="flex items-center gap-2.5">
              <WrapText size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              {t('view_menu.word_wrap', 'Word wrap')}
            </div>
            {editorWordWrap && <Check size={14} className="text-primary" />}
          </button>
        </div>
      )}

      {/* The Tab Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`translate-y-[1px] flex items-center gap-2 px-5 py-2 rounded-t-2xl text-xs font-bold transition-all duration-300 active:duration-75 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-b-0 border-glass-border shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.2)] ${isOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
      >
        <AppWindow size={15} className={`transition-colors ${isOpen ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'text-muted-foreground group-hover:text-foreground'}`} />
        {t('view')}
      </button>
    </div>
  );
};
