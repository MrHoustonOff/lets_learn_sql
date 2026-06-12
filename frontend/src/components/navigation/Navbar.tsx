import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppLang } from '../../i18n';
import { useTheme } from '../theme-provider';
import { Moon, Sun, User, BookOpen, CheckSquare, Database } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = useAppLang();
  const { theme, setTheme } = useTheme();
  return (
    <nav className="h-auto pt-2 pb-2 flex items-center justify-between px-2 z-50 bg-transparent pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="pl-1">
          <span className="font-extrabold text-lg tracking-tight text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.6)]">
            LLPg
          </span>
        </div>

        <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg border border-glass-border bg-glass backdrop-blur-md shadow-sm">
          <NavLink 
            to="/courses" 
            className={({ isActive }) => `flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isActive ? 'bg-black/10 dark:bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}
          >
            <BookOpen size={12} />
            {t('courses')}
          </NavLink>
          <NavLink 
            to="/databases" 
            className={({ isActive }) => `flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isActive ? 'bg-black/10 dark:bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}
          >
            <Database size={12} />
            {t('databases')}
          </NavLink>
          <NavLink 
            to="/tasks" 
            className={({ isActive }) => `flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isActive ? 'bg-black/10 dark:bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}
          >
            <CheckSquare size={12} />
            {t('tasks')}
          </NavLink>
        </div>
      </div>

      <div className="flex items-center gap-1 pointer-events-auto p-0.5 rounded-lg border border-glass-border bg-glass backdrop-blur-md shadow-sm">
        {/* DEV: language switcher */}
        <button 
          onClick={() => i18n.changeLanguage(lang === 'ru' ? 'en' : 'ru')}
          className="px-3 py-1.5 rounded-md text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground hover:bg-hover transition-colors"
          title="Change language"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <NavLink
          to="/profile"
          className={({ isActive }) => `p-1 rounded-md transition-colors ${isActive ? 'bg-black/10 dark:bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}
        >
          <User size={14} />
        </NavLink>
      </div>
    </nav>
  );
};
