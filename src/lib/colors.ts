export function getContrastingTextColor(bgColor: string): string {
  const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const uicolors = [r / 255, g / 255, b / 255];
  const c = uicolors.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  const L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
  return (L > 0.179) ? '#000000' : '#FFFFFF';
}

// Convert hex color to RGB
export function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number = 0;
  let s: number = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Get contrasting foreground color in HSL format
export function getContrastingForegroundHsl(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return 'hsl(0, 0%, 0%)';

  const { r, g, b } = rgb;
  // Calculate luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? 'hsl(0, 0%, 0%)' : 'hsl(0, 0%, 100%)';
}

export function hexToHsl(hex: string): { h: number, s: number, l: number } | null {
  if (!hex || hex.length < 4) {
    return null;
  }

  let r: number, g: number, b: number;
  let h: number = 0, s: number = 0, l: number = 0;

  hex = hex.replace("#", "");

  if (hex.length === 3) {
    r = parseInt(hex.substring(0, 1).repeat(2), 16);
    g = parseInt(hex.substring(1, 2).repeat(2), 16);
    b = parseInt(hex.substring(2, 3).repeat(2), 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  let cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'todo': return '#3b82f6';
        case 'inprogress': return '#f59e42';
        case 'done': return '#22c55e';
        case 'onhold': return '#a855f7';
        case 'archived': return '#6b7280';
        default: return '#9ca3af';
    }
}

// Generate sidebar background color HSL
export function getSidebarBackgroundColorHsl(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return '210 40% 4%'; // fallback
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${Math.round(hsl.h)} ${Math.round(hsl.s * 100)}% 4%`;
}

// Generate theme background color HSL
export function getThemeBackgroundColorHsl(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return '210 40% 98%'; // fallback
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${Math.round(hsl.h)} ${Math.round(hsl.s * 100)}% 98%`;
}
