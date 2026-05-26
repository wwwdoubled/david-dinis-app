import { describe, it, expect } from 'vitest';

// Pure-function smoke tests para garantir que regressões básicas
// nas helpers críticas não passam silenciosas em PR.
//
// Estas funções estão actualmente inline em app/CampaignPlatform.jsx —
// quando forem extraídas, ajusta o import abaixo.

// Helper: normalizar EAN (replica simples)
function normalizeEAN(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Remove non-digits, must be length 8-14 to count as valid
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return s.toLowerCase();
  return digits;
}

// Helper: toIsoDate
function toIsoDate(ddmmyyyy) {
  const m = String(ddmmyyyy || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// Helper: ISO week
function isoWeek(dateIso) {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return dateIso;
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

describe('normalizeEAN', () => {
  it('extracts digits from numeric strings', () => {
    expect(normalizeEAN('5601234567890')).toBe('5601234567890');
  });
  it('handles null/undefined/empty', () => {
    expect(normalizeEAN(null)).toBe(null);
    expect(normalizeEAN(undefined)).toBe(null);
    expect(normalizeEAN('')).toBe(null);
    expect(normalizeEAN('   ')).toBe(null);
  });
  it('strips spaces and dashes', () => {
    expect(normalizeEAN(' 5601-2345-67890 ')).toBe('5601234567890');
  });
  it('returns lowercase for non-EAN strings', () => {
    expect(normalizeEAN('ABC123')).toBe('abc123');
  });
});

describe('toIsoDate', () => {
  it('converts dd-mm-yyyy to ISO', () => {
    expect(toIsoDate('01-01-2026')).toBe('2026-01-01');
    expect(toIsoDate('23-05-2026')).toBe('2026-05-23');
  });
  it('returns null for invalid formats', () => {
    expect(toIsoDate('2026-01-01')).toBe(null);
    expect(toIsoDate('foo')).toBe(null);
    expect(toIsoDate('')).toBe(null);
    expect(toIsoDate(null)).toBe(null);
  });
});

describe('isoWeek', () => {
  it('returns correct ISO week format', () => {
    expect(isoWeek('2026-01-05')).toMatch(/^2026-W\d{2}$/);
  });
  it('handles invalid dates gracefully', () => {
    expect(isoWeek('not-a-date')).toBe('not-a-date');
  });
});
