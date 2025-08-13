"use client";
import React, { useEffect } from 'react';

interface ColorDotProps { color: string | undefined; className?: string; title?: string; }

const STYLE_ELEMENT_ID = 'dynamic-color-dot-styles';
const injected: Record<string, boolean> = {};

function ensureStyleElement(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  return el;
}

function colorToClass(color: string): string {
  return 'dot_' + color.replace(/[^a-fA-F0-9]/g, '').slice(0, 10) || 'default';
}

export const ColorDot: React.FC<ColorDotProps> = ({ color, className = '', title }) => {
  const c = (color || '#999').toLowerCase();
  const cls = colorToClass(c);
  useEffect(() => {
    if (typeof document === 'undefined' || injected[cls]) return;
    const styleEl = ensureStyleElement();
    styleEl.appendChild(document.createTextNode(`.${cls}{background:${c};}`));
    injected[cls] = true;
  }, [c, cls]);
  return <span className={`inline-block rounded-full ${cls} ${className}`} title={title} />;
};
