import { useState, useEffect } from 'react';
import type { DatabaseSchema } from '../types';
import { useUIStore } from '../../../store/uiStore';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function useSchema(database: string = 'northwind') {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const schemaVersion = useUIStore(state => state.schemaVersion);

  useEffect(() => {
    let isMounted = true;

    async function fetchSchema() {
      try {
        setLoading(true);
        setError(null);
        
        if (USE_MOCK) {
          // Имитируем сетевую задержку для мока
          const mockModule = await import('../mock/crash_test.json');
          if (isMounted) {
            setSchema(mockModule.default as unknown as DatabaseSchema);
          }
        } else {
          const response = await fetch(`/api/schema?database=${encodeURIComponent(database)}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (isMounted) {
            setSchema(data as DatabaseSchema);
          }
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : 'Unknown error');
          console.error("Failed to load schema:", e);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSchema();

    return () => {
      isMounted = false;
    };
  }, [database, schemaVersion]);

  return { schema, loading, error };
}
