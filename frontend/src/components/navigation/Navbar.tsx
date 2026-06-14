import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppLang } from '../../i18n';
import { useTheme } from '../theme-provider';
import { Moon, Sun, User, BookOpen, CheckSquare, Database, PenTool } from 'lucide-react';

const baseTabClasses = "transition-all duration-300 active:duration-75 ease-out outline-none select-none active:scale-95 bg-glass backdrop-blur-md border border-glass-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] text-muted-foreground hover:text-foreground hover:bg-foreground/5";
const hangingTabClasses = `-translate-y-[1px] rounded-b-2xl border-t-0 ${baseTabClasses}`;

const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
  `${hangingTabClasses} flex items-center gap-2 px-5 py-2 text-xs font-bold [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? '!text-primary !bg-primary/5' : ''}`;

const iconBtnClasses = `${hangingTabClasses} p-2.5`;
const langBtnClasses = `${hangingTabClasses} px-4 py-2 text-xs font-extrabold tracking-widest`;

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = useAppLang();
  const { theme, setTheme } = useTheme();
  return (
    <nav className="h-auto pb-2 flex items-start justify-between px-4 z-layout bg-transparent pointer-events-none">
      <div className="flex items-start gap-6 pointer-events-auto">
        <div className="pt-2">
          <span className="font-extrabold text-lg tracking-tight text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.6)]">
            LLPg
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <NavLink to="/courses" className={navLinkClasses}>
            <BookOpen size={14} />
            {t('courses')}
          </NavLink>
          <NavLink to="/databases" className={navLinkClasses}>
            <Database size={14} />
            {t('databases')}
          </NavLink>
          <NavLink to="/tasks" className={navLinkClasses}>
            <CheckSquare size={14} />
            {t('tasks')}
          </NavLink>
          <div className="w-px h-6 bg-glass-border mx-1 self-center" />
          <NavLink to="/studio" className={navLinkClasses}>
            <PenTool size={14} />
            {t('studio')}
          </NavLink>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        {/* DEV: language switcher */}
        <button 
          onClick={() => i18n.changeLanguage(lang === 'ru' ? 'en' : 'ru')}
          className={langBtnClasses}
          title="Change language"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={iconBtnClasses}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <NavLink to="/profile" className={({ isActive }) => `${iconBtnClasses} [&.active>svg]:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] ${isActive ? '!text-primary !bg-primary/5' : ''}`}>
          <User size={15} />
        </NavLink>
      </div>
    </nav>
  );
};
