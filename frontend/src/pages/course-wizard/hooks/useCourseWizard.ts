import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function buildPayload(courseData: any, status: 'draft' | 'published') {
  return {
    title: courseData.title,
    description: courseData.description,
    status,
    authors: courseData.authors
      .filter((a: any) => a.name.trim())
      .map((a: any) => ({ name: a.name.trim(), link: a.link?.trim() || '' })),
    sections: courseData.sections.map((sec: any) => ({
      title: sec.title,
      description: sec.description || '',
      task_ids: sec.tasks.map((t: any) => t.id),
    })),
  };
}

export function useCourseWizard(id: string | undefined, isFromEdit: boolean) {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false);
  
  const [initialCourseDataStr, setInitialCourseDataStr] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEditExitModal, setShowEditExitModal] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(
    id && id !== 'new' && /^\d+$/.test(id) ? Number(id) : null,
  );

  const isCreatingRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishState, setPublishState] = useState<'idle' | 'saving' | 'error'>('idle');

  const [isLoaded, setIsLoaded] = useState(id === 'new');

  const [duplicateTitleCount, setDuplicateTitleCount] = useState(0);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    authors: [{ id: '1', name: '', link: '' }],
    sections: [] as any[],
  });

  // Load existing draft
  useEffect(() => {
    if (id === 'new' || !id) return;
    
    fetch(`/api/courses/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch course');
        return r.json();
      })
      .then(data => {
        const authors = data.authors?.length > 0 
          ? data.authors.map((a: any, i: number) => ({ id: String(i + 1), name: a.name, link: a.link || '' }))
          : [{ id: '1', name: data.author_name || '', link: data.author_url || '' }];
          
        const newCourseData = {
          title: data.title || '',
          description: data.description || '',
          authors,
          sections: data.sections ? data.sections.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            tasks: s.tasks || []
          })) : []
        };
        
        setCourseData(newCourseData);
        setIsLoaded(true);
        if (isFromEdit) {
          setInitialCourseDataStr(JSON.stringify(newCourseData));
        }
      })
      .catch(e => {
        console.error(e);
        setIsLoaded(true);
      });
  }, [id, isFromEdit]);

  // Track unsaved changes
  useEffect(() => {
    if (isLoaded && isFromEdit) {
      if (!initialCourseDataStr) {
        setInitialCourseDataStr(JSON.stringify(courseData));
      } else {
        setHasUnsavedChanges(JSON.stringify(courseData) !== initialCourseDataStr);
      }
    }
  }, [courseData, isLoaded, isFromEdit, initialCourseDataStr]);

  // Duplicate check (Debounced)
  useEffect(() => {
    if (!courseData.title) {
      setDuplicateTitleCount(0);
      setIsDuplicate(false);
      return;
    }
    
    setIsCheckingDuplicate(true);
    const handler = setTimeout(() => {
      fetch('/api/courses/check_duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseData.title,
          description: courseData.description,
          exclude_id: id !== 'new' && courseId ? courseId : undefined
        })
      })
      .then(res => res.json())
      .then(data => {
        setDuplicateTitleCount(data.title_matches);
        setIsDuplicate(data.is_exact_duplicate);
      })
      .catch(console.error)
      .finally(() => setIsCheckingDuplicate(false));
    }, 800);

    return () => clearTimeout(handler);
  }, [courseData.title, courseData.description, id, courseId]);

  // Step 1: Auto-create draft
  useEffect(() => {
    if (id !== 'new') return; 
    const hasContent = !!courseData.title?.trim() && !!courseData.description?.trim();
    if (!hasContent || isCreatingRef.current) return;

    isCreatingRef.current = true;

    const authors = courseData.authors
      .filter((a) => a.name.trim())
      .map((a) => ({ name: a.name.trim(), link: a.link?.trim() || '' }));

    fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: courseData.title || 'Без названия',
        description: courseData.description || '',
        status: 'draft',
        authors,
        sections: [],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCourseId(data.id);
        navigate(`/studio/course/${data.id}`, { replace: true, state: location.state });
      })
      .catch((e) => {
        console.error('Failed to auto-create course draft', e);
        isCreatingRef.current = false;
      });
  }, [id, courseData.title, courseData.description]); // eslint-disable-line

  // Step 2: Debounced auto-save
  useEffect(() => {
    if (!courseId || !isLoaded || isFromEdit) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(courseData, 'draft')),
      })
        .then((res) => {
          if (res.ok) setLastSaved(new Date());
        })
        .catch(() => {})
        .finally(() => setIsSaving(false));
    }, 1500);

    return () => clearTimeout(timer);
  }, [courseData, courseId, isLoaded, isFromEdit]);

  const { canGoNext, nextLabel } = useMemo(() => {
    let canGoNext = false;
    let nextLabel = 'wizard.footer.next';

    if (currentStep === 1) {
      const hasContent = !!courseData.title?.trim() && !!courseData.description?.trim();
      const hasAuthor = courseData.authors.some(a => a.name.trim());
      canGoNext = hasContent && hasAuthor && !isDuplicate && !isCheckingDuplicate;
    } else if (currentStep === 2) {
      const hasSections = courseData.sections.length > 0;
      const allSectionsValid = courseData.sections.every(
        (sec) =>
          sec.title?.trim().length > 0 &&
          sec.description?.trim().length > 0 &&
          sec.tasks?.length > 0,
      );
      canGoNext = hasSections && allSectionsValid;
    } else if (currentStep === 3) {
      canGoNext = true;
    }
    return { canGoNext, nextLabel };
  }, [currentStep, courseData, isDuplicate, isCheckingDuplicate]);

  const handleNext = useCallback(async () => {
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
      return;
    }
    if (publishState === 'saving') return;

    setPublishState('saving');
    try {
      const payload = buildPayload(courseData, 'published');
      const url = courseId ? `/api/courses/${courseId}` : '/api/courses';
      const method = courseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCourseId(data.id);
      setPublishState('idle');
      setIsPublishedModalOpen(true);
    } catch {
      setPublishState('error');
      setTimeout(() => setPublishState('idle'), 3000);
    }
  }, [currentStep, courseData, publishState, courseId]);

  const handleManualSave = async () => {
    if (!courseId || !hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(courseData, 'published')),
      });
      if (!res.ok) throw new Error();
      setLastSaved(new Date());
      setInitialCourseDataStr(JSON.stringify(courseData));
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error(e);
      alert('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const isEmpty =
    !courseData.title.trim() &&
    !courseData.description.trim() &&
    courseData.sections.length === 0;

  return {
    courseData,
    setCourseData,
    currentStep,
    setCurrentStep,
    isLoaded,
    courseId,
    isSaving,
    lastSaved,
    publishState,
    hasUnsavedChanges,
    showEditExitModal,
    setShowEditExitModal,
    isPublishedModalOpen,
    setIsPublishedModalOpen,
    canGoNext,
    handleNext,
    handleManualSave,
    isEmpty,
    isDuplicate,
    duplicateTitleCount,
    isCheckingDuplicate,
  };
}
