import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Table2, ShieldCheck, ShieldX, Copy, Check, Trash2, History, KeyRound
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { useTheme } from '../../components/theme-provider';
import type { GradeReport, RuleResult, RowSample } from '../../store/queryStore';
import { InfoTooltip } from '../ui/InfoTooltip';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STAGE1_REPORT = {
  passed: false,
  user_row_count: 2,
  ref_row_count: 1000,
  user_hash: 'abc',
  ref_hash: 'def',
  hash_match: false,
  except_ran: true,
  extra_rows: {
    total: 2,
    rows: [
      ["Alfreds Futterkiste", "Maria Anders"],
      ["Ana Trujillo Emparedados", "Ana Trujillo"]
    ]
  },
  missing_rows: {
    total: 1000,
    rows: [
      ["Bottom-Dollar Markets", "Elizabeth Lincoln", "23 Tsawassen Blvd.", "Tsawassen", "BC", "T2F 8M4", "Canada", "(604) 555-4729", "(604) 555-3745", "1"],
      ["B's Beverages", "Victoria Ashworth", "Fauntleroy Circus", "London", "NULL", "EC2 5NT", "UK", "(171) 555-1212", "NULL", "2"],
      ["Cactus Comidas para llevar", "Patricio Simpson", "Cerrito 333", "Buenos Aires", "NULL", "1010", "Argentina", "(1) 135-5555", "(1) 135-4892", "3"],
      ["Centro comercial Moctezuma", "Francisco Chang", "Sierras de Granada 9993", "México D.F.", "NULL", "05022", "Mexico", "(5) 555-3392", "(5) 555-7293", "4"],
      ["Chop-suey Chinese", "Yang Wang", "Hauptstr. 29", "Bern", "NULL", "3012", "Switzerland", "0452-076545", "NULL", "5"]
    ]
  },
  order_matters: true,
  order_passed: null,
  sql_error: null,
};

const MOCK_STAGE2_REPORT = {
  ran: true,
  all_blocking_passed: false,
  rules: [
    {
      rule_id: 1,
      category: 'construct',
      condition: 'required',
      params: { target: 'JOIN' },
      severity: 'blocking',
      message: 'construct.required [JOIN]',
      sort_order: 1,
      passed: true,
      actual_value: 2,
      detail_msg: 'JOIN найден (2 шт.)',
    },
    {
      rule_id: 2,
      category: 'construct',
      condition: 'count_max',
      params: { target: 'SUBQUERY', value: 0 },
      severity: 'blocking',
      message: 'construct.count_max [SUBQUERY=0]',
      sort_order: 2,
      passed: false,
      actual_value: 1,
      detail_msg: 'Найдено: подзапрос использован 1 раз (допустимо 0)',
    },
    {
      rule_id: 3,
      category: 'select_star',
      condition: 'forbidden',
      params: {},
      severity: 'warning',
      message: 'select_star.forbidden',
      sort_order: 3,
      passed: false,
      actual_value: true,
      detail_msg: 'Найдено: SELECT * на верхнем уровне запроса',
    },
    {
      rule_id: 4,
      category: 'function',
      condition: 'required',
      params: { function_name: 'COALESCE' },
      severity: 'blocking',
      message: 'function.required [COALESCE]',
      sort_order: 4,
      passed: false,
      actual_value: false,
      detail_msg: 'Найдено: функция COALESCE не используется (требуется)',
    },
    {
      rule_id: 5,
      category: 'performance',
      condition: 'no_seqscan',
      params: { table_name: 'orders' },
      severity: 'blocking',
      message: 'performance.no_seqscan [orders]',
      sort_order: 5,
      passed: true,
      actual_value: null,
      detail_msg: 'Полное сканирование (Seq Scan) по таблице orders не обнаружено',
    }
  ] as RuleResult[]
};

const MOCK_HISTORY = Array.from({ length: 14 }).map((_, i) => ({
  id: `attempt-db-id-${i + 1}`,
  date: new Date(Date.now() - i * 1000 * 60 * 60 * 3), // Every 3 hours back
  durationMs: Math.round(Math.random() * 50 + 10),
  verdict: i === 5 || i === 8 || i === 12,
  sql: `SELECT * \nFROM customers\n${i % 2 === 0 ? "WHERE country = 'UK'" : "LIMIT 10"};`
}));

const MOCK_REFERENCE_SQL = `-- Эталонное решение автора\nSELECT \n  c.company_name, \n  o.order_id \nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id\nORDER BY c.company_name;`;

// ============================================================================
// UI Components
// ============================================================================



