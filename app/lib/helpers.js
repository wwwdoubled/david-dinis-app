// ─────────────────────────────────────────────────────────────────────────
// app/lib/helpers.js — funções puras extraídas de CampaignPlatform.jsx
// v3.23.0: módulo sem React, testável em isolamento (tests/helpers.test.js).
// Não importar T, supabase, nem nada de React aqui — só lógica pura.
// ─────────────────────────────────────────────────────────────────────────

// Normaliza EAN: corrige notação científica do Excel, tira não-dígitos e
// zeros à esquerda (para comparação). ⚠ o strip de zeros pode colidir EANs
// distintos — ver testes para o comportamento documentado.
export function normalizeEAN(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if (/^\d+\.?\d*e\+?\d+$/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n)) s = n.toFixed(0);
  }
  s = s.replace(/[^\d]/g, '');
  return s.replace(/^0+/, '');
}

// Categoria a partir do campo TIPO da Tx Penetração (BD N).
export function _catFromTipo(tipo) {
  const m = String(tipo || '').toUpperCase();
  if (m.includes('SMARTWATCH')) return 'smartwatch';
  if (m.includes('TELECOM'))    return 'telecom';
  if (m.includes('HARDWARE'))   return 'hardware';
  if (m.includes('FOTO'))       return 'foto';
  if (m.includes('RESTART'))    return 'restart';
  if (m.includes('GAMING'))     return 'gaming';
  if (m.includes('DRONE'))      return 'drone';
  if (m.includes('MOB'))        return 'mob';
  if (/\bTV\b/.test(m))         return 'tv';
  return 'other';
}

