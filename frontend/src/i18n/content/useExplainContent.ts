import { useAppLang } from '../types';
import explainNodesRu from './explain-nodes/ru.json';
import explainNodesEn from './explain-nodes/en.json';
import explainFieldsRu from './explain-fields/ru.json';
import explainFieldsEn from './explain-fields/en.json';

const nodeDictionaries = { 
  ru: explainNodesRu as Record<string, string>, 
  en: explainNodesEn as Record<string, string> 
};

// Types for field dictionary based on Russian baseline
type FieldDictionary = typeof explainFieldsRu;

const fieldDictionaries: Record<string, FieldDictionary> = { 
  ru: explainFieldsRu, 
  en: explainFieldsEn as FieldDictionary
};

export const useExplainNodeDoc = (nodeType: string): string => {
  const lang = useAppLang();
  
  // Provide a safe fallback mechanism
  const dict = nodeDictionaries[lang] || nodeDictionaries.ru;
  const fallbackDict = nodeDictionaries.ru;
  
  return dict[nodeType] ?? fallbackDict[nodeType] ?? fieldDictionaries[lang]?.general.no_description ?? fieldDictionaries.ru.general.no_description;
};

export const useExplainFieldDoc = (fieldName: keyof typeof explainFieldsRu.fields): string => {
  const lang = useAppLang();
  
  const dict = fieldDictionaries[lang] || fieldDictionaries.ru;
  const fallbackDict = fieldDictionaries.ru;
  
  return dict.fields[fieldName] ?? fallbackDict.fields[fieldName] ?? '';
};

export const useExplainFieldsDocRaw = () => {
  const lang = useAppLang();
  
  const dict = fieldDictionaries[lang] || fieldDictionaries.ru;
  const fallbackDict = fieldDictionaries.ru;
  
  // A helper to get the raw object for complex cases
  return {
    get: (fieldName: keyof typeof explainFieldsRu.fields) => dict.fields[fieldName] ?? fallbackDict.fields[fieldName] ?? '',
    general: {
      no_description: dict.general.no_description ?? fallbackDict.general.no_description
    }
  };
};
