import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FolderPlus } from 'lucide-react';
import { CourseSectionList } from './CourseSectionList';

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
            {t('wizard_course.content.section_count', { count: sections.length })} · {t('wizard_course.content.task_count', { count: totalTaskCount })}
          </p>
        </div>
        <button
          onClick={addSection}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:brightness-110 rounded-lg text-sm font-semibold transition-all active:scale-95"
        >
          <Plus size={16} />
          {t('wizard_course.content.new_section')}
        </button>
      </div>

      {sections.length === 0 ? (
        <div
          onClick={addSection}
          className="border-2 border-dashed border-border/80 rounded-xl py-16 flex flex-col items-center gap-2 text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-primary hover:bg-secondary/20 transition-all bg-card/50"
        >
          <FolderPlus className="w-8 h-8 opacity-50" />
          <p className="text-sm font-semibold mt-2">{t('wizard_course.content.add_first_section')}</p>
          <p className="text-[11px]">{t('wizard_course.content.click_here')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec: any, i: number) => (
            <CourseSectionList
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