const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
);

const StatusIcon: React.FC<{ passed: boolean; warning?: boolean; size?: number }> = ({ passed, warning = false, size = 16 }) => {
  if (passed) return <CheckCircle2 size={size} className="text-success shrink-0" />;
  if (warning) return <AlertTriangle size={size} className="text-warning shrink-0" />;
  return <XCircle size={size} className="text-destructive shrink-0" />;
};

const CollapsibleSection: React.FC<{
  title: string;
  infoText?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, infoText, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col mb-6">
      <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-1">
          {open ? (
            <ChevronDown size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors leading-none translate-y-[1px]">
            {title}
          </h3>
        </div>
        {infoText && <InfoTooltip text={infoText} className="" />}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
};

const DataGrid: React.FC<{ sample: RowSample; title: string; info: string }> = ({ sample, title, info }) => {
  const { t } = useTranslation('submit_report');
  if (!sample.rows || sample.rows.length === 0) return null;
  return (
    <div className="rounded-md border border-glass-border overflow-hidden mt-3">
      <div className="px-3 py-1.5 text-2xs font-semibold bg-hover flex items-center justify-between border-b border-glass-border">
        <span className="flex items-center gap-1.5">
          <Table2 size={12} className="opacity-70" />
          <span className="leading-none translate-y-[1px]">{title}</span>
          <InfoTooltip text={info} className="" />
        </span>
        <span className="opacity-60 font-normal">{t('shown_of', { shown: sample.rows.length, total: sample.total })}</span>
      </div>
      <div className="overflow-x-auto w-full max-w-[calc(100vw-300px)] custom-scrollbar pb-1 bg-background">
        <table className="w-full text-2xs font-mono">
          <tbody>
            {sample.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-glass-border hover:bg-hover last:border-b-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 whitespace-nowrap border-r border-glass-border last:border-r-0">
                    {cell === null ? <span className="opacity-40 italic">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SqlCodeViewer: React.FC<{ sqlCode: string; height?: string }> = ({ sqlCode, height = '100%' }) => {
  const { theme } = useTheme();

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-transparent">
      <div className="flex-1 overflow-auto custom-scrollbar">
         <CodeMirror
          value={sqlCode}
          height={height}
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[sql(), EditorView.lineWrapping]}
          readOnly={true}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
          }}
          className="text-sm font-mono h-full"
        />
      </div>
    </div>
  );
};

const ModalBase: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode; 
  title?: string;
  isMonolith?: boolean;
}> = ({ isOpen, onClose, children, title, isMonolith = false }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-modal-backdrop bg-background/80 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-background shadow-2xl border border-glass-border w-full h-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative ${isMonolith ? 'max-w-4xl rounded-xl' : 'max-w-6xl rounded-lg'}`}>
        {!isMonolith && title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-hover shrink-0 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg relative overflow-hidden">
                <History className="relative z-layout" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{title}</h2>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors">
                <CloseIcon />
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Main SubmitReport Component (Mocked)
// ============================================================================

interface SubmitReportProps {
  report?: GradeReport | null;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export const SubmitReport: React.FC<SubmitReportProps> = (_props) => {
  const { t } = useTranslation('submit_report');

  // States for History Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(MOCK_HISTORY.length / itemsPerPage);
  const currentHistory = MOCK_HISTORY.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // States for Modals
  const [selectedAttempt, setSelectedAttempt] = useState<typeof MOCK_HISTORY[0] | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Formatter
  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10">

      {/* ======= Stage 1: Data Comparison ======= */}
      <CollapsibleSection 
        title={t('stage1_title', 'Первичные тесты')}
        infoText={t('stage1_info', 'Сравнение результатов вашего запроса с эталонным решением.')}
      >
        {/* Summary block with subtle tint */}
        <div className={`flex items-center gap-4 text-xs mb-4 p-2.5 rounded-md border w-fit ${
          MOCK_STAGE1_REPORT.user_row_count === MOCK_STAGE1_REPORT.ref_row_count 
            ? 'bg-success/10 border-success/20' 
            : 'bg-destructive/10 border-destructive/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('rows_found', 'Найдено строк:')}</span>
            <span className="font-mono font-medium">{MOCK_STAGE1_REPORT.user_row_count}</span>
          </div>
          <div className="w-px h-4 bg-glass-border"></div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('rows_expected', 'Ожидалось:')}</span>
            <span className="font-mono font-medium">{MOCK_STAGE1_REPORT.ref_row_count}</span>
          </div>
          <InfoTooltip text={t('rows_ratio_hint', 'Сравнение количества строк: если у вас их меньше, значит запрос отфильтровал нужные данные. Если больше — вывел лишние.')} className="" />
          <div className="w-px h-4 bg-glass-border"></div>
          <div className="flex items-center gap-1.5 text-warning-text font-medium">
            <AlertTriangle size={13} />
            <span className="leading-none translate-y-[1px]">{t('order_matters', 'Порядок важен')}</span>
            <InfoTooltip text={t('order_matters_hint', 'В этой задаче требуется отсортировать результат. Позиции строк будут проверяться.')} className="" />
          </div>
        </div>

        <DataGrid 
          sample={MOCK_STAGE1_REPORT.extra_rows} 
          title={t('extra_rows_title', 'Лишние строки')}
          info={t('extra_rows_hint', 'Эти строки есть в вашем ответе, но их нет в правильном решении автора.')}
        />
        
        <DataGrid 
          sample={MOCK_STAGE1_REPORT.missing_rows} 
          title={t('missing_rows_title', 'Недостающие строки')}
          info={t('missing_rows_hint', 'Эти строки должны быть в результате, но ваш запрос их не вывел.')}
        />
      </CollapsibleSection>

      {/* ======= Stage 2: AST Rules ======= */}
      <CollapsibleSection 
        title={t('stage2_rules_title', 'Дополнительные тесты')}
        infoText="Автоматические тесты структуры вашего запроса."
      >
        <div className="flex flex-col gap-1.5">
          {MOCK_STAGE2_REPORT.rules.map(r => {
            const isWarning = !r.passed && r.severity === 'warning';
            return (
              <div key={r.rule_id} className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md border transition-colors ${!r.passed ? (isWarning ? 'bg-warning/5 border-warning/20 hover:border-warning/40' : 'bg-destructive/5 border-destructive/20 hover:border-destructive/40') : 'bg-success/5 border-success/20 hover:border-success/40'}`}>
                <StatusIcon passed={r.passed} warning={isWarning} size={14} />
                <span className={`text-xs font-mono ${r.passed ? 'text-foreground' : isWarning ? 'text-warning-text' : 'text-destructive'}`}>
                  {r.message}
                </span>
                {!r.passed && (
                  <span className="text-2xs text-muted-foreground ml-2 opacity-80 max-w-[50%] truncate font-mono" title={r.detail_msg}>
                    — {r.detail_msg}
                  </span>
                )}
                <InfoTooltip text="Lorem ipsum dolor sit amet, consectetur adipiscing elit." className="ml-1" />
                <span className="ml-auto text-2xs text-muted-foreground font-mono">1 ms</span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ======= Verdict Banner ======= */}
      <div className="rounded-lg border px-4 py-3 flex items-center gap-3.5 border-destructive/40 bg-destructive/10">
        <ShieldX size={28} className="text-destructive shrink-0" />
        <div>
          <p className="text-base font-bold text-destructive tracking-tight">{t('basic_check_failed', 'Базовая проверка не пройдена')}</p>
          <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
            42.5 ms
          </p>
        </div>
      </div>

      {/* ======= History Block ======= */}
      <CollapsibleSection 
        title={t('previous_solutions', 'Предыдущие решения')}
        infoText={t('previous_solutions_hint', 'Кликните по попытке, чтобы посмотреть её код и детали, или удалить. Вы также можете массово удалить все решения ниже.')}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-muted-foreground font-mono">{t('page_info', { current: currentPage, total: totalPages })}</span>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-2 py-1 text-2xs rounded bg-card hover:bg-hover disabled:opacity-30 border border-glass-border transition-colors"
              >{t('page_back', 'Назад')}</button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-2 py-1 text-2xs rounded bg-card hover:bg-hover disabled:opacity-30 border border-glass-border transition-colors"
              >{t('page_forward', 'Вперед')}</button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {currentHistory.map((attempt) => (
              <button
                key={attempt.id}
                onClick={() => setSelectedAttempt(attempt)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-md border border-transparent transition-all w-full text-left ${attempt.verdict ? 'bg-success/10 hover:bg-success/20' : 'bg-destructive/10 hover:bg-destructive/20'}`}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon passed={attempt.verdict} size={14} />
                  <span className="text-xs font-medium text-foreground">
                    {t('attempt_prefix', 'Попытка №')}{attempt.id.split('-').pop()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono">
                  <span>{formatDate(attempt.date)}</span>
                  <span>{attempt.durationMs} ms</span>
                </div>
              </button>
            ))}
          </div>

          {/* Danger Zone Management */}
          <div className="flex justify-end gap-2 mt-1">
            <button className="text-[10px] text-muted-foreground/60 hover:bg-destructive hover:text-destructive-foreground transition-colors uppercase tracking-wider font-semibold px-2 py-1 rounded">
              {t('delete_incorrect', 'Удалить неверные')}
            </button>
            <button className="text-[10px] text-muted-foreground/60 hover:bg-destructive hover:text-destructive-foreground transition-colors uppercase tracking-wider font-semibold px-2 py-1 rounded">
              {t('delete_correct', 'Удалить верные')}
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <div className="h-px bg-glass-border w-full my-2 opacity-50" />

      <div className="text-center pt-6 pb-2 text-muted-foreground opacity-60">
        <p className="text-tiny">{t('empty_state_desc', 'Оно открывается после того, как вы совершите хотя бы одну попытку решения.')}</p>
      </div>

      {/* ======= Reference Solution Button ======= */}
      <div className="flex justify-center mb-8 mt-2">
        <button 
          onClick={() => setShowReference(true)}
          className="px-4 py-2 bg-background border border-glass-border hover:bg-hover text-foreground font-medium rounded-md text-xs transition-colors flex items-center gap-2 shadow-sm"
        >
          <KeyRound size={14} className="text-muted-foreground" />
          {t('show_author_solution', 'Показать решение автора')}
        </button>
      </div>

      {/* ======= Modals ======= */}

      {/* 1. Attempt Detail Modal */}
      <ModalBase 
        isOpen={!!selectedAttempt} 
        onClose={() => setSelectedAttempt(null)}
        title={`Попытка ${selectedAttempt?.id.split('-').pop()}`}
      >
        <div className="flex h-full bg-background flex-1 overflow-hidden">
          {/* Left: Code */}
          <div className="w-7/12 border-r border-glass-border flex flex-col bg-background">
            {/* Header inside the dark area for the code */}
            <div className="h-10 border-b border-glass-border flex items-center justify-between px-4 shrink-0 bg-hover">
              <div className="text-xs font-mono text-muted-foreground">SQL Запрос</div>
              <button
                title={copiedCode ? t('copied', 'Скопировано') : t('copy', 'Копировать')}
                onClick={() => handleCopy(selectedAttempt?.sql || '')}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center relative"
              >
                {copiedCode ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>
            
            <div className="flex-1 min-h-0 relative">
               <SqlCodeViewer sqlCode={selectedAttempt?.sql || ''} />
            </div>

            <div className="h-10 border-t border-glass-border flex items-center justify-between px-4 shrink-0 bg-hover">
              <div className="text-xs font-mono text-muted-foreground">
                {t('run_at', 'Запущено:')} {selectedAttempt && formatDate(selectedAttempt.date)}
              </div>
              <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors border border-transparent">
                <Trash2 size={12} /> {t('delete_attempt', 'Удалить попытку')}
              </button>
            </div>
          </div>
          
          {/* Right: Report Mini */}
          <div className="w-5/12 p-6 overflow-y-auto bg-background flex flex-col pt-10">
            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 mb-6 ${selectedAttempt?.verdict ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedAttempt?.verdict ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                {selectedAttempt?.verdict ? <ShieldCheck size={24} /> : <ShieldX size={24} />}
              </div>
              <p className={`font-bold ${selectedAttempt?.verdict ? 'text-success' : 'text-destructive'}`}>
                {selectedAttempt?.verdict ? t('verdict_passed', 'Зачтено') : t('verdict_failed', 'Не зачтено')}
              </p>
            </div>
          </div>
        </div>
      </ModalBase>

      {/* 2. Reference Solution Monolithic Modal */}
      <ModalBase 
        isOpen={showReference} 
        onClose={() => setShowReference(false)}
        isMonolith={true}
      >
        <div className="h-full flex flex-col bg-background relative">
            <div className="h-14 border-b border-glass-border flex items-center justify-between px-6 shrink-0 bg-hover">
              <div className="flex items-center gap-2">
                 <span className="text-sm font-mono text-foreground">{t('author_solution_title', 'Эталонное решение')}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  title={copiedCode ? t('copied', 'Скопировано') : t('copy', 'Копировать')}
                  onClick={() => handleCopy(MOCK_REFERENCE_SQL)}
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center relative"
                >
                  {copiedCode ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                </button>
                <button onClick={() => setShowReference(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <CloseIcon />
                </button>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
               <SqlCodeViewer sqlCode={MOCK_REFERENCE_SQL} />
            </div>
        </div>
      </ModalBase>

    </div>
  );
};
