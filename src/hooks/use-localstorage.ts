
'use client';
    
    import { useState, useEffect } from 'react';
    
    export function useLocalStorage<T>(key: string, initialValue: T) {
      const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
          return initialValue;
        }
        try {
          const item = window.localStorage.getItem(key);
          return item ? JSON.parse(item) : initialValue;
        } catch (error) {
          console.log(error);
          return initialValue;
        }
      });
    
      const setValue = (value: T | ((val: T) => T)) => {
        try {
          const valueToStore =
            value instanceof Function ? value(storedValue) : value;
          setStoredValue(valueToStore);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
        } catch (error) {
          console.log(error);
        }
      };
    
      useEffect(() => {
        if (typeof window !== 'undefined') {
            const item = window.localStorage.getItem(key);
            if (item) {
                try {
                    setStoredValue(JSON.parse(item));
                } catch (e) {
                    // If parsing fails, it might be a raw string
                    // Or could be corrupted, best to fall back to initial
                    console.warn(`Could not parse stored json for key "${key}"`);
                }
            }
        }
      }, [key]);
    
      return [storedValue, setValue] as const;
    }

