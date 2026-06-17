import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useTaskWizard(id: string | undefined, isFromEditTask: boolean) {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false);
  const [showEditExitModal, setShowEditExitModal] = useState(false);

  const [initialDraftDataStr, setInitialDraftDataStr] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreatingRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishState, setPublishState] = useState<'idle' | 'saving' | 'error'>('idle');

  const [isLoaded, setIsLoaded] = useState(id === 'new');

  const [allTags, setAllTags] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allDatabases, setAllDatabases] = useState([]);

  const [draftData, setDraftData] = useState({
    title: "",
    description: "",
    author: "TestUser",
    referenceLink: "",
    tags: [] as string[],
    difficulty: null as number | null,
    database: null as string | null,
    course: null as string | null,
    referenceSql: "",
    orderMatters: false,
    isQueryValid: false,
    rules: [] as any[],
  });

  const [rulesValidationStatus, setRulesValidationStatus] = useState<'idle' | 'checking' | 'checked'>('idle');
  const [rulesValidationResults, setRulesValidationResults] = useState<Record<string, { passed: boolean, detail: string }>>({});

  // Fetch metadata
  useEffect(() => {
    fetch('/api/tasks?page_size=1')
      .then(res => res.json())
      .then(data => {
        setAllTags(data.tags || []);
        setAllCourses(data.courses || []);
        setAllDatabases(data.databases || []);
      })
      .catch(console.error);
  }, []);

  // Fetch task draft
  useEffect(() => {
    if (!id || id === 'new') return;
    if (isCreatingRef.current) return;
    
    fetch(`/api/tasks/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch draft');
        return res.json();
      })
      .then(data => {
        const newDraftData = {
          title: data.title || "",
          description: data.description || "",
          author: data.author_name || "TestUser",
          referenceLink: data.source_url || "",
          difficulty: data.difficulty || null,
          database: data.database_id ? String(data.database_id) : null,
          course: data.courses?.[0]?.id ? String(data.courses[0].id) : null,
          referenceSql: data.reference_sql || "",
          orderMatters: data.order_matters || false,
          tags: data.tags || [],
          isQueryValid: !!data.reference_sql, // assuming if there's sql it's valid
          rules: (data.rules || []).map((r: any) => ({
            id: Math.random().toString(36).slice(2, 10),
            category: r.category,
            condition: r.condition,
            params: r.params || {},
            severity: r.severity || "blocking",
            message: r.message || ""
          }))
        };
        setDraftData(newDraftData);
        setIsLoaded(true);
        if (isFromEditTask) {
          setInitialDraftDataStr(JSON.stringify(newDraftData));
        }
      })
      .catch(e => {
        console.error(e);
        setIsLoaded(true);
      });
  }, [id, isFromEditTask]);

  // Track unsaved changes
  useEffect(() => {
    if (isLoaded && isFromEditTask) {
      if (!initialDraftDataStr) {
        setInitialDraftDataStr(JSON.stringify(draftData));
      } else {
        setHasUnsavedChanges(JSON.stringify(draftData) !== initialDraftDataStr);
      }
    }
  }, [draftData, isLoaded, isFromEditTask, initialDraftDataStr]);

  // Auto-create draft when user starts typing if id === 'new'
  useEffect(() => {
    if (id === 'new') {
      const hasContent = !!draftData.title?.trim() || !!draftData.description?.trim();
      if (hasContent && !isCreatingRef.current) {
        isCreatingRef.current = true;
        fetch('/api/tasks/draft', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            navigate(`/studio/task/${data.id}`, { replace: true, state: location.state });
          })
          .catch(e => {
            console.error('Failed to auto-create draft', e);
            isCreatingRef.current = false;
          });
      }
    }
  }, [id, draftData.title, draftData.description, navigate, location.state]);

  const buildPayload = () => ({
    title: draftData.title || undefined,
    description: draftData.description || undefined,
    author_name: draftData.author || undefined,
    source_url: draftData.referenceLink || undefined,
    difficulty: draftData.difficulty?.toString() || undefined,
    database_id: draftData.database ? parseInt(draftData.database) : undefined,
    reference_sql: draftData.referenceSql || undefined,
    order_matters: draftData.orderMatters,
    tags: draftData.tags,
    rules: draftData.rules || [],
  });

  // Auto-save logic (Debounced)
  useEffect(() => {
    if (!id || id === 'new' || isFromEditTask) return; // Don't auto-save if in Edit mode, wait - Course wizard DOES auto-save in edit mode! Let's follow Course Wizard: wait, course wizard didn't auto save in edit mode? Yes it did: `if (!courseId || !isLoaded || isFromEdit) return;` so it DID NOT auto-save in edit mode. OK.
    
    const handler = setTimeout(() => {
      setIsSaving(true);
      fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      })
      .then(res => {
        if (res.ok) setLastSaved(new Date());
      })
      .finally(() => setIsSaving(false));
    }, 1500);

    return () => clearTimeout(handler);
  }, [draftData, id, isFromEditTask]);

  const handleManualSave = async () => {
    if (!id || id === 'new' || !hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error();
      setLastSaved(new Date());
      setInitialDraftDataStr(JSON.stringify(draftData));
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error(e);
      alert('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const checkRules = async () => {
    if (!id || id === 'new') return;
    setRulesValidationStatus('checking');
    try {
      const res = await fetch(`/api/tasks/${id}/check_rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: draftData.rules || [] }),
      });
      if (!res.ok) throw new Error('Check rules failed');
      const data = await res.json();
      
      const results: Record<string, any> = {};
      data.rules.forEach((r: any) => {
        const frontendRule = (draftData.rules || [])[r.rule_id];
        if (frontendRule) {
          results[frontendRule.id] = { passed: r.passed, detail: r.detail_msg || r.message };
        }
      });
      setRulesValidationResults(results);
      setRulesValidationStatus('checked');
    } catch (e) {
      console.error(e);
      setRulesValidationStatus('idle');
    }
  };

  const publishTask = async () => {
    if (!id || id === 'new') return;
    if (publishState === 'saving') return;
    setPublishState('saving');
    try {
      const res = await fetch(`/api/tasks/${id}/publish`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Publish failed');
      setPublishState('idle');
      setIsPublishedModalOpen(true);
    } catch (e) {
      console.error(e);
      setPublishState('error');
      setTimeout(() => setPublishState('idle'), 3000);
      alert('Ошибка при публикации задачи');
    }
  };

  const { canGoNext, needsCheckRules, footerNextText } = useMemo(() => {
    let canGoNext = false;
    let needsCheckRules = false;
    let footerNextText = 'wizard.footer.next';

    if (currentStep === 1) {
      canGoNext = !!(draftData.title && draftData.description && draftData.author && draftData.difficulty && draftData.database);
    } else if (currentStep === 2) {
      canGoNext = !!draftData.isQueryValid;
    } else if (currentStep === 3) {
      const hasRules = (draftData.rules || []).length > 0;
      const allPassed = hasRules && (draftData.rules || []).every((r: any) => rulesValidationResults[r.id]?.passed === true);
      
      if (hasRules) {
        if (rulesValidationStatus !== 'checked' || !allPassed) {
          canGoNext = rulesValidationStatus !== 'checking'; 
          needsCheckRules = true;
          footerNextText = rulesValidationStatus === 'checking' ? 'wizard.footer.checking' : 'wizard.footer.check';
        } else {
          canGoNext = true;
        }
      } else {
        canGoNext = true;
      }
    } else if (currentStep === 4) {
      canGoNext = true;
      footerNextText = 'wizard.footer.publish';
    }

    return { canGoNext, needsCheckRules, footerNextText };
  }, [currentStep, draftData, rulesValidationStatus, rulesValidationResults]);

  const isEmpty =
    !draftData.title.trim() &&
    !draftData.description.trim() &&
    draftData.rules.length === 0;

  return {
    draftData,
    setDraftData,
    currentStep,
    setCurrentStep,
    isLoaded,
    isSaving,
    lastSaved,
    publishState,
    hasUnsavedChanges,
    showEditExitModal,
    setShowEditExitModal,
    isPublishedModalOpen,
    setIsPublishedModalOpen,
    canGoNext,
    needsCheckRules,
    footerNextText,
    handleManualSave,
    publishTask,
    checkRules,
    isEmpty,
    allTags,
    allCourses,
    allDatabases,
    rulesValidationStatus,
    rulesValidationResults
  };
}
