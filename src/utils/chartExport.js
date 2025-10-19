import html2canvas from "html2canvas";

export const exportChartAsImage = async (chartRef, filename, options = {}) => {
  if (!chartRef?.current) {
    throw new Error("Chart reference not found");
  }

  const canvas = await html2canvas(chartRef.current, {
    backgroundColor: options.backgroundColor || "#ffffff",
    scale: options.scale || 2,
    allowTaint: true,
    useCORS: true,
    logging: false,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.body;
      if (clonedElement) {
        const allElements = clonedElement.querySelectorAll('*');
        allElements.forEach((el) => {
          const computedStyle = window.getComputedStyle(el);
          
          if (computedStyle.color && computedStyle.color.includes('oklch')) {
            el.style.color = getComputedColor(el, 'color') || '#000000';
          }
          if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('oklch')) {
            el.style.backgroundColor = getComputedColor(el, 'backgroundColor') || '#ffffff';
          }
          if (computedStyle.fill && computedStyle.fill.includes('oklch')) {
            const fillColor = getComputedColor(el, 'fill');
            if (fillColor) {
              el.style.fill = fillColor;
            }
          }
          if (computedStyle.stroke && computedStyle.stroke.includes('oklch')) {
            const strokeColor = getComputedColor(el, 'stroke');
            if (strokeColor) {
              el.style.stroke = strokeColor;
            }
          }
        });
      }
    },
    ...options.html2canvasOptions
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

const getComputedColor = (element, property) => {
  try {
    const style = window.getComputedStyle(element);
    const colorValue = style.getPropertyValue(property);
    
    if (!colorValue || colorValue === 'none' || colorValue === 'transparent') {
      return null;
    }
    
    if (colorValue.includes('oklch')) {
      return convertOklchToHex(colorValue);
    }
    
    return colorValue;
  } catch {
    return null;
  }
};

const convertOklchToHex = (oklchString) => {
  try {
    const match = oklchString.match(/oklch\(([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
    if (!match) return '#000000';
    
    const [, l, c, h] = match.map(Number);
    const rgb = oklchToRgb(l / 100, c, h);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  } catch {
    return '#000000';
  }
};

const oklchToRgb = (l, c, h) => {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  const L = l * 100;
  const A = a;
  const B = b;
  
  let y = (L + 16) / 116;
  let x = A / 500 + y;
  let z = y - B / 200;
  
  x = 0.95047 * ((x ** 3 > 0.008856) ? x ** 3 : (x - 16 / 116) / 7.787);
  y = 1.00000 * ((y ** 3 > 0.008856) ? y ** 3 : (y - 16 / 116) / 7.787);
  z = 1.08883 * ((z ** 3 > 0.008856) ? z ** 3 : (z - 16 / 116) / 7.787);
  
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bVal = x * 0.0557 + y * -0.2040 + z * 1.0570;
  
  r = (r > 0.0031308) ? (1.055 * (r ** (1 / 2.4)) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * (g ** (1 / 2.4)) - 0.055) : 12.92 * g;
  bVal = (bVal > 0.0031308) ? (1.055 * (bVal ** (1 / 2.4)) - 0.055) : 12.92 * bVal;
  
  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(bVal * 255)))
  };
};

const rgbToHex = (r, g, b) => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join('');
};
