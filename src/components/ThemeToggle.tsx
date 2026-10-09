'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, Theme } from '@/context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options: { label: string; value: Theme; icon: React.ReactNode; desc: string }[] = [
    {
      label: 'Light',
      value: 'light',
      icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
      desc: 'Crisp high-contrast',
    },
    {
      label: 'Obsidian Velvet',
      value: 'dark',
      icon: <Moon className="w-3.5 h-3.5 text-indigo-400" />,
      desc: 'Deep dark OLED',
    },
    {
      label: 'System',
      value: 'system',
      icon: <Monitor className="w-3.5 h-3.5 text-slate-400" />,
      desc: 'Follow OS preference',
    },
  ];

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Theme: ${theme === 'system' ? `System (${resolvedTheme})` : theme}`}
        className="h-8 px-2.5 flex items-center space-x-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-xs font-medium cursor-pointer shadow-2xs active:scale-95"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
        <span className="hidden md:inline capitalize">{theme === 'system' ? 'Auto' : theme}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            Display Theme
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {opt.icon}
                    <div>
                      <div>{opt.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal leading-tight">{opt.desc}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
