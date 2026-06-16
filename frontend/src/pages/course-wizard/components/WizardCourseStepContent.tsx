import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, ChevronUp, ChevronDown, ListPlus, FolderPlus, Trash2 } from 'lucide-react';
import { TextInput } from '../../../components/ui/TextInput';
import { MarkdownEditor } from '../../../components/ui/MarkdownEditor';
import { TaskPickerModal } from './TaskPickerModal';

const DIFF_TIERS = [
  { key: "easy", label: "Легкий", color: "bg-success" },
  { key: "medium", label: "Средний", color: "bg-warning" },
  { key: "hard", label: "Тяжелый", color: "bg-destructive" },
];

function diffMeta(level: number | string | null) {
  if (level === null || level === undefined) return null;
  // Fallback for strings like "hard-1" if any
  if (typeof level === 'string') {
    const [tier, lvl] = level.split("-");
    const t = DIFF_TIERS.find(d => d.key === tier);
    return t ? { ...t, level: Number(lvl) } : null;
  }
  
  // Handling number levels directly if API provides them
  const numLevel = Number(level);
  const color = numLevel <= 1 ? "bg-success" : numLevel === 2 ? "bg-warning" : "bg-destructive";
  return { level: numLevel, color, label: numLevel <= 1 ? "Легкий" : numLevel === 2 ? "Средний" : "Тяжелый" };
}

function DiffDots({ id }: { id: any }) {
  const m = diffMeta(id);
  if (!m) return null;
  return (
    <span className="flex items-center gap-0.5" title={`${m.label} ${m.level}/3`}>
      {[1,2,3].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= m.level ? m.color : "bg-muted"}`} />
      ))}
    </span>
  );
}

// ----------------------------------------------------------------------
// TASK ITEM
// ----------------------------------------------------------------------
function TaskItem({ task, index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: any) {
  return (
    <li className="list-none flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 group border bg-glass border-transparent hover:border-glass-border/50 hover:bg-glass-hover shadow-[0_2px_16px_-4px_hsl(var(--glow)/0.05)]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-[11px] text-muted-foreground w-5 text-center shrink-0 font-mono">{index + 1}</span>
        <div className="shrink-0 w-6 flex justify-center">
          <DiffDots id={task.difficulty} />
        </div>
        <div className="flex flex-col gap-1 w-[60%] shrink-0 min-w-0">
          <span className="text-xs truncate transition-colors font-medium text-foreground">
            {task.title}
          </span>
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-3 text-micro text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>Теги:</span>
                <div className="flex items-center gap-1">
                  {task.tags.slice(0,3).map((tag: any) => (
                    <span key={tag.id || tag} className="text-xs px-2 py-0.5 rounded-md font-medium truncate inline-flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity" style={{background: "hsl(var(--badge-bg) / var(--badge-bg-opacity))", color: "hsl(var(--badge-fg))"}}>
                      {tag.name || tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && <span className="text-xs px-2 py-0.5 rounded-md font-medium text-muted-foreground">+{task.tags.length - 3}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

// ----------------------------------------------------------------------
// TASK LIST
// ----------------------------------------------------------------------
function TaskList({ tasks, onTasksChange, allSelectedIds, sectionLabel }: any) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const moveTask = (from: number, to: number) => {
    const arr = [...tasks];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onTasksChange(arr);
  };

  const removeTask = (id: number) => onTasksChange(tasks.filter((t: any) => t.id !== id));

  const addTasks = (newTasks: any[]) => {
    onTasksChange([...tasks, ...newTasks]);
    setPickerOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5">
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-[11px] text-muted-foreground border border-dashed border-border rounded-lg">
            Задач пока нет — добавь через кнопку ниже
          </div>
        ) : tasks.map((task: any, i: number) => (
          <TaskItem
            key={task.id}
            task={task}
            index={i}
            isFirst={i === 0}
            isLast={i === tasks.length - 1}
            onMoveUp={() => moveTask(i, i - 1)}
            onMoveDown={() => moveTask(i, i + 1)}
            onRemove={() => removeTask(task.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full mt-1 border border-dashed border-border rounded-lg py-2 flex items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-secondary/30 transition-all text-xs font-medium"
        >
          <ListPlus className="w-3.5 h-3.5" />
          Добавить задачу в «{sectionLabel}»
        </button>
      </div>
      {pickerOpen && (
        <TaskPickerModal
          alreadySelected={allSelectedIds}
          onConfirm={addTasks}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------
// SECTION COMPONENT
// ----------------------------------------------------------------------
function Section({ section, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, allSelectedIds, sectionIndex }: any) {
  const [collapsed, setCollapsed] = useState(false);

  const sectionTaskCount = section.tasks?.length || 0;

  return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-secondary/10 ${collapsed ? "border-b-0" : ""}`}>
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <span className="text-[11px] text-primary font-semibold uppercase tracking-wide shrink-0">
          Раздел {sectionIndex + 1}
        </span>
        <input
          type="text"
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Название раздела..."
          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
        />
        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
          {sectionTaskCount} зад.
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-5 space-y-4">
          {/* Section description */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Описание раздела <span className="text-destructive">*</span></label>
            <MarkdownEditor
              value={section.description || ''}
              onChange={val => onChange({ ...section, description: val })}
              placeholder="Краткое описание раздела (поддерживается Markdown)..."
              minHeight={100}
              autoPreviewOnBlur={true}
            />
          </div>

          {/* Main tasks */}
          <TaskList
            tasks={section.tasks || []}
            onTasksChange={(tasks: any) => onChange({ ...section, tasks })}
            allSelectedIds={allSelectedIds}
            sectionLabel={section.title || `Раздел ${sectionIndex + 1}`}
          />
        </div>
      )}
    </div>
  );
}


