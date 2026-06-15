import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Plus, Tag as TagIcon, Bold, Italic, Strikethrough, Underline, Code2 } from 'lucide-react';
import { FieldLabel, TextInput, SelectInput, SectionCard } from './ui';
import { DIFFICULTY_TIERS, DIFFICULTY_LEVELS } from '../mocks';
import { MarkdownText } from '../../../components/ui/MarkdownText';

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
}

const DifficultyPicker: React.FC<{ value: number | null; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {DIFFICULTY_TIERS.map((tier, tierIdx) => (
        <div key={tier.key} className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground ml-1">
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

const MarkdownEditor: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const insertText = (prefix: string, suffix: string) => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + (selected || 'текст') + suffix + text.substring(end);
    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'текст').length);
    }, 0);
  };

  return (
    <div className="border border-border rounded-lg bg-popover overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary transition-all flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-2">
        <div className="flex items-center">
          <button 
            onClick={() => setTab('write')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${tab === 'write' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Write
          </button>
          <button 
            onClick={() => setTab('preview')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${tab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Preview
          </button>
        </div>
        {tab === 'write' && (
          <div className="flex flex-wrap items-center gap-0.5 pr-2 py-1">
            <button onClick={() => insertText('**', '**')} title="Жирный" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertText('*', '*')} title="Курсив" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertText('~~', '~~')} title="Зачеркнутый" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"><Strikethrough className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertText('<u>', '</u>')} title="Подчеркнутый" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"><Underline className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      <div className="min-h-[160px]">
        {tab === 'write' ? (
          <textarea
            id="markdown-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[160px] p-3 text-sm leading-relaxed bg-transparent resize-y focus:outline-none placeholder:text-muted-foreground custom-scrollbar"
          />
        ) : (
          <div className="p-3 min-h-[160px] prose dark:prose-invert max-w-none text-sm">
            {value ? <MarkdownText text={value} /> : <span className="text-muted-foreground italic">Ничего не написано...</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export const WizardStepInfo: React.FC<WizardStepInfoProps> = ({ data, setData, allTags, allCourses, allDatabases }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
      <div className="lg:col-span-2 space-y-5">
        <SectionCard title={t('wizard.info.main')}>
          <div className="space-y-4">
            <div>
              <FieldLabel required>{t('wizard.info.title')}</FieldLabel>
              <TextInput
                value={data.title}
                onChange={(v) => setData((p) => ({ ...p, title: v }))}
                placeholder={t('wizard.info.title_placeholder')}
              />
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
