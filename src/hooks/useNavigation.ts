import { useCallback, useEffect, useRef, useState } from "react";

export type Screen =
  | { name: "camera" }
  | { name: "passport" }
  | { name: "result"; scanId: string };

const ROOT: Screen = { name: "camera" };

export function useNavigation() {
  const [stack, setStack] = useState<Screen[]>([ROOT]);
  const stackRef = useRef(stack);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const current = stack[stack.length - 1];

  const push = useCallback((screen: Screen) => {
    const next = [...stackRef.current, screen];
    stackRef.current = next;
    setStack(next);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "");
    }
  }, []);

  const resetToCamera = useCallback(() => {
    stackRef.current = [ROOT];
    setStack([ROOT]);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "");
    }
  }, []);

  const pop = useCallback(() => {
    if (stackRef.current.length <= 1) return false;
    const next = stackRef.current.slice(0, -1);
    stackRef.current = next;
    setStack(next);
    return true;
  }, []);

  return { stack, current, push, pop, resetToCamera };
}
