
export const hslToRgb = (hslStr: string): [number, number, number] => {
  const [h, s, l] = hslStr.replace(/%/g, '').split(' ').map(v => parseFloat(v));
  const saturation = s / 100;
  const lightness = l / 100;

  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    throw new Error("Invalid HSL string");
  }

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return [r, g, b];
}

export const hexToRgb = (hex: string): [number, number, number] => {
  let sanitizedHex = hex.startsWith('#') ? hex.slice(1) : hex;
  // Handle 3-digit hex codes
  if (sanitizedHex.length === 3) {
      sanitizedHex = sanitizedHex.split('').map(char => char + char).join('');
  }

  const r = parseInt(sanitizedHex.slice(0, 2), 16);
  const g = parseInt(sanitizedHex.slice(2, 4), 16);
  const b = parseInt(sanitizedHex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error('Invalid hex color');
  }
  return [r, g, b];
};

export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};


const foregroundOverrides: Record<string, string> = {
    "180 80% 40%": "210 40% 98%", // Teal -> Light text
    "120 39% 49%": "210 40% 98%", // Forest -> Light text
    "0 0% 50%":   "210 40% 98%", // Monochrome -> Light text
};

export const getContrastingForegroundHsl = (hslStr: string): string => {
    if (!hslStr) return "0 0% 100%"; // default to light text
    if (foregroundOverrides[hslStr]) return foregroundOverrides[hslStr];
    try {
        const [r, g, b] = hslToRgb(hslStr);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? "215 39% 27%" : "0 0% 100%"; // dark text vs light text
    } catch (e) {
        console.error("Could not parse HSL string for foreground:", e);
        return "0 0% 100%"; // fallback to light text
    }
}

export const getThemeBackgroundColorHsl = (primaryHsl: string): string => {
    if (!primaryHsl || primaryHsl === "221 83% 53%") {
        return "0 0% 100%"; // default to white for the default theme
    }
    try {
        const [h] = primaryHsl.split(" ").map(v => parseFloat(v.replace('%', '')));
        if (isNaN(h)) return "0 0% 100%";
        // Use the same hue, but with high saturation and very high lightness for a pastel effect.
        return `${h} 100% 97%`;
    } catch (e) {
        console.error("Could not parse HSL string for background:", e);
        return "0 0% 100%"; // fallback to white
    }
};

export const getSidebarBackgroundColorHsl = (primaryHsl: string, theme: 'light' | 'dark'): string => {
  if (!primaryHsl) {
    return theme === 'light' ? "210 40% 90%" : "222 47% 18%"; // Default fallbacks
  }
  try {
    const [h, s] = primaryHsl.split(" ").map(v => parseFloat(v.replace('%', '')));
    if (isNaN(h) || isNaN(s)) return theme === 'light' ? "210 40% 90%" : "222 47% 18%";

    if (theme === 'light') {
      // A tinted, slightly darker background for the sidebar.
      return `${h} ${s}% 94%`;
    } else {
      // A darker, tinted background for the sidebar in dark mode.
      return `${h} ${s}% 15%`;
    }
  } catch (e) {
    console.error("Could not parse HSL string for sidebar background:", e);
    return theme === 'light' ? "210 40% 90%" : "222 47% 18%"; // Fallback
  }
};


export const getContrastingTextColor = (hex: string) => {
    if (!hex) return '#000000';
    try {
        const [r, g, b] = hexToRgb(hex);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    } catch (e) {
        return '#000000';
    }
};
