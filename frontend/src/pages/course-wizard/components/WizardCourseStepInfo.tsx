import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { TextInput } from '../../../components/ui/TextInput';
import { MarkdownEditor } from '../../../components/ui/MarkdownEditor';

interface AuthorRowProps {
  author: any;
  onChange: (val: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function AuthorRow({ author, onChange, onRemove, canRemove }: AuthorRowProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <TextInput
          value={author.name}
          onChange={v => onChange({ ...author, name: v })}
          placeholder={t('wizard_course.info.author_name_placeholder')}
        />
        <TextInput
          value={author.link}
          onChange={v => onChange({ ...author, link: v })}
          placeholder={t('wizard_course.info.author_link_placeholder')}
          type="url"
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export const WizardCourseStepInfo: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const { t } = useTranslation();

  const updateAuthor = (i: number, val: any) => {
    const authors = [...data.authors];
    authors[i] = val;
    setData((p: any) => ({ ...p, authors }));
  };

  const addAuthor = () => {
    setData((p: any) => ({ ...p, authors: [...p.authors, { id: Math.random().toString(), name: "", link: "" }] }));
  };

  const removeAuthor = (i: number) => {
    setData((p: any) => ({ ...p, authors: p.authors.filter((_: any, idx: number) => idx !== i) }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title & Description */}
      <section className="bg-card border border-border/60 rounded-xl p-5">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              {t('wizard_course.info.title')} <span className="text-destructive">*</span>
            </label>
            <TextInput 
              value={data.title}
              onChange={(val) => setData((p: any) => ({ ...p, title: val }))}
              placeholder={t('wizard_course.info.title_placeholder')}
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              {t('wizard_course.info.description')} <span className="text-destructive">*</span>
              <span className="text-[11px] text-muted-foreground font-normal">поддерживает Markdown</span>
            </label>
            <MarkdownEditor
              value={data.description}
              onChange={(val) => setData((p: any) => ({ ...p, description: val }))}
              placeholder={t('wizard_course.info.description_placeholder')}
              minHeight={260}
            />
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="bg-card border border-border/60 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">{t('wizard_course.info.author')} <span className="text-destructive">*</span></h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Один или несколько — ссылка необязательна</p>
          </div>
          <button
            type="button"
            onClick={addAuthor}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-foreground transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить автора
          </button>
        </div>
        <div className="space-y-2.5">
          {data.authors.map((a: any, i: number) => (
            <AuthorRow
              key={a.id}
              author={a}
              onChange={val => updateAuthor(i, val)}
              onRemove={() => removeAuthor(i)}
              canRemove={data.authors.length > 1}
            />
          ))}
        </div>
      </section>

    </div>
  );
};
