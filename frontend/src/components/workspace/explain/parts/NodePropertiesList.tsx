import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NodePropertiesListProps {
  node: any;
}

const IGNORED_KEYS = [
  'Node Type', 'Relation Name', 'Index Name', 'Total Cost',
  'Plan Rows', 'Plan Width', 'Plans', 'node_id',
  'Parent Relationship', 'Startup Cost', 'Alias',
];

export const NodePropertiesList: React.FC<NodePropertiesListProps> = ({ node }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dynamicProps = Object.entries(node).filter(([key, value]) =>
    !IGNORED_KEYS.includes(key) &&
    typeof value !== 'object' &&
    value !== undefined &&
    value !== null
  );

  if (dynamicProps.length === 0) return null;

  const handleCopy = (key: string, value: any) => {
    const nodeType = node['Node Type'];
    navigator.clipboard.writeText(`Операция: ${nodeType}\n${key}: ${String(value)}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="border border-glass-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 px-4 py-2.5 transition-colors w-full text-left"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {t('explain_ui:details_section')} ({dynamicProps.length})
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col text-sm font-mono bg-background/30">
          {dynamicProps.map(([key, value]) => (
            <div
              key={key}
              onClick={() => handleCopy(key, value)}
              className="flex items-start gap-4 px-4 py-2.5 border-t border-glass-border/30 cursor-pointer even:bg-muted/10 group"
              title={t('explain_ui:copy_hint')}
            >
              <span className="text-muted-foreground whitespace-nowrap min-w-[150px] mt-0.5">{key}:</span>
              <span className="text-foreground break-all flex-1">{String(value)}</span>
              <div className="opacity-0 group-hover:opacity-100 text-muted-foreground shrink-0 mt-0.5">
                {copiedKey === key ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