// ----------------------------------------------------------------------
// MAIN STEP COMPONENT
// ----------------------------------------------------------------------
export const WizardCourseStepContent: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const { t } = useTranslation();

  const sections = data.sections;

  const setSections = (fn: any) =>
    setData((p: any) => ({ ...p, sections: typeof fn === "function" ? fn(p.sections) : fn }));

  const addSection = () => setSections((s: any[]) => [...s, { id: Math.random().toString(), title: "", description: "", showDesc: false, tasks: [] }]);

  const updateSection = (i: number, val: any) => setSections((s: any[]) => { const a = [...s]; a[i] = val; return a; });
  const removeSection = (i: number) => setSections((s: any[]) => s.filter((_, idx) => idx !== i));
  const moveSection = (from: number, to: number) => setSections((s: any[]) => {
    const a = [...s]; const [it] = a.splice(from, 1); a.splice(to, 0, it); return a;
  });

  const allSelectedIds = useMemo(() => {
    const ids: number[] = [];
    for (const sec of sections) {
      for (const t of (sec.tasks || [])) ids.push(t.id);
    }
    return ids;
  }, [sections]);

  const totalTaskCount = sections.reduce((acc: number, sec: any) => acc + (sec.tasks?.length || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            {t('wizard_course.content.title')}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            {sections.length} {sections.length === 1 ? "раздел" : "разд."} · {totalTaskCount} задач всего
          </p>
        </div>
        <button
          onClick={addSection}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:brightness-110 rounded-lg text-sm font-semibold transition-all active:scale-95"
        >
          <Plus size={16} />
          Новый раздел
        </button>
      </div>

      {sections.length === 0 ? (
        <div
          onClick={addSection}
          className="border-2 border-dashed border-border/80 rounded-xl py-16 flex flex-col items-center gap-2 text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-primary hover:bg-secondary/20 transition-all bg-card/50"
        >
          <FolderPlus className="w-8 h-8 opacity-50" />
          <p className="text-sm font-semibold mt-2">Добавь первый раздел курса</p>
          <p className="text-[11px]">Нажми или кликни сюда</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec: any, i: number) => (
            <Section
              key={sec.id}
              section={sec}
              sectionIndex={i}
              onChange={(val: any) => updateSection(i, val)}
              onRemove={() => removeSection(i)}
              onMoveUp={() => moveSection(i, i - 1)}
              onMoveDown={() => moveSection(i, i + 1)}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              allSelectedIds={allSelectedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};
