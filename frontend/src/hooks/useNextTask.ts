import { useState, useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';

export function useNextTask() {
  const activeTask = useTaskStore(state => state.activeTask);
  const [nextTaskId, setNextTaskId] = useState<number | null>(null);

  useEffect(() => {
    const courseId = activeTask?.courses?.[0]?.id;
    if (!courseId || !activeTask?.id) {
      setNextTaskId(null);
      return;
    }

    let isMounted = true;
    fetch(`/api/courses/${courseId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        
        let foundCurrent = false;
        let nextId = null;
        
        // Iterate through sections and tasks
        for (const section of data.sections || []) {
          for (const task of section.tasks || []) {
            if (foundCurrent) {
              nextId = task.id;
              break;
            }
            if (task.id === activeTask.id) {
              foundCurrent = true;
            }
          }
          if (nextId) break;
        }
        
        setNextTaskId(nextId);
      })
      .catch(err => console.error('Failed to fetch course for next task', err));

    return () => { isMounted = false; };
  }, [activeTask?.id, activeTask?.courses]);

  return nextTaskId;
}
