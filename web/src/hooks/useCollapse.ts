import { useEffect, useState } from "react";

/**
 * Keeps a conditionally-rendered block mounted for `duration` ms after
 * `expanded` goes false, so its CSS collapse transition (grid-template-rows
 * going to 0fr, see the `is-open` classes that pair with this hook) can
 * actually play instead of the surrounding layout just snapping to its new
 * size the instant the condition flips. Mounts immediately when `expanded`
 * goes true — only the exit needs the delay.
 */
export function useCollapse(expanded: boolean, duration = 220): boolean {
  const [mounted, setMounted] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      return;
    }
    const timeout = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timeout);
  }, [expanded, duration]);

  return mounted;
}
