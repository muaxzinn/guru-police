'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { BrandKey, ThemeMode } from '@/lib/constants';
import { ClientRuntimeBridge } from '@/components/ClientRuntimeBridge';

interface ThemeContextValue {
  theme: ThemeMode;
  brand: BrandKey;
  toggleTheme: () => void;
  setBrand: (b: BrandKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  brand: 'blue',
  toggleTheme: () => {},
  setBrand: () => {},
});

export function ThemeAndBrandProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [brand, setBrandState] = useState<BrandKey>('blue');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('gp:theme') as ThemeMode) || 'light';
    const savedBrand = (localStorage.getItem('gp:brand') as BrandKey) || 'blue';
    setThemeState(savedTheme);
    setBrandState(savedBrand);
    document.documentElement.dataset.theme = savedTheme;
    document.documentElement.dataset.brand = savedBrand;
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('gp:theme', next);
      } catch {}
      return next;
    });
  };

  const setBrand = (next: BrandKey) => {
    setBrandState(next);
    document.documentElement.dataset.brand = next;
    try {
      localStorage.setItem('gp:brand', next);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, brand, toggleTheme, setBrand }}>
      <ClientRuntimeBridge />
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeAndBrand() {
  return useContext(ThemeContext);
}

