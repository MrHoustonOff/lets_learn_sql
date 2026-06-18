import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Plus, Tag as TagIcon, Bold, Italic, Strikethrough, Underline, Code2, Trash2, GripVertical } from 'lucide-react';
import { FieldLabel } from '../../../components/ui/FieldLabel';
import { TextInput } from '../../../components/ui/TextInput';
import { SelectInput } from '../../../components/ui/SelectInput';
import { SectionCard } from '../../../components/ui/SectionCard';
import { DIFFICULTY_TIERS, DIFFICULTY_LEVELS } from '../mocks';
import { MarkdownEditor } from '../../../components/ui/MarkdownEditor';

// Types
export interface TagOut { id: number; name: string; }
export interface CourseOut { id: number; title: string; }
export interface DatabaseOut { id: number; display_name: string; technical_name: string; }

interface WizardStepInfoData {
  title: string;
  description: string;
  author: string;
  referenceLink: string;
  tags: string[];
  difficulty: number | null;
  database: string | null;
  course: string | null;
}

interface WizardStepInfoProps {
  data: WizardStepInfoData;
  setData: React.Dispatch<React.SetStateAction<WizardStepInfoData>>;
  allTags: TagOut[];
  allCourses: CourseOut[];
  allDatabases: DatabaseOut[];
  isDuplicate?: boolean;
  duplicateTitleCount?: number;
  isCheckingDuplicate?: boolean;
}

