import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftIndicatorProps {
  lastSaved?: Date | null;
  isSaving?: boolean;
  hasError?: boolean;
  className?: string;
}

export function DraftIndicator({ lastSaved, isSaving, hasError, className }: DraftIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (seconds < 5) setTimeAgo('agora');
      else if (seconds < 60) setTimeAgo(`há ${seconds}s`);
      else if (seconds < 3600) setTimeAgo(`há ${Math.floor(seconds / 60)}min`);
      else setTimeAgo(`há ${Math.floor(seconds / 3600)}h`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Salvando...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-rose-600', className)}>
        <CloudOff className="h-3.5 w-3.5" />
        <span>Erro ao salvar</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Cloud className="h-3.5 w-3.5" />
        <span>Salvo como rascunho {timeAgo}</span>
      </div>
    );
  }

  return null;
}

// Hook for autosave functionality
export function useAutosave<T>(
  data: T,
  saveKey: string,
  debounceMs: number = 1000
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem(`draft_${saveKey}`, JSON.stringify(data));
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, saveKey, debounceMs]);

  const clearDraft = () => {
    localStorage.removeItem(`draft_${saveKey}`);
    setLastSaved(null);
  };

  const loadDraft = (): T | null => {
    const saved = localStorage.getItem(`draft_${saveKey}`);
    if (saved) {
      try {
        return JSON.parse(saved) as T;
      } catch {
        return null;
      }
    }
    return null;
  };

  const hasDraft = () => {
    return localStorage.getItem(`draft_${saveKey}`) !== null;
  };

  return { lastSaved, isSaving, clearDraft, loadDraft, hasDraft };
}


