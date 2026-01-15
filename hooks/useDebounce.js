/**
 * useDebounce.js - Debounce Hook
 * 
 * Custom React hook for debouncing function calls.
 * Prevents rapid successive calls to a function within a specified delay period.
 * 
 * Usage:
 * const debounce = useDebounce(1000); // 1 second delay
 * debounce(() => { /* your function */ });
 * 
 * Features:
 * - Configurable delay time
 * - Returns a debounced function
 * - Prevents multiple rapid executions
 * 
 * @param {number} delay - Delay in milliseconds (default: 1000ms)
 * @returns {Function} - Debounced function that accepts a callback
 */

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