const DifficultyPicker: React.FC<{ value: number | null; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {DIFFICULTY_TIERS.map((tier, tierIdx) => (
        <div key={tier.key} className="space-y-1.5">
          <div className="flex items-center gap-2 text-mini font-medium uppercase tracking-wide text-muted-foreground ml-1">
            <span className={`w-1.5 h-1.5 rounded-full ${tier.color}`} />
            {t(`wizard.info.difficulty_tiers.${tier.key}`)}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((level) => {
              const id = tierIdx * 3 + level;
              const active = value === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(id)}
                  className={`flex-1 h-11 rounded-lg border flex items-center justify-center gap-1 transition-all duration-150 ${
                    active
                      ? `border-transparent ${tier.color} shadow-sm`
                      : "border-border bg-popover hover:border-foreground/20 hover:bg-secondary"
                  }`}
                  title={`${t(`wizard.info.difficulty_tiers.${tier.key}`)} ${level}/3`}
                >
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i <= level
                          ? active
                            ? "bg-white"
                            : tier.color
                          : active
                          ? "bg-white/30"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const TagSelector: React.FC<{ selected: string[]; onToggle: (tag: string) => void; onCreate: (tag: string) => void; availableTags: string[] }> = ({ selected, onToggle, onCreate, availableTags }) => {
  const { t } = useTranslation();
  const [newTag, setNewTag] = useState("");
  const mergedTags = useMemo(() => {
    const extra = selected.filter((t) => !availableTags.includes(t));
    return [...availableTags, ...extra];
  }, [selected, availableTags]);

  const handleCreate = () => {
    const tag = newTag.trim();
    if (!tag) return;
    onCreate(tag);
    setNewTag("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {mergedTags.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 border ${
                active
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : "bg-popover border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-secondary"
              }`}
            >
              <TagIcon className="w-3 h-3" />
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          placeholder={t('wizard.info.new_tag_placeholder')}
          className="flex-1 bg-popover border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-foreground transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          {t('wizard.info.add_tag')}
        </button>
      </div>
    </div>
  );
};



export const WizardStepInfo: React.FC<WizardStepInfoProps> = ({ 
  data, setData, allTags, allCourses, allDatabases, isDuplicate, duplicateTitleCount = 0, isCheckingDuplicate 
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
      <div className="lg:col-span-2 space-y-5">
        
        {isDuplicate && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-3">
            <div className="p-1 bg-destructive/20 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <p className="font-semibold mb-1">{t('wizard.info.duplicate_title')}</p>
              <p className="opacity-90">{t('wizard.info.duplicate_desc')}</p>
            </div>
          </div>
        )}

        <SectionCard title={t('wizard.info.main')}>
          <div className="space-y-4">
            <div>
              <FieldLabel required>
                <div className="flex items-center gap-2">
                  {t('wizard.info.title')}
                  {isCheckingDuplicate && <span className="text-xs text-muted-foreground animate-pulse">({t('wizard.info.duplicate_checking')})</span>}
                </div>
              </FieldLabel>
              <TextInput
                value={data.title}
                onChange={(v) => setData((p) => ({ ...p, title: v }))}
                placeholder={t('wizard.info.title_placeholder')}
                multiline
              />
              {duplicateTitleCount > 0 && !isCheckingDuplicate && (
                <p className="text-xs text-warning-text mt-1.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {t('wizard.info.duplicate_title_count', { count: duplicateTitleCount })}
                </p>
              )}
            </div>

            <div>
              <FieldLabel required hint={t('wizard.info.description_hint')}>
                {t('wizard.info.description')}
              </FieldLabel>
              <MarkdownEditor
                value={data.description}
                onChange={(v) => setData((p) => ({ ...p, description: v }))}
                placeholder={t('wizard.info.description_placeholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>{t('wizard.info.author')}</FieldLabel>
                <TextInput
                  value={data.author}
                  onChange={(v) => setData((p) => ({ ...p, author: v }))}
                  placeholder={t('wizard.info.author_placeholder')}
                />
              </div>
              <div>
                <FieldLabel hint={t('wizard.info.optional')}>{t('wizard.info.reference_link')}</FieldLabel>
                <TextInput
                  value={data.referenceLink}
                  onChange={(v) => setData((p) => ({ ...p, referenceLink: v }))}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('wizard.info.tags')} description={t('wizard.info.tags_desc')}>
          <TagSelector
            availableTags={allTags.map(t => t.name)}
            selected={data.tags}
            onToggle={(tag) =>
              setData((p) => ({
                ...p,
                tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag],
              }))
            }
            onCreate={(tag) =>
              setData((p) => (p.tags.includes(tag) ? p : { ...p, tags: [...p.tags, tag] }))
            }
          />
        </SectionCard>
      </div>

      <div className="space-y-5">
        <SectionCard title={t('wizard.info.difficulty')} description={t('wizard.info.difficulty_desc')}>
          <DifficultyPicker
            value={data.difficulty}
            onChange={(v) => setData((p) => ({ ...p, difficulty: v }))}
          />
        </SectionCard>

        <SectionCard title={t('wizard.info.bindings')}>
          <div className="space-y-4">
            <div>
              <FieldLabel required>{t('wizard.info.database')}</FieldLabel>
              <SelectInput
                value={data.database || ''}
                onChange={(v) => setData((p) => ({ ...p, database: v }))}
                placeholder={t('wizard.info.database_placeholder')}
                options={allDatabases.map(db => ({ value: db.id.toString(), label: db.display_name }))}
              />
            </div>
            <div>
              <FieldLabel hint={t('wizard.info.optional')}>{t('wizard.info.course')}</FieldLabel>
              <SelectInput
                value={data.course || ''}
                onChange={(v) => setData((p) => ({ ...p, course: v }))}
                placeholder={t('wizard.info.course_placeholder')}
                options={allCourses.map(c => ({ value: c.id.toString(), label: c.title }))}
              />
            </div>
          </div>
        </SectionCard>

        <button
          type="button"
          onClick={() => alert(t('wizard.info.import_json_alert'))}
          className="w-full border border-dashed border-border rounded-xl py-4 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-secondary/40 transition-all"
        >
          <Upload className="w-4 h-4" />
          <span className="text-xs font-medium">{t('wizard.info.import_json')}</span>
        </button>
      </div>
    </div>
  );
};
