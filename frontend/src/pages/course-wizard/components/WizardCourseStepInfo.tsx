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

export const WizardCourseStepInfo: React.FC<{ 
  data: any; 
  setData: any;
  isDuplicate?: boolean;
  duplicateTitleCount?: number;
  isCheckingDuplicate?: boolean;
}> = ({ data, setData, isDuplicate, duplicateTitleCount = 0, isCheckingDuplicate }) => {
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
      
      {isDuplicate && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-3">
          <div className="p-1 bg-destructive/20 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <p className="font-semibold mb-1">{t('wizard_course.info.duplicate_title')}</p>
            <p className="opacity-90">{t('wizard_course.info.duplicate_desc')}</p>
          </div>
        </div>
      )}

      {/* Title & Description */}
      <section className="bg-card border border-border/60 rounded-xl p-5">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              {t('wizard_course.info.title')} <span className="text-destructive">*</span>
              {isCheckingDuplicate && <span className="text-xs text-muted-foreground animate-pulse">({t('wizard.info.duplicate_checking')})</span>}
            </label>
            <TextInput 
              value={data.title}
              onChange={(val) => setData((p: any) => ({ ...p, title: val }))}
              placeholder={t('wizard_course.info.title_placeholder')}
            />
            {duplicateTitleCount > 0 && !isCheckingDuplicate && (
              <p className="text-xs text-warning-text mt-1.5 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {t('wizard_course.info.duplicate_title_count', { count: duplicateTitleCount })}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              {t('wizard_course.info.description')} <span className="text-destructive">*</span>
              <span className="text-[11px] text-muted-foreground font-normal">{t('wizard_course.info.supports_markdown')}</span>
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
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('wizard_course.info.author_hint')}</p>
          </div>
          <button
            type="button"
            onClick={addAuthor}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-foreground transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('wizard_course.info.add_author')}
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
