// hooks/useDebounce.js
import { useRef } from 'react';

export const useDebounce = (delay = 1000) => {
  const lastTapRef = useRef(0);

  const debounce = (callback) => {
    const now = Date.now();
    if (now - lastTapRef.current < delay) {
      return false; // Too soon, ignore
    }
    lastTapRef.current = now;
    callback();
    return true; // Executed
  };

  return debounce;
};

export default useDebounce;
