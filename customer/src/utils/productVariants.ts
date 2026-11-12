import type { ProductVariant } from '../core/types';

/**
 * Parses raw size strings or JSON arrays into structured ProductVariant objects.
 * Supports:
 * - JSON serialized variants: '[{"size":"500 ml","stock":25,"price":299}]'
 * - Delimited strings: '500 ml / 1 L / 5 L' or '500 ml | 1 L'
 * - Single size strings: '500 ml'
 */
export const parseProductVariants = (
  rawSize?: string,
  fallbackStock: number = 50,
  fallbackPrice?: number
): ProductVariant[] => {
  if (!rawSize || !rawSize.trim()) {
    return [{ size: 'Standard', stock: fallbackStock, price: fallbackPrice }];
  }

  const trimmed = rawSize.trim();

  // 1. JSON array format
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          size: String(item.size || item.name || 'Standard').trim(),
          stock: typeof item.stock === 'number' ? Math.max(0, item.stock) : Math.max(0, Number(item.stock) || fallbackStock),
          price: typeof item.price === 'number' ? item.price : (fallbackPrice || undefined),
          discount: item.discount
        }));
      }
    } catch {
      // Fall through to string parser
    }
  }

  // 2. Delimited string format (e.g., "500 ml / 1 L / 5 L" or "500 ml (25 in stock) / 1 L (10 in stock)")
  const delimiter = trimmed.includes('/') ? '/' : trimmed.includes('|') ? '|' : trimmed.includes(',') ? ',' : null;
  if (delimiter) {
    const parts = trimmed.split(delimiter).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((part) => {
        const stockMatch = part.match(/\((?:stock:?\s*)?(\d+)[^)]*\)/i) || part.match(/:\s*(\d+)/);
        const cleanSize = part.replace(/\([^)]*\)/g, '').replace(/:\s*\d+/, '').trim();
        const stockVal = stockMatch ? Number(stockMatch[1]) : fallbackStock;
        return {
          size: cleanSize || part,
          stock: isNaN(stockVal) ? fallbackStock : stockVal,
          price: fallbackPrice
        };
      });
    }
  }

  // 3. Single size option
  return [{ size: trimmed, stock: fallbackStock, price: fallbackPrice }];
};

