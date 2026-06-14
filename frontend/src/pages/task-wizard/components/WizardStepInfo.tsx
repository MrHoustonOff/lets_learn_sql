import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Plus, Tag as TagIcon } from 'lucide-react';
import { FieldLabel, TextInput, SelectInput, SectionCard } from './ui';
import { DIFFICULTY_TIERS, DIFFICULTY_LEVELS, MOCK_DATABASES, MOCK_COURSES, MOCK_TAGS } from '../mocks';
import { MarkdownText } from '../../../components/ui/MarkdownText';

// Types
interface WizardStepInfoData {
  title: string;
  description: string;
  author: string;
  referenceLink: string;
  tags: string[];
  difficulty: string | null;
  database: string | null;
  course: string | null;
}

interface WizardStepInfoProps {
  data: WizardStepInfoData;
  setData: React.Dispatch<React.SetStateAction<WizardStepInfoData>>;
}

const DifficultyPicker: React.FC<{ value: string | null; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <div className="space-y-3">
      {DIFFICULTY_TIERS.map((tier) => (
        <div key={tier.key} className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${tier.color}`} />
            {tier.label}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((level) => {
              const id = `${tier.key}-${level}`;
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
                  title={`${tier.label} ${level}/3`}
                >
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i <= level
                          ? active
                            ? "bg-primary-foreground"
                            : tier.color
                          : active
                          ? "bg-primary-foreground/30"
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

const TagSelector: React.FC<{ selected: string[]; onToggle: (tag: string) => void; onCreate: (tag: string) => void }> = ({ selected, onToggle, onCreate }) => {
  const [newTag, setNewTag] = useState("");
  const allTags = useMemo(() => {
    const extra = selected.filter((t) => !MOCK_TAGS.includes(t));
    return [...MOCK_TAGS, ...extra];
  }, [selected]);

  const handleCreate = () => {
    const tag = newTag.trim();
    if (!tag) return;
    onCreate(tag);
    setNewTag("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {allTags.map((tag) => {
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
          placeholder="Новый тег..."
          className="flex-1 bg-popover border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-foreground transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Добавить
        </button>
      </div>
    </div>
  );
};

const MarkdownEditor: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <div className="border border-border rounded-lg bg-popover overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary transition-all flex flex-col">
      <div className="flex items-center border-b border-border bg-secondary/40 px-2">
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
      <div className="min-h-[160px]">
        {tab === 'write' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[160px] p-3 text-sm leading-relaxed bg-transparent resize-y focus:outline-none placeholder:text-muted-foreground custom-scrollbar"
          />
        ) : (
          <div className="p-3 min-h-[160px] prose dark:prose-invert max-w-none text-sm">
            {value ? <MarkdownText content={value} /> : <span className="text-muted-foreground">Nothing to preview</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export const WizardStepInfo: React.FC<WizardStepInfoProps> = ({ data, setData }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
      <div className="lg:col-span-2 space-y-5">
        <SectionCard title="Основное">
          <div className="space-y-4">
            <div>
              <FieldLabel required>Название задачи</FieldLabel>
              <TextInput
                value={data.title}
                onChange={(v) => setData((p) => ({ ...p, title: v }))}
                placeholder="Например: Топ-10 заказов клиентов из Германии по сумме"
              />
            </div>

            <div>
              <FieldLabel required hint="условие, которое видит решающий">
                Описание задачи (Markdown)
              </FieldLabel>
              <MarkdownEditor
                value={data.description}
                onChange={(v) => setData((p) => ({ ...p, description: v }))}
                placeholder="Опиши условие задачи. Можно использовать **жирный шрифт**, `инлайн код` и т.д."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Автор</FieldLabel>
                <TextInput
                  value={data.author}
                  onChange={(v) => setData((p) => ({ ...p, author: v }))}
                  placeholder="Имя автора задачи"
                />
              </div>
              <div>
                <FieldLabel hint="опционально">Ссылка</FieldLabel>
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

        <SectionCard title="Теги" description="Опционально — для фильтрации задач">
          <TagSelector
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
        <SectionCard title="Сложность" description="9 уровней — выбери один">
          <DifficultyPicker
            value={data.difficulty}
            onChange={(v) => setData((p) => ({ ...p, difficulty: v }))}
          />
        </SectionCard>

        <SectionCard title="Привязка">
          <div className="space-y-4">
            <div>
              <FieldLabel required>База данных</FieldLabel>
              <SelectInput
                value={data.database}
                onChange={(v) => setData((p) => ({ ...p, database: v }))}
                placeholder="Выбери базу данных"
                options={MOCK_DATABASES.map((d) => ({ value: d.id, label: d.label }))}
              />
            </div>
            <div>
              <FieldLabel hint="опционально">Курс</FieldLabel>
              <SelectInput
                value={data.course}
                onChange={(v) => setData((p) => ({ ...p, course: v }))}
                placeholder="Без привязки к курсу"
                options={MOCK_COURSES.map((c) => ({ value: c.id, label: c.label }))}
              />
            </div>
          </div>
        </SectionCard>

        <button
          type="button"
          onClick={() => alert('Импорт из JSON в разработке')}
          className="w-full border border-dashed border-border rounded-xl py-4 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-secondary/40 transition-all"
        >
          <Upload className="w-4 h-4" />
          <span className="text-xs font-medium">Импортировать из JSON</span>
        </button>
      </div>
    </div>
  );
};
