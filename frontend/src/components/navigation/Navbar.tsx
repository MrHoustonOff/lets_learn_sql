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

        <div className="hidden md:flex items-center gap-1 px-1.5 py-1.5 rounded-b-xl border border-t-0 border-glass-border bg-glass backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.2)]">
          <NavLink 
            to="/courses" 
            className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out outline-none select-none active:scale-95 [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/15 shadow-[0_0_12px_rgba(var(--primary),0.2)]' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-sm'}`}
          >
            <BookOpen size={14} />
            {t('courses')}
          </NavLink>
          <NavLink 
            to="/databases" 
            className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out outline-none select-none active:scale-95 [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/15 shadow-[0_0_12px_rgba(var(--primary),0.2)]' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-sm'}`}
          >
            <Database size={14} />
            {t('databases')}
          </NavLink>
          <NavLink 
            to="/tasks" 
            className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out outline-none select-none active:scale-95 [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/15 shadow-[0_0_12px_rgba(var(--primary),0.2)]' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-sm'}`}
          >
            <CheckSquare size={14} />
            {t('tasks')}
          </NavLink>
        </div>
      </div>

      <div className="flex items-center gap-1 pointer-events-auto px-1.5 py-1.5 rounded-b-xl border border-t-0 border-glass-border bg-glass backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.2)]">
        {/* DEV: language switcher */}
        <button 
          onClick={() => i18n.changeLanguage(lang === 'ru' ? 'en' : 'ru')}
          className="px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-widest transition-all duration-300 ease-out outline-none select-none active:scale-95 text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-sm"
          title="Change language"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded-lg transition-all duration-300 ease-out outline-none select-none active:scale-95 text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-sm"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <NavLink
          to="/profile"
          className={({ isActive }) => `p-1.5 rounded-lg transition-all duration-300 ease-out outline-none select-none active:scale-95 [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? 'text-primary bg-primary/15 shadow-[0_0_12px_rgba(var(--primary),0.2)]' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-sm'}`}
        >
          <User size={15} />
        </NavLink>
      </div>
    </nav>
  );
};
