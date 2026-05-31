// ─────────────────────────────────────────────────────────────────────────
// app/lib/format.js — utilitários puros de formatação / ficheiros (v3.23.7)
// Extraídos de CampaignPlatform.jsx (sem React) para reutilização e testes.
// ─────────────────────────────────────────────────────────────────────────

// Converte string PT/EN ("1.234,56" / "1,234.56" / "32,19") em número.
export function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/[€%\s]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.'); // PT: 1.234,56
    } else {
      s = s.replace(/,/g, '');                    // EN: 1,234.56
    }
  } else if (lastComma >= 0) {
    s = s.replace(',', '.');                       // PT decimal: 32,19
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Descarrega um Blob como ficheiro.
export function downloadBlob(blob, filename) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