// Excel serial → dia do mês.
export function _dayFromSerial(serial) {
  const ms = (Number(serial) - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? 0 : d.getUTCDate();
}

// Excel serial → { year, month (1-12), day }.
export function _ymdFromSerial(serial) {
  const ms = (Number(serial) - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// Dias úteis (Seg-Sáb, exclui Domingo) de fromDay até ao fim do mês.
export function _workingDaysInMonth(year, month1, fromDay = 1) {
  const daysInMonth = new Date(year, month1, 0).getDate();
  let count = 0;
  for (let d = fromDay; d <= daysInMonth; d++) {
    const dow = new Date(year, month1 - 1, d).getDay();
    if (dow !== 0) count++; // 0 = domingo
  }
  return count;
}

// Dias úteis restantes no mês. Aceita referenceDay (data do ficheiro) — conta
// a partir de refDay+1, o que inclui automaticamente hoje porque today > refDay.
// Sem refDay, usa hoje (inclusive).
export function _daysRemainingInMonth(monthKey, referenceDay = null) {
  if (!monthKey) return { days: 22, total: 26, refDay: null };
  const [y, m] = monthKey.split('-').map(Number);
  const total = _workingDaysInMonth(y, m, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const refIsExplicit = Number.isFinite(referenceDay) && referenceDay > 0;
  if (refIsExplicit) {
    const safeRef = Math.min(Math.max(1, referenceDay), daysInMonth);
    const fromDay = safeRef + 1;
    const remaining = fromDay > daysInMonth ? 0 : _workingDaysInMonth(y, m, fromDay);
    return { days: remaining, total, elapsed: total - remaining, refDay: safeRef };
  }
  const monthEnd = new Date(y, m, 0);
  const monthStart = new Date(y, m - 1, 1);
  if (today > monthEnd) return { days: 0, total, elapsed: total, refDay: daysInMonth };
  if (today < monthStart) return { days: total, total, elapsed: 0, refDay: null };
  const todayDay = today.getDate();
  const fromDay = todayDay;
  const remaining = fromDay > daysInMonth ? 0 : _workingDaysInMonth(y, m, fromDay);
  return { days: remaining, total, elapsed: total - remaining, refDay: todayDay };
}

// "40H00 Semanais" → 40. Default 40.
export function _hoursFromCarga(carga) {
  const m = String(carga || '').match(/(\d+)/);
  return m ? Number(m[1]) : 40;
}

// Parte uma frase em 2 linhas equilibradas (selo ACUMULA 1%).
export function _acumulaLines(msg) {
  const words = String(msg || '').trim().split(/\s+/);
  if (words.length <= 1) return [words[0] || '', ''];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

// Célula do horário PDF é dia trabalhado? (ignora FC/FO/Férias/Aniv/V).
export function _isWorkedCell(cell) {
  const c = String(cell || '').trim().toUpperCase();
  if (!c) return false;
  if (['FC', 'FO', 'FER', 'FÉRIAS', 'F�RIAS', 'FERIAS', 'ANIV', 'V'].includes(c)) return false;
  return /^(\d{2,3}[A-Z]{0,3}|INV.*|PM|PT|1H|-1H|BH\(?\+?\-?\)?)/i.test(c);
}

// Aliases para nomes que diferem entre VENDEDOR_TOTAL e horário.
export const PT_NAME_ALIASES = {
  'RICARDO GABRIEL': 'RICARDO SILVA',
};

// Match colaborador seller ↔ horário: NIF exacto, alias, nome completo, primeiro+último.
export function _matchSchedCollab(seller, sched) {
  if (!sched || !seller) return null;
  const nif = String(seller.nif || '').trim();
  const full = String(seller.name || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const aliased = PT_NAME_ALIASES[full] || null;
  const firstLast = (s) => {
    const parts = String(s || '').toUpperCase().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (parts.length < 2) return parts[0] || '';
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };
  const fl = firstLast(full);
  for (const c of sched) {
    if (nif && String(c.nif || '').trim() === nif) return c;
    const cFull = String(c.name || '').toUpperCase().trim();
    if (cFull === full) return c;
    if (aliased && cFull === aliased) return c;
    if (firstLast(c.name) === fl) return c;
  }
  return null;
}

// Apportionment justo (método do maior resto / Hamilton). Distribui `total`
// (inteiro) por N pesos, devolvendo inteiros que somam exactamente `total`.
// Cada um leva o floor da quota exacta; o que falta vai para os maiores restos.
export function apportionLargestRemainder(total, weights) {
  const ws = (weights || []).map(w => Math.max(0, Number(w) || 0));
  const sum = ws.reduce((a, b) => a + b, 0);
  const T = Math.max(0, Math.round(Number(total) || 0));
  const n = ws.length;
  if (n === 0) return [];
  if (sum <= 0) {
    // sem pesos → distribui igualmente
    const base = Math.floor(T / n);
    const out = new Array(n).fill(base);
    let left = T - base * n;
    for (let i = 0; i < n && left > 0; i++) { out[i] += 1; left--; }
    return out;
  }
  const exact = ws.map(w => T * w / sum);
  const out = exact.map(e => Math.floor(e));
  let left = T - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, rem: e - Math.floor(e) }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; k < order.length && left > 0; k++) { out[order[k].i] += 1; left--; }
  return out;
}

// Parser do texto colado do PDF de Permanências FNAC.
// Retorna { days:[{dow,day,monthHint}], collabs:[{nif,name,carga,cells:[]}] } ou null.
export function parsePermanenciasText(text) {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split(/\r?\n/).map(s => s.trim());
  const dows = ['seg', 'ter', 'qua', 'qui', 'sex', 's�b', 'sab', 'dom'];
  const days = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const a = lines[i].toLowerCase();
    if (!dows.some(d => a === d)) continue;
    const b = lines[i + 1] || '';
    const mNum = b.match(/^(\d{1,2})(?:-([a-z]+))?$/i);
    if (!mNum) continue;
    while (i < lines.length) {
      const dwl = lines[i].toLowerCase();
      const dwIdx = dows.indexOf(dwl);
      if (dwIdx < 0) break;
      const dayLine = lines[i + 1];
      const md = dayLine.match(/^(\d{1,2})(?:-([a-z]+))?$/i);
      if (!md) break;
      days.push({ dow: dwl, day: Number(md[1]), monthHint: md[2] || null });
      i += 2;
    }
    break;
  }
  if (days.length === 0) return null;
  const collabs = [];
  while (i < lines.length) {
    while (i < lines.length && !/^\d{4,7}$/.test(lines[i])) i++;
    if (i >= lines.length) break;
    const nif = lines[i++];
    const name = lines[i++] || '';
    if (!name || /^\d/.test(name)) continue;
    const cargaLine = lines[i] || '';
    let carga = '';
    if (/^\(\d+\/\d+\)/.test(cargaLine)) { carga = cargaLine; i++; }
    const cells = [];
    let consumed = 0;
    while (i < lines.length && consumed < days.length) {
      const ln = lines[i];
      if (/^\d{4,7}$/.test(ln) && i + 1 < lines.length && /^[A-ZÀ-ɏ�]/.test(lines[i + 1])) break;
      cells.push(ln || '');
      i++; consumed++;
    }
    if (cells.length > 0) collabs.push({ nif, name: name.trim(), carga, cells });
  }
  return { days, collabs };
}

// Tokens normalizados (uppercase, sem acentos, só A-Z0-9) para matching.
export function _planTokens(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}

// Score do match zona da campanha ↔ móvel da planta (0 = não bate).
export function _zoneFixtureScore(zoneName, fixture) {
  const zt = _planTokens(zoneName);
  const ft = _planTokens(fixture.label);
  if (ft.length === 0 || zt.length === 0) return 0;
  if (ft.every(t => zt.includes(t))) return ft.length + 2; // móvel inteiro contido na zona
  const shared = ft.filter(t => t.length >= 3 && zt.includes(t));
  return shared.length;
}
