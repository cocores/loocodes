import { useEffect, useState } from "react";

/**
 * Once `condition` goes true, keeps returning true forever after (for this
 * component instance) even if `condition` later goes false. Used to reserve
 * a slot's space — e.g. the flagged note — the first time it's needed, so
 * clearing the condition afterward only fades its content out rather than
 * collapsing the space and resizing the surrounding card.
 */
export function useStickyVisible(condition: boolean): boolean {
  const [everTrue, setEverTrue] = useState(condition);

  useEffect(() => {
    if (condition) setEverTrue(true);
  }, [condition]);

  return everTrue;
}
