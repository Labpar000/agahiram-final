'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import type { ComponentType, ReactNode } from 'react';

type AppThemeProviderProps = ThemeProviderProps & {
  children: ReactNode;
};

const Provider = NextThemesProvider as ComponentType<AppThemeProviderProps>;

export function ThemeProvider({ children, ...props }: AppThemeProviderProps) {
  return (
    <Provider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </Provider>
  );
}

export { useTheme } from 'next-themes';
