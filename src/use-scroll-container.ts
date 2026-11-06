import { useEffect, useRef } from 'react';

/**
 * Keep wheel scrolling inside a sidebar panel. Chromium can route a wheel
 * gesture over a sticky sidebar to the document instead of the nested scroll
 * container; this listener applies the delta directly and only lets the page
 * scroll once the panel reaches its edge.
 */
export function useScrollContainer<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      const delta = event.deltaY * unit;
      const max = element.scrollHeight - element.clientHeight;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, element.scrollTop + delta));
      if (next === element.scrollTop) return;
      element.scrollTop = next;
      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  return ref;
}
