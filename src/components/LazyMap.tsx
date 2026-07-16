"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title: string;
  /**
   * Tailwind classes for the iframe element. The visual filter/animations
   * should be passed in by the parent so this component stays presentational.
   */
  iframeClassName?: string;
};

/**
 * Mounts a Google Maps iframe only when the surrounding container is near
 * the viewport. Saves ~1–2 MB of Google tile + JS work for users who never
 * scroll to the Visit section (the dominant mobile traffic pattern).
 */
export default function LazyMap({ src, title, iframeClassName = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      // Fallback: just mount.
      setShouldMount(true);
      return;
    }
    const node = wrapRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldMount(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className="absolute inset-0 bg-[#060a14]">
      {shouldMount ? (
        <iframe
          title={title}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          tabIndex={-1}
          aria-hidden
          className={`${iframeClassName} transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
    </div>
  );
}
