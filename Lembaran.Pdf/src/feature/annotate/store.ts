import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAnnotation,
  listAnnotations,
  removeAnnotation,
  updateAnnotation,
  type Annotation,
  type AnnotationColor,
} from '../../storage/annotations';

export type AnnotateTool = 'none' | 'highlight';

const EMPTY: Annotation[] = [];

export interface AnnotationsState {
  all: Annotation[];
  byPage: Map<number, Annotation[]>;
  tool: AnnotateTool;
  color: AnnotationColor;
  selectedId: string | null;
  setTool(tool: AnnotateTool): void;
  setColor(color: AnnotationColor): void;
  select(id: string | null): void;
  create(page: number, box: { x: number; y: number; w: number; h: number }): Promise<Annotation | null>;
  setNote(id: string, note: string): Promise<void>;
  drop(id: string): Promise<void>;
}

export function useAnnotations(docKey: string): AnnotationsState {
  const [all, setAll] = useState<Annotation[]>(EMPTY);
  const [tool, setTool] = useState<AnnotateTool>('none');
  const [color, setColor] = useState<AnnotationColor>('amber');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setAll(EMPTY);
    setSelectedId(null);
    setTool('none');
    if (!docKey) return;
    let cancelled = false;
    void listAnnotations(docKey)
      .then((items) => {
        if (!cancelled) setAll(items.sort((a, b) => a.createdAt - b.createdAt));
      })
      .catch(() => setAll(EMPTY));
    return () => {
      cancelled = true;
    };
  }, [docKey]);

  const create = useCallback<AnnotationsState['create']>(
    async (page, box) => {
      if (!docKey) return null;
      const annotation: Annotation = {
        id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        docKey,
        page,
        ...box,
        color,
        note: '',
        createdAt: Date.now(),
      };
      setAll((current) => [...current, annotation]);
      setSelectedId(annotation.id);
      await addAnnotation(annotation).catch(() => undefined);
      return annotation;
    },
    [color, docKey],
  );

  const setNote = useCallback<AnnotationsState['setNote']>(async (id, note) => {
    setAll((current) => current.map((item) => (item.id === id ? { ...item, note } : item)));
    await updateAnnotation(id, { note }).catch(() => undefined);
  }, []);

  const drop = useCallback<AnnotationsState['drop']>(async (id) => {
    setAll((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    await removeAnnotation(id).catch(() => undefined);
  }, []);

  const byPage = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    for (const item of all) {
      const list = map.get(item.page);
      if (list) list.push(item);
      else map.set(item.page, [item]);
    }
    return map;
  }, [all]);

  return { all, byPage, tool, color, selectedId, setTool, setColor, select: setSelectedId, create, setNote, drop };
}
