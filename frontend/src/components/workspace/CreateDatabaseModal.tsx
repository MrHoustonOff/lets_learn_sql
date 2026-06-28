import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { useTheme } from '../theme-provider';
import {
  X, Database, ChevronRight, ArrowLeft, CheckCircle2,
  XCircle, Loader2, Upload, FileCode2, AlertTriangle, Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InfoTooltip } from '../ui/InfoTooltip';

type Step = 'name' | 'sql' | 'creating' | 'done' | 'error';
type SqlMode = 'editor' | 'file';

interface ProgressStep {
  id: string;
  labelKey: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
}

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (technicalName: string) => void;
}

const PROGRESS_STEPS: Omit<ProgressStep, 'status'>[] = [
  { id: 'check_name', labelKey: 'progress_check_name' },
  { id: 'create_db', labelKey: 'progress_create_db' },
  { id: 'run_sql', labelKey: 'progress_run_sql' },
  { id: 'grant', labelKey: 'progress_grant' },
  { id: 'register', labelKey: 'progress_register' },
  { id: 'dump', labelKey: 'progress_dump' },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [step, setStep] = useState<Step>('name');
  const [sqlMode, setSqlMode] = useState<SqlMode>('editor');

  // Step 1: Name
  const [technicalName, setTechnicalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'available' | 'error'>('idle');
  const [nameError, setNameError] = useState<string | null>(null);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: SQL
  const [initSql, setInitSql] = useState('');
  const [sqlFile, setSqlFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Progress
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(
    PROGRESS_STEPS.map(s => ({ ...s, status: 'pending' }))
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDbName, setCreatedDbName] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('name');
    setSqlMode('editor');
    setTechnicalName('');
    setDisplayName('');
    setNameStatus('idle');
    setNameError(null);
    setInitSql('');
    setSqlFile(null);
    setProgressSteps(PROGRESS_STEPS.map(s => ({ ...s, status: 'pending' })));
    setErrorMessage(null);
    setCreatedDbName(null);
  }, []);

  // Esc closes modal (NOT during creation)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'creating') {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, step]);

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 300);
  };

  const getEffectiveSql = async (): Promise<string> => {
    if (sqlMode === 'file' && sqlFile) return await sqlFile.text();
    return initSql;
  };

  // Live debounced name validation
  useEffect(() => {
    if (!technicalName) {
      setNameStatus('idle');
      setNameError(null);
      return;
    }
    setNameStatus('checking');
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/databases/validate?name=${encodeURIComponent(technicalName)}`);
        const data = await res.json();
        if (data.available) {
          setNameStatus('available');
          setNameError(null);
        } else {
          setNameStatus('error');
          setNameError(data.error);
        }
      } catch {
        setNameStatus('error');
        setNameError('Не удалось проверить имя');
      }
    }, 400);
  }, [technicalName]);

  const handleFileChange = (file: File | null) => {
    if (file && file.name.endsWith('.sql')) setSqlFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files[0]);
  };

  const updateProgressStep = (id: string, status: ProgressStep['status']) =>
    setProgressSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));

  const handleCreate = async () => {
    if (!technicalName || nameStatus !== 'available') return;
    setStep('creating');
    setProgressSteps(PROGRESS_STEPS.map(s => ({ ...s, status: 'pending' })));
    setErrorMessage(null);

    const finalSql = await getEffectiveSql();
    const noSql = !finalSql.trim();

    try {
      updateProgressStep('check_name', 'running');
      await delay(300);
      updateProgressStep('check_name', 'done');

      updateProgressStep('create_db', 'running');

      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technical_name: technicalName,
          display_name: displayName.trim() || technicalName,
          init_sql: finalSql,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Неизвестная ошибка');
      }

      updateProgressStep('create_db', 'done');
      await delay(200);
      updateProgressStep('run_sql', noSql ? 'skipped' : 'done');
      await delay(150);
      updateProgressStep('grant', 'done');
      await delay(150);
      updateProgressStep('register', 'done');
      await delay(150);
      updateProgressStep('dump', 'done');
      await delay(300);

      setCreatedDbName(technicalName);
      setStep('done');
    } catch (e: any) {
      setProgressSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
      setErrorMessage(e.message || 'Неизвестная ошибка');
      setStep('error');
    }
  };

  const handleDoneAndOpen = () => {
    if (createdDbName) onCreated(createdDbName);
    handleClose();
  };

  if (!isOpen) return null;

  const sqlHasContent = (sqlMode === 'editor' && initSql.trim()) || (sqlMode === 'file' && !!sqlFile);

  // i18n tooltip texts
  const technicalNameTooltip = t('create_db:tip_technical_name',
    'Техническое имя — это идентификатор базы данных в PostgreSQL.\n\n' +
    '⚠️ Критически важно:\n' +
    'Имя напрямую влияет на то, подтянутся ли задачи курса! Авторы задач привязывают их к конкретному имени БД. Используйте то имя, которое указал автор базы данных.\n\n' +
    'Требования:\n' +
    '• Только строчные буквы a–z, цифры 0–9, и символ _\n' +
    '• Начинается с буквы\n' +
    '• Не более 63 символов\n' +
    '• Должно быть уникальным — такая база не должна существовать\n\n' +
    'Примеры: northwind, shop_db, my_catalog_2024'
  );

  const displayNameTooltip = t('create_db:tip_display_name',
    'Отображаемое имя — это просто красивый ярлык для интерфейса.\n\n' +
    'Оно не влияет ни на что технически — только на то, как база данных называется в списке. Можно оставить пустым — тогда будет показано техническое имя.'
  );

  const sqlScriptTooltip = t('create_db:tip_sql_script',
    'SQL-скрипт инициализации — выполняется однократно сразу после создания базы данных.\n\n' +
    'Что можно делать:\n' +
    '• CREATE TABLE — создание таблиц\n' +
    '• INSERT INTO — наполнение данными\n' +
    '• CREATE INDEX, CREATE VIEW и другие DDL\n' +
    '• Полный дамп pg_dump без CREATE DATABASE\n\n' +
    'Что НЕ нужно включать:\n' +
    '• CREATE DATABASE — база уже создана\n' +
    '• CREATE ROLE / DROP ROLE — права управляются системой\n\n' +
    'Скрипт может быть пустым — тогда создастся пустая база данных.'
  );

  return (
    <div className="fixed inset-0 z-modal-top bg-background/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-glass w-full max-w-2xl rounded-2xl border border-glass-border shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-glass-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {step === 'name' && t('create_db:step_name_title')}
                {step === 'sql' && t('create_db:step_sql_title')}
                {step === 'creating' && t('create_db:step_progress_title')}
                {step === 'done' && t('create_db:step_done_title')}
                {step === 'error' && t('create_db:step_error_title')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 'name' && t('create_db:step_name_subtitle')}
                {step === 'sql' && t('create_db:step_sql_subtitle')}
                {step === 'done' && t('create_db:step_done_subtitle')}
                {step === 'error' && t('create_db:step_error_subtitle')}
              </p>
            </div>
          </div>
          {step !== 'creating' && (
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Step breadcrumb */}
        {(step === 'name' || step === 'sql') && (
          <div className="px-6 py-3 border-b border-glass-border flex items-center gap-2 shrink-0 text-xs">
            {(['name', 'sql'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 font-medium transition-colors ${step === s ? 'text-primary' : step === 'sql' && s === 'name' ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-colors ${step === s ? 'bg-primary text-primary-foreground' : step === 'sql' && s === 'name' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {step === 'sql' && s === 'name' ? <Check size={12} /> : i + 1}
                  </div>
                  {s === 'name' ? t('create_db:breadcrumb_name', 'Имя БД') : t('create_db:breadcrumb_sql', 'SQL скрипт')}
                </div>
                {i === 0 && <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto primary-scrollbar">

          {/* ── STEP 1: Name ── */}
          {step === 'name' && (
            <div className="p-6 flex flex-col gap-5">

              {/* Technical name */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-semibold text-foreground">
                    {t('create_db:field_technical_name')} <span className="text-destructive">*</span>
                  </label>
                  <InfoTooltip text={technicalNameTooltip} />
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={technicalName}
                    onChange={e => setTechnicalName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="northwind"
                    autoFocus
                    className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground text-sm font-mono placeholder-muted-foreground outline-none transition-colors pr-10 ${
                      nameStatus === 'available' ? 'border-green-500/70 focus:border-green-500' :
                      nameStatus === 'error' ? 'border-destructive/70 focus:border-destructive' :
                      'border-glass-border focus:border-primary'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameStatus === 'checking' && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
                    {nameStatus === 'available' && <CheckCircle2 size={16} className="text-green-500" />}
                    {nameStatus === 'error' && <XCircle size={16} className="text-destructive" />}
                  </div>
                </div>

                {/* Status messages */}
                {nameStatus === 'available' && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {t('create_db:name_available')}
                  </p>
                )}
                {nameStatus === 'error' && nameError && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-destructive/10 border border-destructive/40">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <XCircle size={13} className="shrink-0" />
                      {t('create_db:name_conflict_title', 'Такое техническое имя уже занято')}
                    </p>
                    <p className="text-xs text-muted-foreground">{nameError}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('create_db:name_conflict_hint', 'Выберите другое имя. Если нужная БД уже существует — откройте её в списке баз данных.')}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">{t('create_db:field_technical_name_hint')}</p>
              </div>

              {/* Critical warning about naming */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {t('create_db:name_importance_warning',
                    'Крайне рекомендуется использовать то же техническое имя, которое задал автор базы данных. От этого зависит, подтянутся ли задачи курса к данной БД.'
                  )}
                </p>
              </div>

              {/* Display name */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-semibold text-foreground">
                    {t('create_db:field_display_name')}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{t('create_db:optional', '(необязательно)')}</span>
                  </label>
                  <InfoTooltip text={displayNameTooltip} />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={technicalName || 'Моя база данных'}
                  className="w-full px-4 py-3 rounded-xl border border-glass-border bg-background text-foreground text-sm placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground">{t('create_db:field_display_name_hint')}</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: SQL ── */}
          {step === 'sql' && (
            <div className="p-6 flex flex-col gap-4">

              {/* Mode tabs */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
                  {(['editor', 'file'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSqlMode(mode)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${sqlMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {mode === 'editor'
                        ? <span className="flex items-center gap-1.5"><FileCode2 size={14} />{t('create_db:tab_editor')}</span>
                        : <span className="flex items-center gap-1.5"><Upload size={14} />{t('create_db:tab_file')}</span>}
                    </button>
                  ))}
                </div>
                <InfoTooltip text={sqlScriptTooltip} className="mt-0" />
              </div>

              {/* SQL Editor */}
              {sqlMode === 'editor' && (
                <div className="rounded-xl overflow-hidden border border-glass-border" style={{ height: '280px' }}>
                  <CodeMirror
                    value={initSql}
                    height="280px"
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    extensions={[sqlLang()]}
                    onChange={setInitSql}
                    placeholder={"-- Скрипт инициализации (необязательно).\n-- Не включайте CREATE DATABASE — база уже создана.\n\nCREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL\n);\n\nINSERT INTO products (name) VALUES ('Example Item');"}
                  />
                </div>
              )}

              {/* File upload */}
              {sqlMode === 'file' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => !sqlFile && fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : sqlFile ? 'border-green-500/50 bg-green-500/5' : 'border-glass-border hover:border-primary/50 hover:bg-hover'}`}
                >
                  <input ref={fileInputRef} type="file" accept=".sql" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] || null)} />
                  {sqlFile ? (
                    <>
                      <CheckCircle2 size={32} className="text-green-500" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">{sqlFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{(sqlFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSqlFile(null); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        {t('create_db:file_clear')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('create_db:file_drop_hint')}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">.sql файл (pg_dump, ручной скрипт и т.д.)</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Empty SQL note */}
              {!sqlHasContent && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/60 border border-glass-border text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                  {t('create_db:sql_empty_ok', 'Всё в порядке — скрипт необязателен. Будет создана пустая база данных.')}
                </div>
              )}

              {/* Summary of what will be created */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-foreground">{t('create_db:summary_title', 'Будет создано:')}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                  {t('create_db:summary_database', 'База данных')} <span className="font-mono font-bold text-foreground">{technicalName}</span>
                  {displayName && displayName !== technicalName && <span className="text-muted-foreground/60">({displayName})</span>}
                </p>
                {sqlHasContent && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                    {sqlMode === 'file' && sqlFile
                      ? t('create_db:summary_file_executed', 'Выполнен файл: {{name}}', { name: sqlFile.name })
                      : t('create_db:summary_sql_executed', 'Выполнен SQL-скрипт ({{count}} строк)', { count: initSql.trim().split('\n').length })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                  {t('create_db:summary_init_dump', 'Создан неудаляемый начальный снимок (init dump)')}
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Creating ── */}
          {step === 'creating' && (
            <div className="p-8 flex flex-col gap-4">
              {progressSteps.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {s.status === 'running' && <Loader2 size={18} className="animate-spin text-primary" />}
                    {s.status === 'done' && <CheckCircle2 size={18} className="text-green-500" />}
                    {s.status === 'error' && <XCircle size={18} className="text-destructive" />}
                    {s.status === 'skipped' && <div className="w-4 h-px bg-muted-foreground/40 mx-auto" />}
                    {s.status === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />}
                  </div>
                  <span className={`text-sm transition-colors ${
                    s.status === 'running' ? 'text-foreground font-medium' :
                    s.status === 'done' ? 'text-green-500' :
                    s.status === 'error' ? 'text-destructive font-medium' :
                    s.status === 'skipped' ? 'text-muted-foreground/40 line-through' :
                    'text-muted-foreground'
                  }`}>
                    {t(`create_db:${s.labelKey}`)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 'done' && (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <div>
                <p className="text-foreground font-semibold">{t('create_db:step_done_subtitle')}</p>
                <p className="text-muted-foreground text-sm mt-1 font-mono">{createdDbName}</p>
              </div>
            </div>
          )}

          {/* ── STEP 5: Error ── */}
          {step === 'error' && (
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle size={32} className="text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">{t('create_db:step_error_subtitle')}</p>
              </div>
              {errorMessage && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-destructive font-mono whitespace-pre-wrap break-words">{errorMessage}</pre>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {progressSteps.filter(s => s.status !== 'pending').map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    {s.status === 'done' && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                    {(s.status === 'error' || s.status === 'running') && <XCircle size={14} className="text-destructive shrink-0" />}
                    <span className={`text-xs ${s.status === 'done' ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
                      {t(`create_db:${s.labelKey}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-glass-border flex items-center justify-between shrink-0">
          <div>
            {step === 'sql' && (
              <button
                onClick={() => setStep('name')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} /> {t('create_db:btn_back')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 'name' && (
              <button
                onClick={() => setStep('sql')}
                disabled={!technicalName || nameStatus === 'checking' || nameStatus === 'error' || nameStatus === 'idle'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {nameStatus === 'checking' && <Loader2 size={16} className="animate-spin" />}
                {t('create_db:btn_next')} <ChevronRight size={16} />
              </button>
            )}
            {step === 'sql' && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Database size={16} /> {t('create_db:btn_create')}
              </button>
            )}
            {step === 'done' && (
              <>
                <button onClick={handleDoneAndOpen} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Database size={16} /> {t('create_db:btn_open_db')}
                </button>
                <button onClick={handleClose} className="px-4 py-2.5 rounded-xl text-sm border border-glass-border hover:bg-hover transition-colors">
                  {t('create_db:btn_done')}
                </button>
              </>
            )}
            {step === 'error' && (
              <>
                <button
                  onClick={() => { setStep('sql'); setProgressSteps(PROGRESS_STEPS.map(s => ({ ...s, status: 'pending' }))); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t('create_db:btn_retry')}
                </button>
                <button onClick={handleClose} className="px-4 py-2.5 rounded-xl text-sm border border-glass-border hover:bg-hover transition-colors">
                  {t('create_db:btn_close')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
