import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cx } from "../../utils/cx";

/**
 * One IntersectionObserver for the whole page: each element fades up once,
 * the first time it comes into view. Only opacity and transform change, so
 * scrolling stays on the compositor and never stutters. With reduced motion
 * (or without IntersectionObserver) content is simply shown.
 */
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | null = null;

function observe(el: Element, onShow: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    onShow();
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
  );
  callbacks.set(el, onShow);
  observer.observe(el);
  return () => {
    callbacks.delete(el);
    observer?.unobserve(el);
  };
}

function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  /** Stagger in ms (keep under 300). */
  delay?: number;
  className?: string;
  children: ReactNode;
  id?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observe(el, () => setShown(true));
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown || undefined}
      className={cx("dc-reveal", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
