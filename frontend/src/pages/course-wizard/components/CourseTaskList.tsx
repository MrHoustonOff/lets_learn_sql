import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, X, ListPlus } from 'lucide-react';
import { TaskPickerModal } from './TaskPickerModal';

const DIFF_TIERS = [
  { key: "easy", label: "Легкий", color: "bg-success" },
  { key: "medium", label: "Средний", color: "bg-warning" },
  { key: "hard", label: "Тяжелый", color: "bg-destructive" },
];

function diffMeta(level: number | string | null) {
  if (level === null || level === undefined) return null;
  if (typeof level === 'string') {
    const [tier, lvl] = level.split("-");
    const t = DIFF_TIERS.find(d => d.key === tier);
    return t ? { ...t, level: Number(lvl) } : null;
  }
  
  const numLevel = Number(level);
  const color = numLevel <= 1 ? "bg-success" : numLevel === 2 ? "bg-warning" : "bg-destructive";
  return { level: numLevel, color, label: numLevel <= 1 ? "Легкий" : numLevel === 2 ? "Средний" : "Тяжелый" };
}

export function DiffDots({ id }: { id: any }) {
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

export function CourseTaskList({ tasks, onTasksChange, allSelectedIds, sectionLabel }: any) {
  const { t } = useTranslation();
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
            {t('wizard_course.content.no_tasks_yet')}
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
          {t('wizard_course.content.add_task_to_section', { section: sectionLabel })}
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
