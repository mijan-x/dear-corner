import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll state for a horizontal row: whether it's at either end (to disable
 * the arrows) and a scrollBy that moves almost one screen of cards.
 */
export function useRowScroll() {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
    };
    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", onChange, { passive: true });
    const resize = new ResizeObserver(onChange);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", onChange);
      resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollBy = useCallback((direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.9,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  return { ref, edges, scrollBy };
}
