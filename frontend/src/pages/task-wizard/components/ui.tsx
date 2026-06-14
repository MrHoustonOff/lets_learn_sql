import React from 'react';
import { Info } from 'lucide-react';
import { InfoTooltip as BaseInfoTooltip } from '../../../components/ui/InfoTooltip';

export const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean; hint?: string }> = ({ children, required, hint }) => {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
      {children}
      {required && <span className="text-destructive">*</span>}
      {hint && <span className="text-[11px] text-muted-foreground font-normal">{hint}</span>}
    </label>
  );
};

export const TextInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ value, onChange, placeholder, type = "text" }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-popover border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all placeholder:text-muted-foreground"
    />
  );
};

export const SelectInput: React.FC<{ value: string | null; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }> = ({ value, onChange, options, placeholder }) => {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-popover border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all appearance-none cursor-pointer"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export const SectionCard: React.FC<{ title?: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-5">
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export const InfoTooltip = BaseInfoTooltip;
