import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppLang } from '../../i18n';
import { useTheme } from '../theme-provider';
import { Moon, Sun, User, BookOpen, CheckSquare, Database, AppWindow } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = useAppLang();
  const { theme, setTheme } = useTheme();
  return (
    <nav className="h-auto pb-2 flex items-start justify-between px-4 z-50 bg-transparent pointer-events-none">
      <div className="flex items-start gap-6 pointer-events-auto">
        <div className="pt-2">
          <span className="font-extrabold text-lg tracking-tight text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.6)]">
            LLPg
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <NavLink 
            to="/courses" 
            className={({ isActive }) => `-translate-y-[1px] flex items-center gap-2 px-5 py-2 rounded-b-2xl text-xs font-bold transition-all duration-300 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-t-0 border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
          >
            <BookOpen size={14} />
            {t('courses')}
          </NavLink>
          <NavLink 
            to="/databases" 
            className={({ isActive }) => `-translate-y-[1px] flex items-center gap-2 px-5 py-2 rounded-b-2xl text-xs font-bold transition-all duration-300 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-t-0 border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
          >
            <Database size={14} />
            {t('databases')}
          </NavLink>
          <NavLink 
            to="/tasks" 
            className={({ isActive }) => `-translate-y-[1px] flex items-center gap-2 px-5 py-2 rounded-b-2xl text-xs font-bold transition-all duration-300 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-t-0 border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
          >
            <CheckSquare size={14} />
            {t('tasks')}
          </NavLink>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        {/* DEV: language switcher */}
        <button 
          onClick={() => i18n.changeLanguage(lang === 'ru' ? 'en' : 'ru')}
          className="-translate-y-[1px] px-4 py-2 rounded-b-2xl text-xs font-extrabold tracking-widest transition-all duration-300 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-t-0 border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          title="Change language"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="-translate-y-[1px] p-2.5 rounded-b-2xl transition-all duration-300 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-t-0 border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] text-muted-foreground hover:text-foreground hover:bg-foreground/5"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <NavLink
          to="/profile"
          className={({ isActive }) => `-translate-y-[1px] p-2.5 rounded-b-2xl transition-all duration-300 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-t-0 border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
        >
          <User size={15} />
        </NavLink>
      </div>
    </nav>
  );
};
