import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { MarkdownEditor } from '../../../components/ui/MarkdownEditor';
import { CourseTaskList } from './CourseTaskList';

export function CourseSectionList({ section, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, allSelectedIds, sectionIndex }: any) {
  const { t } = useTranslation();
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
          {t('wizard_course.content.section_title', { index: sectionIndex + 1 })}
        </span>
        <input
          type="text"
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder={t('wizard_course.content.section_name_placeholder')}
          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
        />
        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
          {t('wizard_course.content.task_count', { count: sectionTaskCount })}
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
            <label className="text-[11px] text-muted-foreground mb-1 block">{t('wizard_course.content.section_description')} <span className="text-destructive">*</span></label>
            <MarkdownEditor
              value={section.description || ''}
              onChange={val => onChange({ ...section, description: val })}
              placeholder={t('wizard_course.content.section_desc_placeholder')}
              minHeight={100}
              autoPreviewOnBlur={true}
            />
          </div>

          {/* Main tasks */}
          <CourseTaskList
            tasks={section.tasks || []}
            onTasksChange={(tasks: any) => onChange({ ...section, tasks })}
            allSelectedIds={allSelectedIds}
            sectionLabel={section.title || t('wizard_course.content.section_title', { index: sectionIndex + 1 })}
          />
        </div>
      )}
    </div>
  );
}
