import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { MarkdownText } from '../../../components/ui/MarkdownText';

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

function DiffDots({ id }: { id: string | number }) {
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

export const WizardCourseStepPreview: React.FC<{ data: any }> = ({ data }) => {
  const { t } = useTranslation();

  const totalTasks = data.sections.reduce((acc: number, sec: any) => acc + (sec.tasks?.length || 0), 0);
  const sectionCount = data.sections.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{t('wizard_course.preview.ready_title')}</h2>
        <p className="text-muted-foreground">{t('wizard_course.preview.ready_desc')}</p>
      </div>

      <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.15)] space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-background/5 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">
              {data.title || <span className="text-muted-foreground italic">{t('wizard_course.preview.untitled')}</span>}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {data.authors.filter((a: any) => a.name).map((a: any, i: number) => (
                <span key={i} className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {a.link ? (
                    <a href={a.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{a.name}</a>
                  ) : a.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 text-center shrink-0">
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.2)]">
              <div className="text-xl font-bold text-primary">{totalTasks}</div>
              <div className="text-[10px] text-primary/70 font-medium uppercase tracking-wider mt-0.5">{t('wizard_course.preview.tasks_label')}</div>
            </div>
            <div className="bg-secondary/50 border border-glass-border rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <div className="text-xl font-bold">{sectionCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{t('wizard_course.preview.sections_label')}</div>
            </div>
          </div>
        </div>

        {data.description && (
          <div className="pt-4 border-t border-glass-border/60 relative">
            <MarkdownText text={data.description} className="text-sm" />
          </div>
        )}
      </div>

      {data.sections.length > 0 && (
        <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="relative text-sm font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {t('wizard_course.content.title')}
          </h2>
          <div className="space-y-4">
            {data.sections.map((sec: any, si: number) => {
              const secTotal = sec.tasks?.length || 0;
              return (
                <div key={sec.id} className="relative group">
                  <div className="flex items-baseline gap-3 py-2 border-b border-glass-border/40 group-hover:border-primary/20 transition-colors">
                    <span className="text-xs font-mono text-primary shrink-0 w-5">{si + 1}.</span>
                    <span className="flex-1 text-sm font-bold">{sec.title || <span className="text-muted-foreground italic">{t('wizard_course.preview.untitled')}</span>}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{t('wizard_course.content.task_count', { count: secTotal })}</span>
                  </div>

                  {sec.description && (
                    <div className="ml-8 mt-2 mb-3 text-muted-foreground opacity-90">
                      <MarkdownText text={sec.description} className="text-sm" />
                    </div>
                  )}

                  {sec.tasks?.length > 0 && (
                    <div className="ml-8 mt-1.5 space-y-1">
                      {sec.tasks.map((t: any, ti: number) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs text-foreground/70">
                          <span className="font-mono text-muted-foreground/60 w-4 text-right">{si + 1}.{ti + 1}</span>
                          <DiffDots id={t.difficulty} />
                          <span className="truncate group-hover/task:text-foreground transition-colors">{t.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
        <h3 className="relative text-sm font-bold mb-3">{t('wizard_course.preview.readiness_title')}</h3>
        <div className="relative space-y-2">
          {[
            { label: t('wizard_course.preview.req_title'), ok: !!data.title.trim() },
            { label: t('wizard_course.preview.req_author'), ok: data.authors.some((a: any) => a.name.trim()) },
            { label: t('wizard_course.preview.req_section'), ok: data.sections.length > 0 },
            { label: t('wizard_course.preview.req_tasks'), ok: totalTasks > 0 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              {item.ok
                ? <CheckCircle2 className="w-4 h-4 text-success" />
                : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
