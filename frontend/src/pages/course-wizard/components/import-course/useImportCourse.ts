import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface CourseTaskResult {
  taskData: any;
  status: 'success' | 'existing' | 'missing_db' | 'zero_rows' | 'failed';
  taskId: number | null; // The draft id or the existing task id
  dbName: string;
  errorMessage?: string;
  sqlResult?: any;
}

export const useImportCourse = (isOpen: boolean, onClose: () => void, onImportFinished: () => void) => {
  const { t } = useTranslation();
  
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'success'>('upload');
  const [allDatabases, setAllDatabases] = useState<any[]>([]);
  
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [parsedCourse, setParsedCourse] = useState<any | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  
  const [processingTotal, setProcessingTotal] = useState(0);
  const [processingCurrent, setProcessingCurrent] = useState(0);
  const [processedResults, setProcessedResults] = useState<CourseTaskResult[]>([]);
  
  const [isPublishing, setIsPublishing] = useState(false);
  
  useEffect(() => {
    if (!isOpen) return;
    
    setStep('upload');
    setDragActive(false);
    setUploadError(null);
    setParsedCourse(null);
    setCourseTitle('');
    setCourseDesc('');
    setProcessingTotal(0);
    setProcessingCurrent(0);
    setProcessedResults([]);
    setIsPublishing(false);
    
    fetch('/api/tasks?page_size=1')
      .then(res => res.json())
      .then(data => {
        setAllDatabases(data.databases || []);
      })
      .catch(console.error);
  }, [isOpen]);

  const handleCancel = async () => {
    // Clean up drafts
    processedResults.forEach(r => {
      if (r.status === 'success' || r.status === 'zero_rows' || r.status === 'failed') {
        if (r.taskId) {
          fetch(`/api/tasks/${r.taskId}`, { method: 'DELETE' }).catch(console.error);
        }
      }
    });
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    setUploadError(null);
    try {
      const file = fileList[0];
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (err: any) {
        throw new Error(t('import_courses.parsing_error', { error: err.message }));
      }

      if (!parsed || parsed.schema_version !== 1 || !parsed.course || !parsed.course.title) {
        throw new Error(t('import_courses.errors.invalid_schema'));
      }

      const courseObj = parsed.course;
      setParsedCourse(courseObj);
      setCourseTitle(courseObj.title || '');
      setCourseDesc(courseObj.description || '');

      // Flatten tasks from sections
      const flatTasks: { task: any, sectionIndex: number }[] = [];
      if (Array.isArray(courseObj.sections)) {
        courseObj.sections.forEach((sec: any, sIdx: number) => {
          if (Array.isArray(sec.tasks)) {
            sec.tasks.forEach((tData: any) => {
              flatTasks.push({ task: tData, sectionIndex: sIdx });
            });
          }
        });
      }

      if (flatTasks.length === 0) {
        throw new Error(t('import_courses.errors.no_tasks'));
      }

      startProcessing(flatTasks);
    } catch (err: any) {
      setUploadError(err.message || "Unknown error");
    }
  };

  const startProcessing = async (flatTasks: { task: any, sectionIndex: number }[]) => {
    setStep('processing');
    setProcessingTotal(flatTasks.length);
    setProcessingCurrent(0);

    try {
      const payload = {
        tasks: flatTasks.map(f => f.task)
      };

      const res = await fetch('/api/tasks/validate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Bulk validation failed");
      }

      const data = await res.json();
      setProcessedResults(data.results);
      setProcessingCurrent(flatTasks.length);
      setStep('review');

    } catch (err: any) {
      setUploadError(err.message || "Unknown error during validation");
      setStep('upload');
    }
  };

  const publishCourse = async () => {
    if (!parsedCourse) return;
    setIsPublishing(true);

    try {
      // 0. Check duplicate course name
      const dupRes = await fetch('/api/courses/check_duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, description: courseDesc, exclude_id: "" })
      });
      if (dupRes.ok) {
        const dupData = await dupRes.json();
        if (dupData.title_matches > 0) {
          throw new Error(t('import_courses.errors.duplicate_course'));
        }
      }

      // 1. Publish all successful drafts
      const publishedTaskIds = new Map<number, number>(); 
      
      for (const r of processedResults) {
        if (r.status === 'success' && r.taskId) {
          const pubRes = await fetch(`/api/tasks/${r.taskId}/publish`, { method: 'POST' });
          if (!pubRes.ok) throw new Error("Failed to publish task " + r.taskData.title);
          const pubData = await pubRes.json();
          publishedTaskIds.set(r.taskId, pubData.id);
        }
      }

      // 2. Map tasks to sections
      const sections = (parsedCourse.sections || []).map((sec: any) => {
        const taskIds: number[] = [];
        if (Array.isArray(sec.tasks)) {
          sec.tasks.forEach((tData: any) => {
            const match = processedResults.find(r => r.taskData.title === tData.title && r.taskData.description === tData.description);
            if (match) {
              if (match.status === 'existing' && match.taskId) {
                taskIds.push(match.taskId);
              } else if (match.status === 'success' && match.taskId) {
                const finalId = publishedTaskIds.get(match.taskId) || match.taskId;
                taskIds.push(finalId);
              }
            }
          });
        }
        return {
          title: sec.title || '',
          description: sec.description || '',
          task_ids: taskIds
        };
      });

      // 3. Create course
      const coursePayload = {
        title: courseTitle,
        description: courseDesc,
        status: parsedCourse.status === 'draft' ? 'draft' : 'published',
        authors: Array.isArray(parsedCourse.authors) ? parsedCourse.authors.map((a:any) => ({
          name: a.name || '',
          link: a.link || ''
        })) : [],
        sections: sections
      };

      const cRes = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coursePayload)
      });
      
      if (!cRes.ok) {
        const err = await cRes.json();
        throw new Error(err.detail || "Failed to create course");
      }

      setStep('success');
      if (onImportFinished) onImportFinished();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    step, setStep,
    dragActive, uploadError,
    parsedCourse, courseTitle, setCourseTitle, courseDesc, setCourseDesc,
    processingTotal, processingCurrent, processedResults,
    isPublishing,
    handleCancel, handleDrag, handleDrop, handleFileChange,
    publishCourse
  };
};
