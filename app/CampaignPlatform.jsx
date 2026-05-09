'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, FileSpreadsheet, Package, Image as ImageIcon, FileText,
  Upload, Search, Plus, X, Check, Download, RotateCcw, Type, DollarSign,
  ChevronRight, Sparkles, Store, Warehouse, TrendingUp, Star, Edit3,
  Trash2, GripVertical, Eye, Pencil, MapPin, BarChart3, ArrowDown, ArrowUp,
  Filter, ListTree, Layers, Tag, Lock, LogOut, AlertCircle, Sun, Moon,
  GitCompareArrows, ArrowRight, Minus, NotebookPen, Mail, ArrowLeft, UserPlus,
  Shield, Users, Activity, Settings, ShieldCheck, ShieldOff, Clock, Circle,
  Bell, Calendar, Inbox, AlertTriangle, ClipboardList, ScanLine, Camera
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────
// Supabase client — singleton
// Reads URL and anon key from env (configured in Vercel + .env.local)
// ─────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '';
const SUPABASE_ANON_KEY = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '';
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // for password reset links
      },
    })
  : null;

// ─────────────────────────────────────────────────────────────────────────
// Error reporting — minimal stub for production observability
// To activate Sentry: `npm i @sentry/nextjs`, set NEXT_PUBLIC_SENTRY_DSN
// in env, replace the body of `reportError` with `Sentry.captureException`.
// Until then, errors are buffered to Supabase `error_log` table (best-effort).
// ─────────────────────────────────────────────────────────────────────────
function reportError(err, context = {}) {
  try {
    const payload = {
      message: err?.message || String(err),
      stack: err?.stack ? String(err.stack).slice(0, 4000) : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      context: context || {},
      created_at: new Date().toISOString(),
    };
    console.error('[reportError]', payload);
    // Best-effort: silently drop if table doesn't exist (no app crash)
    if (supabase) supabase.from('error_log').insert(payload).then(() => {}, () => {});
  } catch {}
}

// Wire global handlers so uncaught errors / rejections also get logged
if (typeof window !== 'undefined' && !window.__ddErrorWired) {
  window.__ddErrorWired = true;
  window.addEventListener('error', (ev) => reportError(ev.error || ev.message, { type: 'window.error' }));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, { type: 'unhandledrejection' }));
}


// ─────────────────────────────────────────────────────────────────────────
// CLOUD-ONLY MODE
// ─────────────────────────────────────────────────────────────────────────
// When true, all data is stored in Supabase. Local IndexedDB is bypassed
// (writes are no-ops, reads return empty). localStorage retains only UI
// preferences (theme, last-selected period, filter states).
const CLOUD_ONLY = true;

// ─────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Theme tokens — mutable object so theme changes apply everywhere
// (every component reads T.bg, T.line, etc. inline, so when we mutate
// properties and force a re-render, all UI updates without prop drilling)
// ─────────────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg: '#F5F2EC', bgEl: '#FAF8F4', ink: '#141210', inkSoft: '#5A554E',
    inkMute: '#9B9690', line: '#E3DED5', lineSoft: '#EDE8DF',
    accent: '#B8442A', accentSoft: '#F2D9D0',
    green: '#5DA050', red: '#C94A3D', orange: '#E68A2E',
    blue: '#5B9BD5', cyan: '#B8DDEE', yellow: '#F1C84B',
    purple: '#7B5EA8',
    cellAlt: '#F0EBE0',
    paper: '#FFFFFF',
  },
  dark: {
    bg: '#15140F', bgEl: '#1E1C16', ink: '#F0EBE0', inkSoft: '#B8B2A4',
    inkMute: '#787469', line: '#2E2A21', lineSoft: '#26221A',
    accent: '#E08560', accentSoft: '#3D2419',
    green: '#7FBF7A', red: '#E26B5C', orange: '#F5A158',
    blue: '#7BB3DC', cyan: '#2A4658', yellow: '#E8C268',
    purple: '#9C82C2',
    cellAlt: '#1A1812',
    paper: '#26221A',
  },
  // FNAC Portugal — primary brand orange + black + white grid
  fnac: {
    bg: '#F4F4F4', bgEl: '#FFFFFF', ink: '#000000', inkSoft: '#3A3A3A',
    inkMute: '#7A7A7A', line: '#D9D9D9', lineSoft: '#ECECEC',
    accent: '#E68A00', accentSoft: '#FFE9C7', // FNAC orange
    green: '#2E8540', red: '#D81B1B', orange: '#E68A00',
    blue: '#1F4FB3', cyan: '#CFE7F8', yellow: '#FFCB05',
    purple: '#6A3FB0',
    cellAlt: '#EFEFEF',
    paper: '#FFFFFF',
  },
};

const THEME_LABELS = {
  light: 'Claro',
  dark: 'Escuro',
  fnac: 'FNAC',
};

const THEME_ORDER = ['light', 'dark', 'fnac'];

// Mutable T — properties updated when theme changes. Start in light mode.
const T = { ...THEMES.light };

function applyTheme(mode) {
  const palette = THEMES[mode] || THEMES.light;
  Object.assign(T, palette);
}

const STATES = [
  { id: 'pending', label: '—', bg: '#F2EDE3', fg: T.inkSoft },
  { id: 'feito', label: 'FEITO', bg: T.green, fg: '#fff' },
  { id: 'falta', label: 'FALTA', bg: T.red, fg: '#fff' },
  { id: 'destaque', label: 'DESTAQUE', bg: T.orange, fg: '#fff' },
  { id: 'minima', label: 'MÍNIMA', bg: T.red, fg: '#fff' },
];

const CARTAZ = ['A3 HORIZONTAL', 'A3 VERTICAL', 'A4', 'BICOEL', 'SP30'];

const DEFAULT_FLOORS = [
  {
    id: 'piso1', name: 'PISO 1', color: T.green,
    zones: [
      { id: 'p1z1', name: 'MLS SOM (LADO SOM)', slots: [] },
      { id: 'p1z2', name: 'MLS CASA (LADO CASA)', slots: [] },
      { id: 'p1z3', name: 'TRÍPTICO SOM (AO LADO DOS DEPRECIADOS)', slots: [] },
      { id: 'p1z4', name: 'MLS INFORMÁTICA (LADO DO FÓRUM)', slots: [] },
      { id: 'p1z5', name: 'MLS AQUÁRIO GRANDE INFORMÁTICA (LADO DOS PCS)', slots: [] },
      { id: 'p1z6', name: 'TRÍPTICO CASA (TEMPORARIAMENTE NA INFORMÁTICA)', slots: [] },
      { id: 'p1z7', name: 'CORREDOR DA TV', slots: [] },
    ],
  },
  {
    id: 'piso0', name: 'PISO 0', color: T.blue,
    zones: [
      { id: 'p0z1', name: 'MLS FRENTE ÀS CAIXAS', slots: [] },
      { id: 'p0z2', name: 'MLS AQUÁRIO PEQUENO VIRADO PARA A SAÍDA DE LOJA', slots: [] },
      { id: 'p0z3', name: 'TRÍPTICO PISO 0', slots: [] },
      { id: 'p0z4', name: 'MLS VIRADO PARA A SAÍDA DE LOJA', slots: [] },
      { id: 'p0z5', name: 'MLS VIRADO PARA A MESA DA APPLE', slots: [] },
      { id: 'p0z6', name: 'PAREDE JUNTO AO SEGURANÇA', slots: [] },
      { id: 'p0z7', name: 'JUNTO AO BALCÃO TELECOM', slots: [] },
    ],
  },
  {
    id: 'destaques', name: 'DESTAQUES PORTÁTEIS', color: T.yellow, star: true,
    zones: [
      { id: 'dz1', name: 'DESTAQUES PORTÁTEIS (só visuais)', slots: [] },
    ],
  },
];

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');`;

// ─────────────────────────────────────────────────────────────────────────
// Smart Excel parsing — auto-skips metadata rows above the real header row
// ─────────────────────────────────────────────────────────────────────────
function findHeaderRow(matrix, expectedHeaders = []) {
  // Scan first 15 rows; pick the first row where:
  //  (a) at least N non-empty cells, AND
  //  (b) ideally matches one of the expected headers
  const lim = Math.min(15, matrix.length);
  for (let i = 0; i < lim; i++) {
    const row = matrix[i] || [];
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
    if (nonEmpty < 3) continue;
    if (expectedHeaders.length === 0) {
      if (nonEmpty >= 5) return i;
      continue;
    }
    const lower = row.map(c => String(c ?? '').trim().toLowerCase());
    const matches = expectedHeaders.filter(h => lower.some(c => c === h.toLowerCase())).length;
    if (matches >= Math.min(2, expectedHeaders.length)) return i;
  }
  // Fallback: first row with ≥3 non-empty cells
  for (let i = 0; i < lim; i++) {
    const row = matrix[i] || [];
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
    if (nonEmpty >= 3) return i;
  }
  return 0;
}

function parseExcelSmart(arrayBuffer, expectedHeaders = []) {
  const wb = XLSX.read(arrayBuffer, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // Read as 2D array first (no header inference)
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (!matrix.length) return { headers: [], rows: [] };

  const headerIdx = findHeaderRow(matrix, expectedHeaders);
  const rawHeaders = matrix[headerIdx] || [];
  const headers = rawHeaders.map((h, i) => {
    const s = String(h ?? '').trim();
    return s || `__col_${i}__`;
  });

  const rows = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
    if (nonEmpty === 0) continue; // skip blank rows
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j] ?? ''; });
    rows.push(obj);
  }
  // Filter out placeholder columns from header list
  const realHeaders = headers.filter(h => !h.startsWith('__col_'));
  return { headers: realHeaders, allHeaders: headers, rows };
}

// ─────────────────────────────────────────────────────────────────────────
// localStorage helpers — keep tight and safe (preferences, theme, light state)
// ─────────────────────────────────────────────────────────────────────────
const STORE_PREFIX = 'dd_';

function storeGet(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(STORE_PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function storeSet(key, value) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch {}
}
function storeDelete(key) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORE_PREFIX + key); } catch {}
}

// ─── Tombstones (recently-deleted ids) ────────────────────────────────
// Quando o utilizador apaga algo, registamos o id aqui durante 5 min para
// que a sync periódica não ressuscite o item enquanto a cloud ainda tem
// o registo em flight.
const TOMBSTONE_TTL = 5 * 60 * 1000;
function getTombstones(kind) {
  const all = storeGet('tombstones', {});
  const list = all[kind] || [];
  const now = Date.now();
  return list.filter(t => now - t.at < TOMBSTONE_TTL);
}
function addTombstone(kind, id) {
  if (id == null) return;
  const all = storeGet('tombstones', {});
  const fresh = (all[kind] || []).filter(t => Date.now() - t.at < TOMBSTONE_TTL);
  fresh.push({ id: String(id), at: Date.now() });
  all[kind] = fresh.slice(-200);
  storeSet('tombstones', all);
}
function isTombstoned(kind, id) {
  if (id == null) return false;
  return getTombstones(kind).some(t => t.id === String(id));
}

// ─── Templates de campanha ─────────────────────────────────────────────
// Guardam o layout (floors+zones) para reutilizar em campanhas recorrentes
function listTemplates() {
  return storeGet('templates', []);
}
function saveTemplate(name, floors) {
  const list = listTemplates();
  const tpl = {
    id: 'tpl-' + Date.now(),
    name: String(name || 'Sem nome'),
    floors: layoutOnly(floors || []),
    createdAt: new Date().toISOString(),
  };
  list.unshift(tpl);
  storeSet('templates', list.slice(0, 50)); // cap at 50
  return tpl;
}
function deleteTemplate(id) {
  storeSet('templates', listTemplates().filter(t => t.id !== id));
}
function storeListWithPrefix(prefix) {
  if (typeof localStorage === 'undefined') return [];
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORE_PREFIX + prefix)) out.push(k.slice(STORE_PREFIX.length));
  }
  return out;
}

// useStoredState — same shape as useState but persists value under storage key
// Read once at mount, write on every change. Use for filters, sort, page size, etc.
function useStoredState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const stored = storeGet(`ui:${key}`, undefined);
    return stored === undefined ? defaultValue : stored;
  });
  useEffect(() => {
    storeSet(`ui:${key}`, value);
  }, [key, value]);
  return [value, setValue];
}

// ─────────────────────────────────────────────────────────────────────────
// IndexedDB — stores large objects (campaign rows: each ~9MB)
// localStorage maxes out at ~5MB total, so campaign rows go here instead.
// Schema:
//   v1: "campaigns" store (keyed by campaign.key) — Excel uploads
//   v2: + "periods" store (keyed by id) — campaign planning entities
//        + "zone_memory" store (keyed by ean) — remembers where each EAN was assigned
// ─────────────────────────────────────────────────────────────────────────
const IDB_NAME = 'dd_app';
const IDB_VERSION = 2;
const IDB_STORE = 'campaigns';
const IDB_STORE_PERIODS = 'periods';
const IDB_STORE_MEMORY = 'zone_memory';

let _idbPromise = null;
function idbOpen() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('No IndexedDB'));
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_PERIODS)) {
        db.createObjectStore(IDB_STORE_PERIODS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_MEMORY)) {
        db.createObjectStore(IDB_STORE_MEMORY, { keyPath: 'ean' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idbPromise;
}

async function idbPut(item) {
  if (CLOUD_ONLY) return; // skip IDB writes in cloud-only mode
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll() {
  if (CLOUD_ONLY) return [];
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear() {
  return new Promise(resolve => {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = resolve;
    req.onerror = resolve;
    req.onblocked = resolve;
  });
}

async function idbDelete(key) {
  if (CLOUD_ONLY) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Periods store (campaign planning entities) ─────────────────────────
async function idbPutPeriod(p) {
  if (CLOUD_ONLY) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PERIODS, 'readwrite');
    tx.objectStore(IDB_STORE_PERIODS).put(p);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAllPeriods() {
  if (CLOUD_ONLY) return [];
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PERIODS, 'readonly');
    const req = tx.objectStore(IDB_STORE_PERIODS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDeletePeriod(id) {
  if (CLOUD_ONLY) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PERIODS, 'readwrite');
    tx.objectStore(IDB_STORE_PERIODS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Zone memory store (EAN → last assigned zone) ──────────────────────
// Records: { ean, zoneId, zoneName, floorId, floorName, lastSeen, timesUsed }
async function idbPutMemory(item) {
  if (CLOUD_ONLY) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_MEMORY, 'readwrite');
    tx.objectStore(IDB_STORE_MEMORY).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAllMemory() {
  if (CLOUD_ONLY) return [];
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_MEMORY, 'readonly');
    const req = tx.objectStore(IDB_STORE_MEMORY).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbBulkPutMemory(items) {
  if (CLOUD_ONLY) return;
  if (!items || !items.length) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_MEMORY, 'readwrite');
    const store = tx.objectStore(IDB_STORE_MEMORY);
    items.forEach(it => store.put(it));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Cloud sync (Supabase) — talks to user_data table
// Schema: { user_id, notes, default_layout, preferences, updated_at }
// ─────────────────────────────────────────────────────────────────────────

// Fetch the user's row (returns null if no row exists yet)
async function cloudFetchUserData(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('notes, default_layout, preferences, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Cloud fetch failed:', error.message);
    return null;
  }
  return data;
}

// Upsert (insert or update) the user's row
async function cloudUpsertUserData(userId, patch) {
  if (!supabase || !userId) return { ok: false, error: 'no-client' };
  const payload = { user_id: userId, ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('user_data')
    .upsert(payload, { onConflict: 'user_id' });
  if (error) {
    console.warn('Cloud upsert failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Debounce helper — delays calling fn until ms have passed without new calls
function debounce(fn, ms = 600) {
  let timer = null;
  let lastArgs = null;
  const debounced = (...args) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...lastArgs); }, ms);
  };
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      fn(...lastArgs);
    }
  };
  debounced.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────
// App version metadata — bumped manually on each release
// Shown in sidebar footer so users know which build is live
// ─────────────────────────────────────────────────────────────────────────
const APP_VERSION = '3.9.3';
const APP_BUILD_DATE = '2026-05-09T00:00';

// Families excluded from the entire app by default (Produtos Editoriais + Serviços).
// Admins can re-enable them in the Config tab.
const DEFAULT_EXCLUDED_FAMILIES = [
  'JOGOS', 'PAPELARIA', 'DISCOS', 'VÍDEOS', 'VIDEO', 'VIDEOS', 'VÍDEO',
  'INSTRUMENTOS MUSICAIS', 'LIVROS', 'SERVIÇOS',
];

const APP_CHANGELOG = [
  { version: '3.9.3', date: '2026-05-09', summary: 'Fix: Inventário carrega descrições dos produtos (hidratação lazy das rows); skeleton no carregamento de campanhas' },
  { version: '3.1.0', date: '2026-05-06', summary: 'Fix: carregamento de campanhas em 2 fases reais (SELECT sem rows + fetch separado); novo Inventário com leitura de códigos de barras por câmara ou leitor' },
  { version: '3.0.3', date: '2026-05-06', summary: 'Plano/Saída: PO2 e PO3 preenchidos automaticamente por EAN; Saída usa lookup dinâmico de stock; auto-preenchimento também grava PO2/PO3' },
  { version: '3.0.2', date: '2026-05-06', summary: 'Fix: famílias excluídas aplicadas também no auto-preenchimento, listagem de zonas, alterações de preço e stock' },
  { version: '3.0.1', date: '2026-05-06', summary: 'Famílias excluídas globalmente (Produtos Editoriais + Serviços): configurável no admin' },
  { version: '3.0.0', date: '2026-05-06', summary: 'Fix: campanhas aparecem todas ao mesmo tempo — fetch de metadados separado das rows comprimidas; hydratação das rows em background por campanha' },
  { version: '2.9.9', date: '2026-05-06', summary: 'Plano: EAN+descrição+família gravados no slot (independente do Excel). AutoFill: alocação e restrição de famílias/subfamílias por móvel' },
  { version: '2.9.8', date: '2026-05-06', summary: 'Alterações: filtro por família, botão "Sem alterações" na barra de filtros, artigos sem alterações na tabela e no CSV' },
  { version: '2.9.3', date: '2026-05-05', summary: 'Fix: períodos "Importadas" duplicados removidos automaticamente; migração de orphans só corre após cloud sync' },
  { version: '2.9.2', date: '2026-05-05', summary: 'Fix: status de campanha já não fica sempre "Planeada" — statusOverride guardado como null na cloud em vez de "planned" por defeito' },
  { version: '2.9.1', date: '2026-05-05', summary: 'Fix: datas de campanha já não revertem — sincronização inicial usa estado atual em vez de closure stale' },
  { version: '2.9.0', date: '2026-05-05', summary: 'Correções: crash ZonePicker, notificações navegam para o período correto, reordenar campanhas persiste, aceitar/rejeitar sugestões em massa, sem confirm() nativos' },
  { version: '2.8.0', date: '2026-05-05', summary: 'Alterações de preços: comparação dupla entre períodos/campanhas do sistema, sem necessidade de upload de Excel' },
  { version: '2.7.0', date: '2026-05-04', summary: 'Cartazes, notificações de fim de campanha, email queue, indicador de versão' },
  { version: '2.6.0', date: '2026-05-04', summary: 'Painel de admin completo: utilizadores, atividade, configuração de menus' },
  { version: '2.5.0', date: '2026-05-04', summary: 'Campanhas planeadas (períodos), múltiplos Excels, memória de zonas' },
  { version: '2.4.0', date: '2026-05-04', summary: 'Sincronização cloud de notas e zonas' },
  { version: '2.3.0', date: '2026-05-03', summary: 'Autenticação Supabase, login real com email' },
  { version: '2.2.0', date: '2026-05-03', summary: 'Blueprint da loja, vista geral de móveis' },
  { version: '2.1.0', date: '2026-05-03', summary: 'Bloco de notas, filtros persistentes, stock nas alterações' },
  { version: '2.0.0', date: '2026-05-03', summary: 'Editor de folhetos, tema FNAC, alterações de campanha' },
];

// ─────────────────────────────────────────────────────────────────────────
// Admin / Profiles / Activity log — Supabase helpers
// ─────────────────────────────────────────────────────────────────────────

// The hardcoded super-admin email — bootstrap fallback
const SUPER_ADMIN_EMAIL = 'david.dinis@pt.fnac.com';

// Check if a user is admin (queries admins table)
async function checkIsAdmin(userId, email) {
  if (!supabase || !userId) return false;
  // First try DB lookup
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!error && data) return true;
  // Fallback: if email matches the hardcoded super-admin, auto-promote
  if (email && email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    // Try inserting (will succeed only if no admins exist OR via service-side bootstrap;
    // if RLS blocks, that's OK — return true anyway since email matches)
    try {
      await supabase.from('admins').insert({ user_id: userId, email });
    } catch {}
    return true;
  }
  return false;
}

// Upsert a user profile (called on login)
async function upsertUserProfile(userId, email, patch = {}) {
  if (!supabase || !userId) return null;
  const payload = {
    user_id: userId,
    email,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...patch,
  };
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle();
  if (error) {
    console.warn('Profile upsert failed:', error.message);
    return null;
  }
  return data;
}

// Update last_seen_at for the current user (called periodically)
async function pingUserPresence(userId) {
  if (!supabase || !userId) return;
  await supabase
    .from('user_profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId);
}

// Fetch all user profiles (admin only — RLS enforces this)
async function fetchAllProfiles() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('last_seen_at', { ascending: false, nullsFirst: false });
  if (error) {
    console.warn('Fetch profiles failed:', error.message);
    return [];
  }
  return data || [];
}

// Fetch all admins
async function fetchAllAdmins() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('admins')
    .select('*');
  if (error) return [];
  return data || [];
}

// Grant admin to a user
async function grantAdmin(userId, email, granterId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('admins')
    .insert({ user_id: userId, email, granted_by: granterId });
  return { ok: !error, error: error?.message };
}

// Revoke admin from a user
async function revokeAdmin(userId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('user_id', userId);
  return { ok: !error, error: error?.message };
}

// Suspend / unsuspend a user (admin action)
async function setUserSuspended(userId, suspended) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('user_profiles')
    .update({ suspended, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  return { ok: !error, error: error?.message };
}

// ─── Realtime presence ─────────────────────────────────────────────────
// Hook: tracks who is currently viewing a given resource (e.g. a period or
// campaign). Returns a deduped array of { user_id, email, online_at }.
// channelKey should be a stable string per resource (eg `period:${id}`).
function usePresence(channelKey, currentUser) {
  const [peers, setPeers] = useState([]);
  useEffect(() => {
    if (!supabase || !channelKey || !currentUser?.id) return;
    const channel = supabase.channel(`presence:${channelKey}`, {
      config: { presence: { key: currentUser.id } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const all = [];
        for (const [userId, metas] of Object.entries(state)) {
          if (metas[0]) all.push({ user_id: userId, ...metas[0] });
        }
        setPeers(all);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            email: currentUser.email,
            online_at: new Date().toISOString(),
          });
        }
      });
    return () => { channel.unsubscribe(); };
  }, [channelKey, currentUser?.id, currentUser?.email]);
  return peers;
}

// ─── Activity log ──────────────────────────────────────────────────────
// Record an action the user just performed. Best-effort; don't block on errors.
async function logActivity({ userId, userEmail, action, resourceType, resourceId, resourceName, metadata }) {
  if (!supabase || !userId) return;
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      user_email: userEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      resource_name: resourceName || null,
      metadata: metadata || {},
    });
  } catch (err) {
    console.warn('Activity log failed:', err);
  }
}

// Fetch activity for a specific resource (campaign/period)
async function fetchActivityForResource(resourceType, resourceId, { limit = 50 } = {}) {
  if (!supabase || !resourceId) return [];
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('Fetch resource activity failed:', error.message);
    return [];
  }
  return data || [];
}

// Fetch recent activity (admin sees all, users see their own — enforced by RLS)
async function fetchActivityLog({ limit = 200, sinceDays = 30 } = {}) {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('Fetch activity failed:', error.message);
    return [];
  }
  return data || [];
}

// Mark an activity entry as reverted
async function markActivityReverted(activityId, reverterId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('activity_log')
    .update({
      reverted: true,
      reverted_at: new Date().toISOString(),
      reverted_by: reverterId,
    })
    .eq('id', activityId);
  return { ok: !error, error: error?.message };
}

// ─── UI Config (menu visibility) ──────────────────────────────────────
// Default menu config — all visible
const DEFAULT_MENU_VISIBILITY = {
  dashboard: { roles: ['user', 'manager', 'viewer'], visible: true },
  sales: { roles: ['user', 'manager'], visible: true },
  campaigns: { roles: ['user', 'manager', 'viewer'], visible: true },
  calendar: { roles: ['user', 'manager', 'viewer'], visible: true },
  changes: { roles: ['user', 'manager'], visible: true },
  stock: { roles: ['user', 'manager'], visible: true },
  inventory: { roles: ['user', 'manager', 'viewer'], visible: true },
  images: { roles: ['user', 'manager'], visible: true },
  pdfs: { roles: ['user', 'manager'], visible: true },
  notes: { roles: ['user', 'manager', 'viewer'], visible: true },
  scanner: { visible: true, roles: ['user', 'manager', 'viewer'] },
};

async function fetchUIConfig() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ui_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function saveUIConfig(menuVisibility, updaterId, globalSettings) {
  if (!supabase) return { ok: false };
  const payload = {
    id: 1,
    menu_visibility: menuVisibility,
    updated_at: new Date().toISOString(),
    updated_by: updaterId,
  };
  if (globalSettings) payload.global_settings = globalSettings;
  const { error } = await supabase
    .from('ui_config')
    .upsert(payload);
  return { ok: !error, error: error?.message };
}

// Decide if a user (with given role + admin status) can see a menu item
function canSeeMenuItem(menuId, userRole, isAdmin, uiConfig) {
  if (isAdmin) return true; // admins always see everything
  const config = uiConfig?.menu_visibility?.[menuId];
  if (!config) {
    // No config → fall back to defaults
    const def = DEFAULT_MENU_VISIBILITY[menuId];
    return def ? (def.visible && def.roles.includes(userRole || 'user')) : true;
  }
  if (!config.visible) return false;
  if (Array.isArray(config.roles) && config.roles.length > 0) {
    return config.roles.includes(userRole || 'user');
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// Poster zones — admin-managed list of physical zones for posters
// ─────────────────────────────────────────────────────────────────────────
async function fetchPosterZones() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('poster_zones')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function createPosterZone({ name, description, displayOrder, createdBy }) {
  if (!supabase) return { ok: false };
  const { data, error } = await supabase
    .from('poster_zones')
    .insert({ name, description, display_order: displayOrder || 0, created_by: createdBy })
    .select()
    .single();
  return { ok: !error, data, error: error?.message };
}

async function updatePosterZone(id, patch) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('poster_zones')
    .update(patch)
    .eq('id', id);
  return { ok: !error, error: error?.message };
}

async function deletePosterZone(id) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('poster_zones')
    .delete()
    .eq('id', id);
  return { ok: !error, error: error?.message };
}

// ─────────────────────────────────────────────────────────────────────────
// Posters — registered campaign posters
// ─────────────────────────────────────────────────────────────────────────
async function fetchPostersForPeriod(periodId) {
  if (!supabase || !periodId) return [];
  const { data, error } = await supabase
    .from('campaign_posters')
    .select('*')
    .eq('period_id', periodId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

async function fetchAllActivePosters() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('campaign_posters')
    .select('*')
    .neq('status', 'removed')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

async function createPoster({ periodId, format, quantity, zoneId, zoneLabel, status, notes, createdBy }) {
  if (!supabase) return { ok: false };
  const payload = {
    period_id: periodId,
    format, quantity: Number(quantity) || 1,
    zone_id: zoneId || null, zone_label: zoneLabel || null,
    status: status || 'pending', notes: notes || null,
    created_by: createdBy,
  };
  const { data, error } = await supabase
    .from('campaign_posters')
    .insert(payload)
    .select()
    .single();
  return { ok: !error, data, error: error?.message };
}

async function updatePosterStatus(posterId, newStatus, userId) {
  if (!supabase) return { ok: false };
  const patch = { status: newStatus, updated_at: new Date().toISOString() };
  if (newStatus === 'posted') {
    patch.posted_at = new Date().toISOString();
    patch.posted_by = userId;
  } else if (newStatus === 'removed') {
    patch.removed_at = new Date().toISOString();
    patch.removed_by = userId;
  }
  const { error } = await supabase
    .from('campaign_posters')
    .update(patch)
    .eq('id', posterId);
  return { ok: !error, error: error?.message };
}

async function updatePoster(posterId, patch) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('campaign_posters')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', posterId);
  return { ok: !error, error: error?.message };
}

async function deletePoster(posterId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('campaign_posters')
    .delete()
    .eq('id', posterId);
  return { ok: !error, error: error?.message };
}

// ─────────────────────────────────────────────────────────────────────────
// Notifications — compute alerts about ending campaigns
// ─────────────────────────────────────────────────────────────────────────

// Default warning thresholds (days before end). Configurable via ui_config.
const DEFAULT_WARN_DAYS = [2, 0]; // 2 days before and on the day itself

// Compute notifications for a user from the loaded data
// Returns: [{ kind, key, periodId, periodName, daysLeft, postersToRemove, severity }]
function computeNotifications(periods, posters, dismissals, warnDays = DEFAULT_WARN_DAYS) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = 24 * 60 * 60 * 1000;
  const dismissedKeys = new Set((dismissals || []).map(d => d.notification_key));

  // Index posters by period
  const postersByPeriod = new Map();
  (posters || []).forEach(p => {
    if (!postersByPeriod.has(p.period_id)) postersByPeriod.set(p.period_id, []);
    postersByPeriod.get(p.period_id).push(p);
  });

  (periods || []).forEach(period => {
    if (!period.endDate) return; // no end date → no alert possible
    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((end.getTime() - today.getTime()) / ms);

    const periodPosters = postersByPeriod.get(period.id) || [];
    const activePosters = periodPosters.filter(p => p.status !== 'removed');
    const postersToRemoveCount = activePosters.reduce((s, p) => s + (p.quantity || 1), 0);

    // Warning: campaign ending in N days
    warnDays.forEach(d => {
      if (daysLeft === d && daysLeft >= 0) {
        const key = `period_ending:${period.id}:${end.toISOString().slice(0, 10)}:d${d}`;
        if (!dismissedKeys.has(key)) {
          out.push({
            kind: 'period_ending',
            key,
            periodId: period.id,
            periodName: period.name,
            daysLeft,
            endDate: period.endDate,
            postersToRemove: postersToRemoveCount,
            hasPosters: activePosters.length > 0,
            severity: daysLeft === 0 ? 'high' : 'medium',
          });
        }
      }
    });

    // Past-end with active posters — high severity, always shown
    if (daysLeft < 0 && activePosters.length > 0) {
      const key = `period_overdue:${period.id}:${end.toISOString().slice(0, 10)}`;
      if (!dismissedKeys.has(key)) {
        out.push({
          kind: 'period_overdue',
          key,
          periodId: period.id,
          periodName: period.name,
          daysLeft,
          endDate: period.endDate,
          postersToRemove: postersToRemoveCount,
          hasPosters: true,
          severity: 'high',
        });
      }
    }
  });

  // Sort by severity then daysLeft (overdue first, then today, then upcoming)
  out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return a.daysLeft - b.daysLeft;
  });
  return out;
}

async function fetchDismissals(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('notification_dismissals')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return data || [];
}

async function dismissNotification(userId, key) {
  if (!supabase || !userId) return { ok: false };
  const { error } = await supabase
    .from('notification_dismissals')
    .upsert({ user_id: userId, notification_key: key, dismissed_at: new Date().toISOString() }, { onConflict: 'user_id,notification_key' });
  return { ok: !error, error: error?.message };
}

// ─────────────────────────────────────────────────────────────────────────
// Email queue helpers
// ─────────────────────────────────────────────────────────────────────────

async function queueEmail({ toEmail, toUserId, subject, bodyHtml, bodyText, category, periodId }) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('email_queue')
    .insert({
      to_email: toEmail,
      to_user_id: toUserId || null,
      subject, body_html: bodyHtml, body_text: bodyText,
      category, related_period_id: periodId || null,
    });
  return { ok: !error, error: error?.message };
}

async function fetchEmailQueue({ status = 'pending', limit = 100 } = {}) {
  if (!supabase) return [];
  const q = supabase.from('email_queue').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status !== 'all') q.eq('status', status);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

async function markEmailSent(emailId) {
  if (!supabase) return;
  await supabase.from('email_queue').update({
    status: 'sent', sent_at: new Date().toISOString(),
  }).eq('id', emailId);
}

async function markEmailSkipped(emailId) {
  if (!supabase) return;
  await supabase.from('email_queue').update({ status: 'skipped' }).eq('id', emailId);
}

// Build email content for a "campaign ending" alert
function buildCampaignEndingEmail(period, postersToRemove, daysLeft) {
  const dateStr = new Date(period.endDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  const urgency = daysLeft === 0 ? 'HOJE' : `em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
  const subject = daysLeft === 0
    ? `[FNAC Aveiro] HOJE: Retirar cartazes — Campanha "${period.name}"`
    : `[FNAC Aveiro] Campanha "${period.name}" termina em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
  const bodyText = [
    `Aviso de fim de campanha — FNAC Aveiro`,
    ``,
    `A campanha "${period.name}" termina ${urgency} (${dateStr}).`,
    ``,
    postersToRemove > 0
      ? `Há ${postersToRemove} ${postersToRemove === 1 ? 'cartaz' : 'cartazes'} ainda afixados que precisam de ser retirados.`
      : `Não há cartazes registados para retirar nesta campanha.`,
    ``,
    `Acede à app para ver os detalhes e marcar os cartazes como removidos:`,
    typeof window !== 'undefined' ? window.location.origin : 'https://david-dinis-app.vercel.app',
    ``,
    `— Sistema David Dinis · Gestão de Campanhas`,
  ].join('\n');
  const bodyHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222;">
    <div style="border-left:3px solid #E68A00;padding-left:14px;margin-bottom:18px;">
      <div style="font-size:11px;letter-spacing:2px;color:#888;text-transform:uppercase;">FNAC Aveiro</div>
      <h2 style="margin:4px 0 0;font-size:22px;">Campanha a terminar ${urgency.toLowerCase()}</h2>
    </div>
    <p>A campanha <strong>${escapeHtml(period.name)}</strong> termina ${urgency.toLowerCase()} (${dateStr}).</p>
    ${postersToRemove > 0 ? `<p style="background:#FFF5E6;padding:12px;border-radius:6px;border-left:3px solid #E68A00;">
      <strong>${postersToRemove} ${postersToRemove === 1 ? 'cartaz' : 'cartazes'} ainda afixados.</strong> Estes cartazes precisam de ser retirados ${urgency.toLowerCase()}.
    </p>` : `<p style="color:#888;">Sem cartazes registados nesta campanha.</p>`}
    <p style="margin-top:24px;">
      <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://david-dinis-app.vercel.app'}" style="background:#1a1a1a;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;display:inline-block;">Abrir App</a>
    </p>
    <hr style="margin:32px 0 12px;border:none;border-top:1px solid #eee;">
    <p style="font-size:11px;color:#999;">David Dinis · Gestão de Campanhas FNAC Aveiro</p>
  </body></html>`;
  return { subject, bodyText, bodyHtml };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ─────────────────────────────────────────────────────────────────────────
// Shared periods (cloud-backed) — read by everyone, write by owner/admin
// ─────────────────────────────────────────────────────────────────────────
// ─── Period notes JSON envelope ────────────────────────────────────────
// We piggy-back on the existing `notes` text column in Supabase to also
// store the period's `floors` (the plan). Backward compatible: legacy
// plain-text notes still work.
function decodePeriodNotes(raw) {
  if (!raw) return { userNotes: '', floors: null };
  if (typeof raw !== 'string') return { userNotes: '', floors: null };
  // Detect JSON envelope (starts with `{` and has the version marker)
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && '__dd_v' in parsed) {
        return {
          userNotes: typeof parsed.userNotes === 'string' ? parsed.userNotes : '',
          floors: Array.isArray(parsed.floors) ? parsed.floors : null,
        };
      }
    } catch {}
  }
  return { userNotes: raw, floors: null };
}
function encodePeriodNotes({ userNotes, floors }) {
  // If no floors and userNotes is plain, store as plain text for readability
  if (!floors && (!userNotes || !userNotes.trim().startsWith('{'))) {
    return userNotes || '';
  }
  return JSON.stringify({ __dd_v: 1, userNotes: userNotes || '', floors: floors || null });
}

async function cloudFetchAllPeriods() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('cloudFetchAllPeriods failed:', error.message);
    return [];
  }
  // Normalize: map snake_case columns from DB to camelCase used in UI.
  // Also decode the JSON envelope in `notes` to extract `floors` (the period plan).
  return (data || []).map(p => {
    const { userNotes, floors } = decodePeriodNotes(p.notes);
    return {
      id: p.id,
      name: p.name,
      startDate: p.start_date,
      endDate: p.end_date,
      notes: userNotes,
      floors: floors, // null if not yet set — falls back to defaultLayout / migrate from oldest campaign
      statusOverride: (p.status && p.status !== 'planned') ? p.status : null,
      has_posters: p.has_posters || false,
      hidden: p.hidden || false,
      user_id: p.user_id,
      created_by: p.created_by || p.user_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });
}

async function cloudUpsertPeriod(period, userId) {
  if (!supabase) return { ok: false };
  // Reject non-UUID ids — DB requires UUID
  if (!isUUID(period.id)) {
    return { ok: false, error: `Período tem id inválido (não-UUID): ${period.id}` };
  }
  const payload = {
    id: period.id,
    user_id: period.user_id || userId,
    created_by: period.created_by || userId,
    name: period.name,
    start_date: period.startDate || null,
    end_date: period.endDate || null,
    // Encode user notes + floors plan together so we don't need a schema change.
    notes: encodePeriodNotes({ userNotes: period.notes || '', floors: period.floors || null }),
    status: period.statusOverride || null,
    has_posters: period.has_posters || false,
    hidden: period.hidden || false,
    updated_at: new Date().toISOString(),
  };
  // Upsert: insert or update on conflict with id (primary key)
  const { error: upsertErr } = await supabase
    .from('periods')
    .upsert(payload, { onConflict: 'id' });
  if (!upsertErr) return { ok: true };

  // Fallback: try plain update if upsert fails (e.g. missing onConflict constraint)
  const { error: updErr } = await supabase
    .from('periods')
    .update(payload)
    .eq('id', payload.id);
  if (!updErr) return { ok: true };

  // Last resort: insert
  const { error: insErr } = await supabase.from('periods').insert(payload);
  return { ok: !insErr, error: insErr?.message };
}

async function cloudDeletePeriod(periodId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase.from('periods').delete().eq('id', periodId);
  return { ok: !error, error: error?.message };
}

async function cloudSetPeriodHidden(periodId, hidden) {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from('periods')
    .update({ hidden, updated_at: new Date().toISOString() })
    .eq('id', periodId);
  return { ok: !error, error: error?.message };
}

// ─────────────────────────────────────────────────────────────────────────
// Shared campaigns (Excels) — JSONB rows in 'campaigns' table
// ─────────────────────────────────────────────────────────────────────────
// Light fetch: metadata + headers only (no rows). Fast — no large blobs.
// Returns campaign shells with rows:[], rowsNeedHydration:true when compressed.
async function cloudFetchAllCampaignsMeta() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, user_id, period_id, campaign_key, name, headers, floors, floors_compressed, uploaded_at, updated_at, created_by, updated_by')
    .order('updated_at', { ascending: false });
  if (error) {
    console.warn('cloudFetchAllCampaigns (meta) failed:', error.message);
    return [];
  }
  const campaigns = await Promise.all((data || []).map(async (c) => {
    let floors = c.floors;
    if (!floors && c.floors_compressed) floors = await gunzipJSON(c.floors_compressed);
    return {
      id: c.id,
      user_id: c.user_id,
      periodId: c.period_id,
      key: c.campaign_key,
      name: c.name,
      headers: c.headers || [],
      rows: [],          // empty until hydrated
      itemCount: -1,     // -1 = rows not yet loaded
      _needsRows: true,  // flag for phase 2
      floors,
      uploaded: c.uploaded_at ? new Date(c.uploaded_at) : new Date(),
      created_by: c.created_by,
      updated_by: c.updated_by,
      updatedAt: c.updated_at,
    };
  }));
  return campaigns;
}

// Fetch rows for specific campaign IDs (used in background hydration)
async function cloudFetchCampaignRows(ids) {
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, rows, rows_compressed')
    .in('id', ids);
  if (error) { console.warn('cloudFetchCampaignRows failed:', error.message); return []; }
  return Promise.all((data || []).map(async (c) => {
    let rows = c.rows && c.rows.length > 0 ? c.rows : null;
    if (!rows && c.rows_compressed) rows = await gunzipJSON(c.rows_compressed);
    return { id: c.id, rows: rows || [], itemCount: (rows || []).length };
  }));
}

// Full fetch kept for periodic refresh
async function cloudFetchAllCampaigns() {
  const meta = await cloudFetchAllCampaignsMeta();
  const hydrated = await cloudFetchCampaignRows(meta.map(c => c.id));
  const rowsById = new Map(hydrated.map(h => [h.id, h]));
  return meta.map(c => {
    const r = rowsById.get(c.id);
    return r ? { ...c, rows: r.rows, itemCount: r.itemCount, _needsRows: false } : c;
  });
}

async function cloudUpsertCampaign(campaign, userId) {
  if (!supabase) return { ok: false };
  // Validate periodId is UUID or null
  const periodId = (campaign.periodId && isUUID(campaign.periodId)) ? campaign.periodId : null;

  // Compress large fields
  const rows = campaign.rows || [];
  const rowsJson = JSON.stringify(rows);
  const compressRows = rowsJson.length > 200 * 1024; // > 200 KB → compress
  const floorsJson = JSON.stringify(campaign.floors || null);
  const compressFloors = floorsJson.length > 50 * 1024;

  const rowsCompressed = compressRows ? await gzipJSON(rows) : null;
  const floorsCompressed = compressFloors ? await gzipJSON(campaign.floors) : null;

  if (compressRows || compressFloors) {
    console.log(`[campaign-upload] ${campaign.name}: rows ${(rowsJson.length / 1024).toFixed(0)} KB${compressRows ? ` → ${(rowsCompressed.compressedLength / 1024).toFixed(0)} KB compressed` : ''}, floors ${(floorsJson.length / 1024).toFixed(0)} KB${compressFloors ? ` → compressed` : ''}`);
  }

  const payload = {
    user_id: campaign.user_id || userId,
    period_id: periodId,
    campaign_key: campaign.key,
    name: campaign.name,
    headers: campaign.headers || [],
    // If compressed, send empty array in original column to save space
    rows: compressRows ? [] : rows,
    rows_compressed: rowsCompressed,
    floors: compressFloors ? null : campaign.floors,
    floors_compressed: floorsCompressed,
    uploaded_at: campaign.uploaded ? campaign.uploaded.toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
  // If campaign already has a UUID id (was previously synced from cloud), use it
  if (campaign.id && isUUID(campaign.id)) {
    payload.id = campaign.id;
  } else {
    payload.created_by = userId;
  }

  // Strategy: try update-first, then insert if no row was updated.
  // Avoids relying on a unique constraint that may not exist.
  if (payload.id) {
    // Has UUID — try update by id
    const { data: updData, error: updErr } = await supabase
      .from('campaigns')
      .update(payload)
      .eq('id', payload.id)
      .select()
      .maybeSingle();
    if (!updErr && updData) return { ok: true, data: updData };
  }

  // Try update by (user_id, campaign_key)
  const { data: existingByKey } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', payload.user_id)
    .eq('campaign_key', payload.campaign_key)
    .maybeSingle();

  if (existingByKey?.id) {
    // Update by existing id
    const { data, error } = await supabase
      .from('campaigns')
      .update(payload)
      .eq('id', existingByKey.id)
      .select()
      .maybeSingle();
    return { ok: !error, data, error: error?.message };
  }

  // Insert
  const insertPayload = { ...payload };
  if (!insertPayload.id) delete insertPayload.id; // let DB generate UUID
  const { data, error } = await supabase
    .from('campaigns')
    .insert(insertPayload)
    .select()
    .single();
  return { ok: !error, data, error: error?.message };
}

async function cloudDeleteCampaign(campaignId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
  return { ok: !error, error: error?.message };
}

// ─────────────────────────────────────────────────────────────────────────
// Merge helpers — combine local + cloud lists without losing data
// Strategy: union by id; when both have same id, keep the most recently updated.
// ─────────────────────────────────────────────────────────────────────────
function mergePeriods(localList, cloudList) {
  const map = new Map();
  // Start with local — exclude tombstoned ids
  for (const p of (localList || [])) {
    if (p.id && !isTombstoned('period', p.id)) map.set(p.id, p);
  }
  // Overlay cloud, preferring more recent — exclude tombstoned ids
  for (const cp of (cloudList || [])) {
    if (!cp.id || isTombstoned('period', cp.id)) continue;
    const local = map.get(cp.id);
    if (!local) {
      map.set(cp.id, cp);
    } else {
      // Compare updatedAt — keep most recent
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const cloudTime = cp.updatedAt ? new Date(cp.updatedAt).getTime() : 0;
      // Prefer cloud if newer, but always preserve has_posters/hidden from cloud
      // (they were set by admin)
      if (cloudTime >= localTime) {
        map.set(cp.id, { ...local, ...cp });
      } else {
        // Local is newer — but still bring in cloud-only metadata
        map.set(cp.id, {
          ...cp, ...local,
          // Cloud has authoritative admin flags
          hidden: cp.hidden ?? local.hidden,
          has_posters: cp.has_posters ?? local.has_posters,
        });
      }
    }
  }
  return Array.from(map.values());
}

function mergeCampaigns(localList, cloudList) {
  const map = new Map();
  // Filter out tombstoned ids — items the user just deleted shouldn't resurrect
  const filteredLocal = (localList || []).filter(c => !isTombstoned('campaign', c.id));
  const filteredCloud = (cloudList || []).filter(c => !isTombstoned('campaign', c.id));
  // Use a composite key (user_id + campaign_key) for duplicates from different sources
  // but campaigns also have `id` — prefer id when available
  const keyOf = (c) => c.id ? `id:${c.id}` : `key:${c.user_id || ''}:${c.key || ''}`;

  for (const c of filteredLocal) {
    map.set(keyOf(c), c);
  }
  for (const cc of filteredCloud) {
    const k = keyOf(cc);
    const local = map.get(k);
    // Helper: given a merged object, restore rows/itemCount from local when cloud has none
    const restoreRows = (merged, src) => {
      if (merged._needsRows && src.rows && src.rows.length > 0) {
        merged.rows = src.rows;
        merged.itemCount = src.itemCount ?? src.rows.length;
        merged._needsRows = false;
      }
      return merged;
    };

    if (!local) {
      // Also check by campaign_key in case local had different id
      const altKey = `key:${cc.user_id || ''}:${cc.key || ''}`;
      const localByKey = map.get(altKey);
      if (localByKey && altKey !== k) {
        // Same campaign, different id — prefer cloud version (it has cloud id)
        map.delete(altKey);
        map.set(k, restoreRows({ ...localByKey, ...cc }, localByKey));
      } else {
        map.set(k, cc);
      }
    } else {
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : (local.uploaded ? local.uploaded.getTime() : 0);
      const cloudTime = cc.updatedAt ? new Date(cc.updatedAt).getTime() : 0;
      if (cloudTime >= localTime) {
        map.set(k, restoreRows({ ...local, ...cc }, local));
      } else {
        map.set(k, restoreRows({ ...cc, ...local }, local));
      }
    }
  }
  const merged = Array.from(map.values());
  // Sort within each period by sortOrder if available, preserving relative order otherwise
  const byPeriod = new Map();
  const noPeriod = [];
  for (const c of merged) {
    if (c.periodId) {
      if (!byPeriod.has(c.periodId)) byPeriod.set(c.periodId, []);
      byPeriod.get(c.periodId).push(c);
    } else {
      noPeriod.push(c);
    }
  }
  const sorted = [];
  for (const [, list] of byPeriod) {
    list.sort((a, b) => {
      const sa = a.sortOrder ?? 9999;
      const sb = b.sortOrder ?? 9999;
      return sa !== sb ? sa - sb : (a.uploaded || 0) - (b.uploaded || 0);
    });
    sorted.push(...list);
  }
  sorted.push(...noPeriod);
  return sorted;
}

// ─────────────────────────────────────────────────────────────────────────
// Stock snapshots (PO2 / PO3) — shared with last-5 history
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Compression helpers — gzip via browser native CompressionStream
// Used for large payloads (stock snapshots, campaign rows) to avoid
// PostgREST timeout (8s) when inserting JSONB > ~5MB
// ─────────────────────────────────────────────────────────────────────────

async function gzipString(s) {
  if (typeof CompressionStream === 'undefined') {
    // Fallback: no compression available, return as base64 marker
    return { compressed: false, data: s };
  }
  try {
    const bytes = new TextEncoder().encode(s);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressedBuf = await new Response(stream).arrayBuffer();
    // Convert ArrayBuffer to base64 (chunked to avoid stack overflow on large arrays)
    const u8 = new Uint8Array(compressedBuf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return { compressed: true, data: btoa(binary), originalLength: bytes.length, compressedLength: u8.length };
  } catch (err) {
    console.warn('gzipString failed:', err);
    return { compressed: false, data: s };
  }
}

async function gunzipString(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload; // backward compat: uncompressed string
  if (!payload.compressed) return payload.data;
  if (typeof DecompressionStream === 'undefined') return payload.data;
  try {
    // base64 → Uint8Array
    const binary = atob(payload.data);
    const u8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
    const decompressed = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch (err) {
    console.warn('gunzipString failed:', err);
    return '';
  }
}

// Convenience: encode/decode a JSON-serializable value with gzip
async function gzipJSON(value) {
  return gzipString(JSON.stringify(value));
}

async function gunzipJSON(payload) {
  const s = await gunzipString(payload);
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────
// Price-changes snapshot — persisted in user_data.preferences so it survives
// page reloads and device switches. Rows are gzip-compressed like campaigns.
// ─────────────────────────────────────────────────────────────────────────
async function cloudSavePriceSnapshot(userId, snapshot) {
  if (!supabase || !userId || !snapshot) return { ok: false };
  try {
    const compressed = await gzipJSON(snapshot.rows);
    const meta = {
      filename: snapshot.filename,
      uploaded: snapshot.uploaded instanceof Date ? snapshot.uploaded.toISOString() : snapshot.uploaded,
      headers: snapshot.headers,
      itemCount: snapshot.itemCount,
      rowsCompressed: compressed,
      savedAt: new Date().toISOString(),
    };
    // Merge with existing preferences so we don't overwrite other keys
    const current = await cloudFetchUserData(userId);
    const prefs = { ...(current?.preferences || {}), price_snapshot: meta };
    return cloudUpsertUserData(userId, { preferences: prefs });
  } catch (err) {
    console.warn('cloudSavePriceSnapshot failed:', err);
    return { ok: false };
  }
}

async function cloudLoadPriceSnapshot(userId) {
  if (!supabase || !userId) return null;
  try {
    const data = await cloudFetchUserData(userId);
    const snap = data?.preferences?.price_snapshot;
    if (!snap) return null;
    const rows = snap.rowsCompressed ? (await gunzipJSON(snap.rowsCompressed) || []) : [];
    return {
      filename: snap.filename,
      uploaded: snap.uploaded ? new Date(snap.uploaded) : new Date(),
      headers: snap.headers || [],
      rows,
      itemCount: snap.itemCount || rows.length,
    };
  } catch (err) {
    console.warn('cloudLoadPriceSnapshot failed:', err);
    return null;
  }
}

async function cloudClearPriceSnapshot(userId) {
  if (!supabase || !userId) return { ok: false };
  try {
    const current = await cloudFetchUserData(userId);
    const { price_snapshot: _removed, ...restPrefs } = current?.preferences || {};
    return cloudUpsertUserData(userId, { preferences: restPrefs });
  } catch (err) {
    console.warn('cloudClearPriceSnapshot failed:', err);
    return { ok: false };
  }
}

async function cloudFetchActiveStockSnapshot(store /* 'PO2' | 'PO3' */) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('stock_snapshots')
    .select('*')
    .eq('store', store)
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  if (data && data.rows_compressed) {
    // Decompress the rows on read
    const rows = await gunzipJSON(data.rows_compressed);
    return { ...data, rows: rows || [] };
  }
  return data;
}

async function cloudFetchStockHistory(store) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stock_snapshots')
    .select('id, store, filename, uploaded_at, uploaded_by, uploaded_by_email, row_count, is_active')
    .eq('store', store)
    .order('uploaded_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

async function cloudInsertStockSnapshot({ store, filename, rows, userId, userEmail }) {
  if (!supabase) return { ok: false };
  // Compress rows before upload — reduces ~80% of size
  const compressed = await gzipJSON(rows || []);
  const payload = {
    store, filename: filename || null,
    rows: [], // empty JSONB column (kept for back-compat)
    rows_compressed: compressed,
    row_count: (rows || []).length,
    uploaded_by: userId,
    uploaded_by_email: userEmail || null,
    is_active: true,
  };
  console.log(`[stock-upload] ${store}: ${(rows || []).length} rows, compressed ${(compressed.compressedLength / 1024).toFixed(1)} KB (was ${(compressed.originalLength / 1024).toFixed(1)} KB)`);
  const { data, error } = await supabase
    .from('stock_snapshots')
    .insert(payload)
    .select()
    .single();
  return { ok: !error, data, error: error?.message };
}

async function cloudActivateStockSnapshot(snapshotId, store) {
  if (!supabase) return { ok: false };
  // Set all snapshots of this store to inactive, then this one active
  await supabase.from('stock_snapshots').update({ is_active: false }).eq('store', store);
  const { error } = await supabase
    .from('stock_snapshots')
    .update({ is_active: true })
    .eq('id', snapshotId);
  return { ok: !error, error: error?.message };
}

async function cloudFetchStockSnapshotById(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('stock_snapshots')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  if (data && data.rows_compressed) {
    const rows = await gunzipJSON(data.rows_compressed);
    return { ...data, rows: rows || [] };
  }
  return data;
}

// Compute a stable campaign key from a filename
function campaignKeyFromFilename(name) {
  return name.replace(/\.(xlsx|xls|csv)$/i, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Periods — campaign planning entities
// ─────────────────────────────────────────────────────────────────────────

// Compute period status from dates (manual override saved on the period itself)
// Returns: 'planned' | 'active' | 'finished'
function periodStatus(period) {
  if (!period) return 'planned';
  if (period.statusOverride) return period.statusOverride;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = period.startDate ? new Date(period.startDate) : null;
  const end = period.endDate ? new Date(period.endDate) : null;
  if (start && now < start) return 'planned';
  if (end && now > end) return 'finished';
  if (start && now >= start && (!end || now <= end)) return 'active';
  return 'planned';
}

const PERIOD_STATUS_LABEL = {
  planned: 'Planeada',
  active: 'Em curso',
  finished: 'Terminada',
};

// Format period label "01 jan – 28 fev 2026"
function formatPeriodDates(p) {
  if (!p) return '';
  const fmt = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '';
  if (!p.startDate && !p.endDate) return 'sem datas';
  if (p.startDate && p.endDate) {
    const yEnd = new Date(p.endDate).getFullYear();
    return `${fmt(p.startDate)} – ${fmt(p.endDate)} ${yEnd}`;
  }
  if (p.startDate) return `início: ${fmt(p.startDate)}`;
  if (p.endDate) return `até: ${fmt(p.endDate)}`;
  return '';
}

// Create a new period object with sensible defaults
// Generate a RFC4122-ish UUID v4 (browser native or fallback)
function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch {}
  }
  // Fallback: manually construct UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Detect if a string is a valid UUID
function isUUID(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function newPeriod({ name, startDate, endDate, notes, hasPosters }) {
  return {
    id: genUUID(),
    name: name || 'Nova campanha',
    startDate: startDate || null,
    endDate: endDate || null,
    notes: notes || '',
    has_posters: !!hasPosters,
    statusOverride: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Zone memory — record where each EAN was last assigned
// Pure-local for now (Phase 1); cloud sync comes in next message
// ─────────────────────────────────────────────────────────────────────────
// Build memory map { eanKey: { ean, zoneId, zoneName, floorId, floorName, lastSeen, timesUsed } }
// from a list of all loaded campaigns (walks every floor → zone → slot)
function buildMemoryFromCampaigns(campaigns) {
  const memory = new Map();
  campaigns.forEach(c => {
    if (!c.floors) return;
    c.floors.forEach(f => {
      f.zones.forEach(z => {
        z.slots.forEach(s => {
          const key = normalizeEAN(s.ref);
          if (!key) return;
          const existing = memory.get(key);
          const entry = {
            ean: s.ref,
            zoneId: z.id,
            zoneName: z.name,
            floorId: f.id,
            floorName: f.name,
            lastSeen: c.uploaded ? c.uploaded.toISOString() : new Date().toISOString(),
            timesUsed: existing ? existing.timesUsed + 1 : 1,
          };
          // Keep the most recent assignment as canonical
          if (!existing || new Date(entry.lastSeen) >= new Date(existing.lastSeen)) {
            memory.set(key, entry);
          }
        });
      });
    });
  });
  return memory;
}

// Update memory when a slot is added/changed on a specific zone
function updateMemoryFromSlot(memoryMap, slot, zone, floor) {
  const key = normalizeEAN(slot.ref);
  if (!key) return memoryMap;
  const existing = memoryMap.get(key);
  const entry = {
    ean: slot.ref,
    zoneId: zone.id,
    zoneName: zone.name,
    floorId: floor.id,
    floorName: floor.name,
    lastSeen: new Date().toISOString(),
    timesUsed: existing ? existing.timesUsed + 1 : 1,
  };
  const next = new Map(memoryMap);
  next.set(key, entry);
  // Persist asynchronously — not critical to await
  idbPutMemory(entry).catch(err => console.warn('Memory put failed:', err));
  return next;
}

// Strip slots from layout for "default layout" persistence
function layoutOnly(floors) {
  return floors.map(f => ({
    ...f,
    zones: f.zones.map(z => ({ id: z.id, name: z.name, slots: [] })),
  }));
}

// Count assigned slots in a floors structure
function countSlots(floors) {
  return floors.reduce((s, f) => s + f.zones.reduce((zs, z) => zs + (z.slots?.length || 0), 0), 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Auth — Supabase-backed when configured; legacy password fallback otherwise
// ─────────────────────────────────────────────────────────────────────────
// Legacy fallback (only used when Supabase env vars are missing)
const LEGACY_PASSWORD = 'Faveiro2026';
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours (legacy session length)

// True when Supabase client is properly configured
const supabaseEnabled = !!supabase;

// Legacy password check — used only when Supabase isn't configured
async function checkLegacyPassword(text) {
  return text === LEGACY_PASSWORD;
}

// ─────────────────────────────────────────────────────────────────────────
// Root — auth wrapper
// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  // Supabase-backed user (null when logged out OR when Supabase not configured)
  const [user, setUser] = useState(null);
  // Legacy auth state (only used when Supabase not configured)
  const [legacyAuthed, setLegacyAuthed] = useState(() => {
    try {
      const session = storeGet('session', null);
      if (session && session.expiresAt && session.expiresAt > Date.now()) return true;
      if (session) storeDelete('session');
    } catch {}
    return false;
  });
  // Whether we've finished checking the initial Supabase session
  const [authChecked, setAuthChecked] = useState(!supabaseEnabled);

  // Listen to Supabase auth state changes
  useEffect(() => {
    if (!supabaseEnabled) return;
    let cancelled = false;
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data?.session?.user ?? null);
      setAuthChecked(true);
    });
    // Subscribe to future changes (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Theme state — load saved preference or fall back to light
  const [theme, setThemeState] = useState(() => {
    const saved = storeGet('theme', 'light');
    const valid = THEME_ORDER.includes(saved) ? saved : 'light';
    applyTheme(valid);
    return valid;
  });

  const setTheme = useCallback((mode) => {
    if (!THEME_ORDER.includes(mode)) return;
    applyTheme(mode);
    storeSet('theme', mode);
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const idx = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setTheme(next);
  }, [theme, setTheme]);

  // Determine final auth state: Supabase user OR legacy auth
  const isAuthed = supabaseEnabled ? !!user : legacyAuthed;

  // Logout handler routes to whichever system is in use
  const handleLogout = useCallback(async () => {
    if (supabaseEnabled) {
      await supabase.auth.signOut();
      // user state will be cleared by the auth listener
    } else {
      storeDelete('session');
      setLegacyAuthed(false);
    }
  }, []);

  // Show a small loader while checking initial Supabase session
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg, color: T.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Geist', sans-serif",
      }}>
        <div className="mono" style={{ fontSize: 11, color: T.inkMute, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          A iniciar…
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Login
      onSuccess={() => setLegacyAuthed(true)}
      theme={theme}
      toggleTheme={toggleTheme}
      setTheme={setTheme}
    />;
  }
  return <MainApp
    onLogout={handleLogout}
    user={user}
    theme={theme}
    toggleTheme={toggleTheme}
    setTheme={setTheme}
  />;
}

// ─────────────────────────────────────────────────────────────────────────
// ThemeSwitcher — 3-segment selector (Claro / Escuro / FNAC)
// ─────────────────────────────────────────────────────────────────────────
function ThemeSwitcher({ theme, setTheme, compact = false }) {
  // Two display modes:
  //   compact = true  → icon-only buttons (used in login corner & sidebar). Active button shows label, others are icon-only.
  //   compact = false → full label + icon buttons (used in wider areas)
  const containerStyle = compact ? {
    display: 'flex', gap: 2, padding: 3, width: '100%',
    background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6,
  } : {
    display: 'flex', gap: 2, padding: 3,
    background: T.bg, border: `1px solid ${T.line}`, borderRadius: 6,
  };

  return (
    <div style={containerStyle}>
      {THEME_ORDER.map(mode => {
        const active = theme === mode;
        const Icon = mode === 'light' ? Sun : (mode === 'dark' ? Moon : Sparkles);
        const showLabel = !compact || active;
        return (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            title={THEME_LABELS[mode]}
            style={{
              flex: compact ? (active ? 1 : '0 0 auto') : '0 0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: compact ? '4px 8px' : '4px 8px',
              fontSize: 10, fontWeight: 500,
              background: active ? T.ink : 'transparent',
              color: active ? T.bg : T.inkSoft,
              border: 'none', borderRadius: 5,
              cursor: 'pointer', transition: 'all 0.12s',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              minWidth: compact ? 26 : 'auto',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.lineSoft; e.currentTarget.style.color = T.ink; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.inkSoft; } }}
          >
            <Icon size={11} strokeWidth={1.75} />
            {showLabel && THEME_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────────────
function Login({ onSuccess, theme, toggleTheme, setTheme }) {
  // mode: 'signin' | 'signup' | 'forgot' | 'legacy' (when Supabase is missing)
  const [mode, setMode] = useState(supabaseEnabled ? 'signin' : 'legacy');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef();
  const pwdRef = useRef();

  useEffect(() => {
    // Focus first relevant field on mode change
    if (mode === 'legacy' || mode === 'signin') pwdRef.current?.focus();
    else emailRef.current?.focus();
  }, [mode]);

  // Reset error/info when changing mode
  useEffect(() => { setError(''); setInfo(''); }, [mode]);

  const submit = async () => {
    if (busy) return;
    setError(''); setInfo('');

    // Legacy mode (Supabase not configured)
    if (mode === 'legacy') {
      if (!pwd) return;
      setBusy(true);
      const ok = await checkLegacyPassword(pwd);
      if (ok) {
        storeSet('session', { expiresAt: Date.now() + SESSION_MS });
        onSuccess();
        return;
      }
      setError('Password incorreta');
      setPwd('');
      setTimeout(() => setBusy(false), 600);
      return;
    }

    // From here: Supabase modes
    if (!supabase) {
      setError('Supabase não está configurado.');
      return;
    }

    if (!email) { setError('Indica o teu email.'); return; }

    if (mode === 'forgot') {
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        });
        if (error) throw error;
        setInfo('Enviámos-te um email com instruções para redefinir a password.');
      } catch (err) {
        setError(err?.message || 'Não foi possível enviar o email.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!pwd) { setError('Indica a password.'); return; }

    if (mode === 'signup') {
      if (pwd.length < 6) { setError('A password tem de ter pelo menos 6 caracteres.'); return; }
      if (pwd !== pwdConfirm) { setError('As passwords não coincidem.'); return; }
      setBusy(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email, password: pwd,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        // If email confirmation is enabled in Supabase, no session is returned yet
        if (!data.session) {
          setInfo('Conta criada. Verifica o teu email para confirmar e depois faz login.');
          setMode('signin');
          setPwd('');
          setPwdConfirm('');
        }
        // If session is returned (auto-confirm enabled), the auth listener picks it up
      } catch (err) {
        setError(err?.message || 'Não foi possível criar a conta.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // signin
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error) throw error;
      // auth listener will set the user; component unmounts
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar.');
      setPwd('');
      setBusy(false);
    }
  };

  const isShake = !!error;

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.ink,
      fontFamily: "'Geist', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 24, right: 24, width: 'auto' }}>
        <ThemeSwitcher theme={theme} setTheme={setTheme} compact />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .display { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: 'Geist Mono', monospace; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.4s ease-in-out; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 400,
        animation: 'fadeUp 0.5s ease-out',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="display" style={{ fontSize: 56, lineHeight: 1, fontStyle: 'italic' }}>
            David Dinis
          </div>
          <div className="mono" style={{
            fontSize: 11, letterSpacing: '0.2em', color: T.inkMute,
            marginTop: 10, textTransform: 'uppercase',
          }}>
            Gestão de Campanhas
          </div>
        </div>

        <div style={{
          background: T.bgEl, border: `1px solid ${T.line}`,
          borderRadius: 12, padding: 32,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22,
            color: T.inkSoft,
          }}>
            {mode === 'forgot' ? <Mail size={14} /> : (mode === 'signup' ? <UserPlus size={14} /> : <Lock size={14} />)}
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {mode === 'signup' && 'Criar conta'}
              {mode === 'signin' && 'Entrar'}
              {mode === 'forgot' && 'Recuperar password'}
              {mode === 'legacy' && 'Acesso restrito'}
            </span>
            {!supabaseEnabled && mode === 'legacy' && (
              <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px', background: T.orange, color: '#fff', borderRadius: 3, fontWeight: 600 }}>OFFLINE</span>
            )}
          </div>

          <div className={isShake ? 'shake' : ''}>
            {/* Email field — for all Supabase modes */}
            {mode !== 'legacy' && (
              <label style={{ display: 'block', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.ink, marginBottom: 6, fontWeight: 500 }}>Email</div>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') (mode === 'forgot' ? submit() : pwdRef.current?.focus()); }}
                  autoComplete="email"
                  disabled={busy}
                  style={authInputStyle(error)}
                  onFocus={e => { if (!error) e.target.style.borderColor = T.ink; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = T.line; }}
                  placeholder="nome@exemplo.com"
                />
              </label>
            )}

            {/* Password field — not shown in forgot mode */}
            {mode !== 'forgot' && (
              <label style={{ display: 'block', marginBottom: mode === 'signup' ? 14 : 18 }}>
                <div style={{ fontSize: 12, color: T.ink, marginBottom: 6, fontWeight: 500 }}>Password</div>
                <input
                  ref={pwdRef}
                  type="password"
                  value={pwd}
                  onChange={e => { setPwd(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  disabled={busy}
                  style={authInputStyle(error)}
                  onFocus={e => { if (!error) e.target.style.borderColor = T.ink; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = T.line; }}
                  placeholder="••••••••"
                />
              </label>
            )}

            {/* Password confirm — signup only */}
            {mode === 'signup' && (
              <label style={{ display: 'block', marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: T.ink, marginBottom: 6, fontWeight: 500 }}>Confirmar password</div>
                <input
                  type="password"
                  value={pwdConfirm}
                  onChange={e => { setPwdConfirm(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                  autoComplete="new-password"
                  disabled={busy}
                  style={authInputStyle(error)}
                  onFocus={e => { if (!error) e.target.style.borderColor = T.ink; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = T.line; }}
                  placeholder="••••••••"
                />
              </label>
            )}

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
                padding: '8px 10px', background: '#FDECEA', color: '#A03028',
                borderRadius: 6, fontSize: 12,
              }}>
                <AlertCircle size={12} /> {error}
              </div>
            )}
            {info && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
                padding: '8px 10px', background: '#E5F4E5', color: '#2E5E2A',
                borderRadius: 6, fontSize: 12,
              }}>
                <Check size={12} /> {info}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy}
              style={{
                width: '100%', padding: '12px 16px',
                background: busy ? T.line : T.ink,
                color: busy ? T.inkMute : T.bg,
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500,
                cursor: busy ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {busy && 'A processar…'}
              {!busy && mode === 'signin' && 'Entrar'}
              {!busy && mode === 'signup' && 'Criar conta'}
              {!busy && mode === 'forgot' && 'Enviar email de recuperação'}
              {!busy && mode === 'legacy' && 'Entrar'}
            </button>
          </div>

          {/* Links between modes */}
          {supabaseEnabled && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}`,
              fontSize: 12,
            }}>
              {mode === 'signin' && (
                <>
                  <button onClick={() => setMode('forgot')} style={authLink()}>Esqueci-me</button>
                  <button onClick={() => setMode('signup')} style={authLink()}>Criar conta →</button>
                </>
              )}
              {mode === 'signup' && (
                <button onClick={() => setMode('signin')} style={authLink()}>
                  <ArrowLeft size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Já tenho conta
                </button>
              )}
              {mode === 'forgot' && (
                <button onClick={() => setMode('signin')} style={authLink()}>
                  <ArrowLeft size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Voltar ao login
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 24,
          fontSize: 11, color: T.inkMute, lineHeight: 1.6,
        }}>
          {supabaseEnabled
            ? 'Sessão sincronizada entre dispositivos'
            : 'Modo offline — sessão guardada por 12 horas'}
        </div>
      </div>
    </div>
  );
}

function authInputStyle(error) {
  return {
    width: '100%', padding: '11px 14px', fontSize: 14,
    fontFamily: "'Geist Mono', monospace",
    background: T.paper, color: T.ink,
    border: `1.5px solid ${error ? T.accent : T.line}`,
    borderRadius: 8, outline: 'none',
    transition: 'border-color 0.15s',
  };
}

function authLink() {
  return {
    background: 'transparent', border: 'none', padding: '4px 0',
    fontSize: 12, color: T.inkSoft, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// MainApp — actual application (gated behind Login)
// ─────────────────────────────────────────────────────────────────────────
function MainApp({ onLogout, user, theme, toggleTheme, setTheme }) {
  const [view, setView] = useStoredState('view', 'dashboard');
  const [campaigns, setCampaigns] = useState([]); // each: { id, key, name, rows, headers, floors, periodId }
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [stockRowsPO2, setStockRowsPO2] = useState([]);
  const [stockRowsPO3, setStockRowsPO3] = useState([]);
  // Metadata of the currently active stock snapshot (per store)
  const [stockMetaPO2, setStockMetaPO2] = useState(null); // { id, filename, uploaded_at, uploaded_by_email, row_count }
  const [stockMetaPO3, setStockMetaPO3] = useState(null);
  const [stockLoaded, setStockLoaded] = useState(false);

  // Load active stock snapshots from cloud on login
  useEffect(() => {
    if (!user || !supabase) { setStockLoaded(true); return; }
    let cancelled = false;
    (async () => {
      const [s2, s3] = await Promise.all([
        cloudFetchActiveStockSnapshot('PO2'),
        cloudFetchActiveStockSnapshot('PO3'),
      ]);
      if (cancelled) return;
      if (s2) {
        setStockRowsPO2(s2.rows || []);
        setStockMetaPO2({ id: s2.id, filename: s2.filename, uploaded_at: s2.uploaded_at, uploaded_by_email: s2.uploaded_by_email, row_count: s2.row_count });
      }
      if (s3) {
        setStockRowsPO3(s3.rows || []);
        setStockMetaPO3({ id: s3.id, filename: s3.filename, uploaded_at: s3.uploaded_at, uploaded_by_email: s3.uploaded_by_email, row_count: s3.row_count });
      }
      setStockLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Upload a new stock snapshot (called by StockView)
  const uploadStockSnapshot = useCallback(async (store, filename, rows) => {
    if (!user || !supabase) return { ok: false, error: 'Sem ligação à cloud' };
    const res = await cloudInsertStockSnapshot({
      store, filename, rows, userId: user.id, userEmail: user.email,
    });
    if (res.ok && res.data) {
      const meta = { id: res.data.id, filename: res.data.filename, uploaded_at: res.data.uploaded_at, uploaded_by_email: res.data.uploaded_by_email, row_count: res.data.row_count };
      if (store === 'PO2') {
        setStockRowsPO2(rows || []);
        setStockMetaPO2(meta);
      } else {
        setStockRowsPO3(rows || []);
        setStockMetaPO3(meta);
      }
      logActivity({
        userId: user.id, userEmail: user.email,
        action: 'upload', resourceType: 'stock',
        resourceId: res.data.id, resourceName: `Stock ${store}: ${filename}`,
        metadata: { rows: (rows || []).length },
      });
    }
    return res;
  }, [user]);

  // Activate a previous stock snapshot (admin / restore from history)
  const activateStockSnapshot = useCallback(async (snapshotId, store) => {
    if (!user || !supabase) return { ok: false };
    const res = await cloudActivateStockSnapshot(snapshotId, store);
    if (res.ok) {
      // Re-fetch the now-active snapshot
      const snap = await cloudFetchStockSnapshotById(snapshotId);
      if (snap) {
        const meta = { id: snap.id, filename: snap.filename, uploaded_at: snap.uploaded_at, uploaded_by_email: snap.uploaded_by_email, row_count: snap.row_count };
        if (store === 'PO2') {
          setStockRowsPO2(snap.rows || []);
          setStockMetaPO2(meta);
        } else {
          setStockRowsPO3(snap.rows || []);
          setStockMetaPO3(meta);
        }
      }
      logActivity({
        userId: user.id, userEmail: user.email,
        action: 'update', resourceType: 'stock',
        resourceId: snapshotId, resourceName: `Stock ${store} → snapshot anterior`,
      });
    }
    return res;
  }, [user]);


  // ─── Admin / profile / UI config ──────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [uiConfig, setUIConfig] = useState(null);

  // Families excluded from the entire webapp. Admin can override in Config tab.
  // Falls back to DEFAULT_EXCLUDED_FAMILIES when uiConfig hasn't loaded yet.
  const excludedFamilies = useMemo(() => {
    if (!uiConfig) return DEFAULT_EXCLUDED_FAMILIES;
    const cfg = uiConfig?.global_settings?.excluded_families;
    return Array.isArray(cfg) ? cfg : DEFAULT_EXCLUDED_FAMILIES;
  }, [uiConfig]);

  // Campaigns with rows pre-filtered by excluded families.
  // Used by ALL views (dashboard, sales, changes, inventory, campaigns, calendar)
  // to ensure excluded families never appear unless admin explicitly re-enables.
  // Admin views still receive the raw `campaigns`.
  const filteredCampaigns = useMemo(() => {
    if (!excludedFamilies || excludedFamilies.length === 0) return campaigns;
    return campaigns.map(c => ({
      ...c,
      rows: filterRowsByFamily(c.rows || [], c.headers || [], excludedFamilies),
    }));
  }, [campaigns, excludedFamilies]);

  // ─── Posters / poster zones / notifications ───────────────────────────
  const [posters, setPosters] = useState([]);
  const [posterZones, setPosterZones] = useState([]);
  const [dismissals, setDismissals] = useState([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  // Fetch posters + zones + dismissals when user logs in
  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    (async () => {
      const [zones, allPosters, dismiss] = await Promise.all([
        fetchPosterZones(),
        fetchAllActivePosters(),
        fetchDismissals(user.id),
      ]);
      if (cancelled) return;
      setPosterZones(zones);
      setPosters(allPosters);
      setDismissals(dismiss);
    })();
    return () => { cancelled = true; };
  }, [user]);


  // Bootstrap admin check + profile creation on login
  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    (async () => {
      // 1. Ensure profile exists
      const profile = await upsertUserProfile(user.id, user.email);
      if (cancelled) return;
      setUserProfile(profile);

      // 2. Check admin status
      const adminStatus = await checkIsAdmin(user.id, user.email);
      if (cancelled) return;
      setIsAdmin(adminStatus);

      // 3. Load UI config
      const config = await fetchUIConfig();
      if (cancelled) return;
      setUIConfig(config || { menu_visibility: {} });

      // 4. Log the login event
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        action: 'login',
        resourceType: 'session',
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Periodically update last_seen_at (every 60s while app is open)
  useEffect(() => {
    if (!user || !supabase) return;
    const ping = () => pingUserPresence(user.id);
    ping(); // initial
    const interval = setInterval(ping, 60 * 1000);
    // Also ping on window focus to catch users coming back
    const onFocus = () => ping();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  // Logout wrapper that logs the activity
  const handleLogoutWithActivity = useCallback(async () => {
    if (user) {
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        action: 'logout',
        resourceType: 'session',
      });
    }
    onLogout();
  }, [user, onLogout]);

  // Periods — campaign planning entities (top-level containers for Excels)
  const [periods, setPeriods] = useState([]);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);
  // Refs so async closures (setInterval, etc.) always read current state
  const periodsRef = useRef([]);
  const campaignsRef = useRef([]);
  useEffect(() => { periodsRef.current = periods; }, [periods]);
  useEffect(() => { campaignsRef.current = campaigns; }, [campaigns]);

  // Zone memory — Map of EAN → last-seen assignment
  const [zoneMemory, setZoneMemory] = useState(() => new Map());
  const [memoryLoaded, setMemoryLoaded] = useState(false);

  // Load saved campaigns from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    idbGetAll().then(items => {
      if (cancelled) return;
      if (items && items.length) {
        const restored = items.map(it => ({
          id: it.id || Date.now() + Math.random(),
          key: it.key,
          name: it.name,
          uploaded: it.uploaded ? new Date(it.uploaded) : new Date(),
          headers: it.headers || [],
          rows: it.rows || [],
          itemCount: (it.rows || []).length,
          floors: it.floors,
          periodId: it.periodId || null, // null = legacy/imported campaigns
        }));
        // Sort: most recently uploaded first
        restored.sort((a, b) => b.uploaded - a.uploaded);
        setCampaigns(restored);
      }
      setCampaignsLoaded(true);
    }).catch(err => {
      console.warn('IndexedDB load failed:', err);
      setCampaignsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Load periods from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    idbGetAllPeriods().then(items => {
      if (cancelled) return;
      // Sort by start date (most recent first), with null dates at the end
      items.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
      });
      setPeriods(items);
      setPeriodsLoaded(true);
    }).catch(err => {
      console.warn('Periods load failed:', err);
      setPeriodsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Load zone memory from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    idbGetAllMemory().then(items => {
      if (cancelled) return;
      const map = new Map();
      items.forEach(it => {
        const key = normalizeEAN(it.ean);
        if (key) map.set(key, it);
      });
      setZoneMemory(map);
      setMemoryLoaded(true);
    }).catch(err => {
      console.warn('Memory load failed:', err);
      setMemoryLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Migration: seed zone memory and handle legacy campaigns.
  // Runs AFTER cloud data is loaded so we have the full picture before creating periods.
  useEffect(() => {
    if (!campaignsLoaded || !periodsLoaded || !memoryLoaded) return;

    // Seed memory from existing assignments if memory is empty
    if (zoneMemory.size === 0 && campaigns.length > 0) {
      const seeded = buildMemoryFromCampaigns(campaigns);
      if (seeded.size > 0) {
        const items = Array.from(seeded.values());
        idbBulkPutMemory(items).catch(err => console.warn('Memory seed failed:', err));
        setZoneMemory(seeded);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignsLoaded, periodsLoaded, memoryLoaded]);

  // ─── Cloud sync: load shared periods/campaigns from cloud, merge with local
  // and migrate any local-only items to the cloud once.
  const [cloudDataLoaded, setCloudDataLoaded] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null); // { migrated: n }
  const cloudLoadRanRef = useRef(false);
  useEffect(() => {
    if (!user || !supabase) return;
    if (!campaignsLoaded || !periodsLoaded) return;
    if (cloudLoadRanRef.current) return;
    cloudLoadRanRef.current = true;
    let cancelled = false;

    (async () => {
      // 1. Fetch periods + campaign metadata in parallel (no large row blobs yet → fast)
      const [cloudPeriods, cloudCampaignsMeta] = await Promise.all([
        cloudFetchAllPeriods(),
        cloudFetchAllCampaignsMeta(),
      ]);
      if (cancelled) return;

      // 2. MERGE immediately — show everything right away without waiting for row hydration
      const earlyMergedPeriods = mergePeriods(periodsRef.current, cloudPeriods);
      const earlyMergedCampaigns = mergeCampaigns(campaignsRef.current, cloudCampaignsMeta);
      earlyMergedPeriods.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1; if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
      });
      setPeriods(earlyMergedPeriods);
      setCampaigns(earlyMergedCampaigns);
      setCloudDataLoaded(true); // unblock the rest of the app immediately

      // 2b. Phase 2: lazy row hydration is now PER-PERIOD (see effect in
      // CampaignsView). Não pré-carregamos rows de TODAS as campanhas no
      // startup — só do período que o utilizador abrir. Isto torna o
      // arranque ~10x mais rápido.

      // 3. Detect local-only items that need to be uploaded (migration, background)
      const cloudPeriodIds = new Set(cloudPeriods.map(p => p.id));
      const cloudCampaignKeys = new Set(cloudCampaignsMeta.map(c => c.user_id + ':' + c.key));
      const localOnlyPeriods = periodsRef.current.filter(p => !cloudPeriodIds.has(p.id) && !isTombstoned('period', p.id));
      const localOnlyCampaigns = campaignsRef.current.filter(c => !cloudCampaignKeys.has(user.id + ':' + c.key) && !isTombstoned('campaign', c.id));
      if (localOnlyPeriods.length === 0 && localOnlyCampaigns.length === 0) return; // nothing to migrate

      // 4. Remap non-UUID legacy period IDs
      const idRemap = new Map();
      const periodsToMigrate = localOnlyPeriods.map(p => {
        if (isUUID(p.id)) return p;
        const newId = genUUID();
        idRemap.set(p.id, newId);
        return { ...p, id: newId };
      });
      if (idRemap.size > 0) {
        setPeriods(prev => prev.map(p => { const nid = idRemap.get(p.id); return nid ? { ...p, id: nid } : p; }));
        setCampaigns(prev => prev.map(c => { const nid = idRemap.get(c.periodId); return nid ? { ...c, periodId: nid } : c; }));
        periodsToMigrate.forEach(p => idbPutPeriod(p).catch(() => {}));
        for (const oldId of idRemap.keys()) idbDeletePeriod(oldId).catch(() => {});
      }

      // 5. Upload local-only items in parallel (background — UI already visible)
      if (cancelled) return;
      let migratedCount = 0, migrationErrors = 0;
      const [periodResults, campaignResults] = await Promise.all([
        Promise.all(periodsToMigrate.map(p =>
          cloudUpsertPeriod({ ...p, user_id: p.user_id || user.id, created_by: p.created_by || user.id }, user.id)
        )),
        Promise.all(localOnlyCampaigns.filter(c => c.key && !isTombstoned('campaign', c.id)).map(async c => {
          const newPid = idRemap.get(c.periodId);
          const cw = { ...c, user_id: c.user_id || user.id, periodId: newPid || c.periodId };
          if (cw.periodId && !isUUID(cw.periodId)) cw.periodId = null;
          const res = await cloudUpsertCampaign(cw, user.id);
          // Adopt cloud-assigned UUID locally so next session doesn't try to re-migrate
          if (res.ok && res.data?.id && !isUUID(String(c.id))) {
            setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, id: res.data.id, user_id: res.data.user_id || user.id } : x));
          }
          return res;
        })),
      ]);
      [...periodResults, ...campaignResults].forEach(res => {
        if (res.ok) migratedCount++; else migrationErrors++;
      });

      // Suppress success banner if migration ran successfully recently (last 24h)
      const lastMig = storeGet('last_migration_at', 0);
      const isRecent = Date.now() - lastMig < 24 * 60 * 60 * 1000;
      if (migrationErrors > 0) {
        setMigrationStatus({ migrated: migratedCount, error: `${migrationErrors} ${migrationErrors === 1 ? 'item falhou' : 'itens falharam'} ao sincronizar para a cloud (verifica F12 para detalhes). Os dados ficam guardados localmente.` });
        setTimeout(() => setMigrationStatus(null), 12000);
      } else if (migratedCount > 0 && !isRecent) {
        setMigrationStatus({ migrated: migratedCount });
        storeSet('last_migration_at', Date.now());
        setTimeout(() => setMigrationStatus(null), 8000);
      } else if (migratedCount > 0) {
        // Silent: just record the timestamp
        storeSet('last_migration_at', Date.now());
      }
    })().catch(err => {
      console.warn('Cloud sync failed:', err);
      setCloudDataLoaded(true);
    });

    return () => { cancelled = true; };
  }, [user, campaignsLoaded, periodsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic refresh of shared data (every 30s) — picks up edits from colleagues
  useEffect(() => {
    if (!user || !supabase || !cloudDataLoaded) return;
    const refresh = async () => {
      const [p, c] = await Promise.all([cloudFetchAllPeriods(), cloudFetchAllCampaigns()]);
      // Always read current state via refs — avoids stale closure overwriting recent local edits
      const currentPeriods = periodsRef.current;
      const currentCampaigns = campaignsRef.current;
      // Defensive: don't blow away local state if cloud returns suddenly empty
      if (p.length === 0 && c.length === 0 && (currentPeriods.length > 0 || currentCampaigns.length > 0)) {
        console.warn('[cloud-sync] periodic refresh got empty result — skipping update to avoid wiping local state');
        return;
      }
      // MERGE instead of replace, same as initial load
      const mergedP = mergePeriods(currentPeriods, p);
      const mergedC = mergeCampaigns(currentCampaigns, c);
      mergedP.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
      });
      setPeriods(mergedP);
      setCampaigns(mergedC);
    };
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [user, cloudDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── De-duplicate "Importadas" periods and link orphan campaigns.
  // Declared AFTER cloudDataLoaded to avoid TDZ error.
  useEffect(() => {
    if (!cloudDataLoaded) return;

    // De-duplicate "Importadas": keep the most recent, delete the rest
    const importadas = periodsRef.current.filter(p => p.name === 'Importadas');
    if (importadas.length > 1) {
      importadas.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
      const [keep, ...duplicates] = importadas;
      const dupIds = new Set(duplicates.map(p => p.id));
      setPeriods(ps => ps.filter(p => !dupIds.has(p.id)));
      duplicates.forEach(p => {
        idbDeletePeriod(p.id).catch(() => {});
        if (supabase) supabase.from('periods').delete().eq('id', p.id).then(() => {});
      });
      setCampaigns(cs => cs.map(c => dupIds.has(c.periodId) ? { ...c, periodId: keep.id } : c));
    }

    // Link any remaining orphan campaigns to an "Importadas" period
    const orphans = campaignsRef.current.filter(c => !c.periodId);
    if (orphans.length > 0) {
      let importPeriod = periodsRef.current.find(p => p.name === 'Importadas');
      if (!importPeriod) {
        // Check localStorage for a previously created "Importadas" period id
        const cachedId = storeGet('importadas_period_id', null);
        if (cachedId) {
          // Reconstruct minimal period object and re-add to state if missing
          importPeriod = { id: cachedId, name: 'Importadas', notes: 'Campanhas migradas da versão anterior.' };
          setPeriods(ps => ps.some(p => p.id === cachedId) ? ps : [importPeriod, ...ps]);
        } else {
          importPeriod = newPeriod({ name: 'Importadas', notes: 'Campanhas migradas da versão anterior. Move-as para campanhas novas conforme precisares.' });
          storeSet('importadas_period_id', importPeriod.id);
          idbPutPeriod(importPeriod).catch(() => {});
          if (user && supabase) cloudUpsertPeriod({ ...importPeriod, user_id: user.id }, user.id).catch(() => {});
          setPeriods(ps => [importPeriod, ...ps]);
        }
      } else {
        // Period exists — persist its id so we never recreate it
        storeSet('importadas_period_id', importPeriod.id);
      }
      const targetId = importPeriod.id;
      setCampaigns(cs => cs.map(c => c.periodId ? c : { ...c, periodId: targetId }));
    }
  }, [cloudDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // defaultLayout: zones structure used as starting point for new campaigns. Persisted globally.
  const [defaultLayout, setDefaultLayout] = useState(() => {
    const saved = storeGet('default_layout', null);
    if (saved && Array.isArray(saved) && saved.length) return layoutOnly(saved);
    const oldGlobal = storeGet('floors', null);
    if (oldGlobal && Array.isArray(oldGlobal) && oldGlobal.length) {
      return layoutOnly(oldGlobal);
    }
    return DEFAULT_FLOORS;
  });
  useEffect(() => { storeSet('default_layout', layoutOnly(defaultLayout)); }, [defaultLayout]);

  // One-time migration (per session): for each period without floors,
  // copy floors from the oldest campaign in that period (legacy plan owned
  // by a campaign → promote to period level).
  // Uses setPeriods + cloudUpsertPeriod directly (instead of updatePeriod
  // which is declared later — would cause a TDZ error in the deps array).
  const planMigratedRef = useRef(false);
  useEffect(() => {
    if (!cloudDataLoaded || !user || planMigratedRef.current) return;
    if (!periods || periods.length === 0) return;
    planMigratedRef.current = true;
    const periodUpdates = [];
    for (const p of periods) {
      if (p.floors && Array.isArray(p.floors) && countSlots(p.floors) > 0) continue;
      const periodCamps = campaigns.filter(c => c.periodId === p.id);
      if (periodCamps.length === 0) continue;
      const sorted = [...periodCamps].sort((a, b) => countSlots(b.floors || []) - countSlots(a.floors || []));
      const donor = sorted[0];
      const slotCount = countSlots(donor.floors || []);
      if (slotCount === 0) continue;
      console.log('[plan-migrate] promoting floors from campaign', donor.name, '→ period', p.name, '(', slotCount, 'slots)');
      periodUpdates.push({ id: p.id, floors: donor.floors });
    }
    if (periodUpdates.length > 0) {
      const byId = new Map(periodUpdates.map(u => [u.id, u.floors]));
      setPeriods(prev => prev.map(p => {
        const newFloors = byId.get(p.id);
        if (!newFloors) return p;
        const next = { ...p, floors: newFloors, updatedAt: new Date().toISOString() };
        cloudUpsertPeriod(next, user.id).catch(err => console.warn('[plan-migrate] cloud failed', err));
        return next;
      }));
    }
  }, [cloudDataLoaded, user, periods, campaigns]);

  // Auto-cleanup: remove campaigns confirmed empty (rows = [] AND not waiting for hydration).
  // Runs every time campaigns change so cloud-resynced empties are also caught.
  // Uses a ref to avoid re-firing for the same set of ids.
  const lastCleanedRef = useRef(new Set());
  useEffect(() => {
    if (!cloudDataLoaded || !user) return;
    const emptyIds = campaigns
      .filter(c =>
        c.id &&
        !c._needsRows &&
        !c._rowsCompressed &&
        Array.isArray(c.rows) && c.rows.length === 0 &&
        (c.itemCount === 0 || c.itemCount == null)
      )
      .map(c => c.id);
    if (emptyIds.length === 0) return;
    // Skip if we already cleaned exactly these
    const key = emptyIds.sort().join(',');
    if (lastCleanedRef.current.has(key)) return;
    lastCleanedRef.current.add(key);
    console.log('[cleanup] removing', emptyIds.length, 'empty campaigns:', emptyIds);
    emptyIds.forEach(id => addTombstone('campaign', id));
    setCampaigns(cs => cs.filter(c => !emptyIds.includes(c.id)));
    emptyIds.forEach(id => {
      idbDelete(id).catch(() => {});
      if (isUUID(String(id))) cloudDeleteCampaign(id).catch(() => {});
    });
  }, [campaigns, cloudDataLoaded, user]);

  // Persist campaigns to IndexedDB — but ONLY the fields that change frequently
  // (floors, periodId, name) and ONLY campaigns that actually changed.
  // Rows are large (48k+ lines) — they're written once on upload and not on every sync.
  const idbSigRef = useRef(new Map()); // key → signature of last-written state
  useEffect(() => {
    if (!campaignsLoaded) return;
    campaigns.forEach(c => {
      if (!c.key) return;
      // Signature covers only the fields we write (excludes rows to avoid hashing 48k rows)
      const sig = `${c.id}|${c.name}|${c.periodId}|${c.updatedAt}|${JSON.stringify(c.floors)}`;
      if (idbSigRef.current.get(c.key) === sig) return; // unchanged — skip write
      idbSigRef.current.set(c.key, sig);
      // Skip IDB write if rows aren't hydrated yet (avoid caching empty rows)
      if (c._rowsCompressed) return;
      idbPut({
        key: c.key,
        id: c.id,
        name: c.name,
        uploaded: c.uploaded ? c.uploaded.toISOString() : new Date().toISOString(),
        headers: c.headers,
        rows: c.rows,       // rows written on first save; subsequent writes re-use same array
        floors: c.floors,
        periodId: c.periodId || null,
        updatedAt: c.updatedAt,
        sortOrder: c.sortOrder,
      }).catch(err => console.warn('IDB put failed:', err));
    });
  }, [campaigns, campaignsLoaded]);

  // Cloud sync for campaign changes (debounced, fires after 1.2s of inactivity)
  const [syncError, setSyncError] = useState(null);   // null = ok, string = error message
  const [syncing, setSyncing] = useState(false);       // true while upload is in-flight
  const lastPushedFloorsRef = useRef(new Map()); // campaignId → JSON of floors
  const pushCampaignsToCloud = useMemo(
    () => debounce(async (currentUser, currentCampaigns, setCampaignsFn) => {
      if (!currentUser || !supabase) return;
      // Find campaigns whose floors actually changed — push them in parallel
      const toSync = currentCampaigns.filter(c => {
        if (!c.key || !c.floors) return false;
        if (c._rowsCompressed) return false; // not hydrated yet — skip
        const sig = JSON.stringify(c.floors);
        return lastPushedFloorsRef.current.get(c.id) !== sig;
      });
      if (toSync.length === 0) return;
      setSyncing(true);
      try {
        const results = await Promise.all(toSync.map(async c => {
          const sig = JSON.stringify(c.floors);
          const res = await cloudUpsertCampaign({ ...c, user_id: c.user_id || currentUser.id }, currentUser.id);
          if (res.ok) {
            lastPushedFloorsRef.current.set(c.id, sig);
            // If cloud assigned a new UUID (new insert), update the local campaign id
            if (res.data?.id && !isUUID(String(c.id))) {
              setCampaignsFn(prev => prev.map(x =>
                x.id === c.id ? { ...x, id: res.data.id, user_id: res.data.user_id || currentUser.id } : x
              ));
            }
          }
          return res;
        }));
        const failed = results.filter(r => !r.ok);
        setSyncError(failed.length > 0 ? `${failed.length} campanha(s) não guardadas na cloud — verifica a ligação.` : null);
      } catch (e) {
        setSyncError('Erro ao guardar campanhas na cloud — verifica a ligação.');
      } finally {
        setSyncing(false);
      }
    }, 1200),
    []
  );

  useEffect(() => {
    if (!cloudDataLoaded || !user) return;
    pushCampaignsToCloud(user, campaigns, setCampaigns);
  }, [campaigns, user, cloudDataLoaded, pushCampaignsToCloud]);

  const [candidates, setCandidates] = useState([]);
  const [stockMapPO2, setStockMapPO2Raw] = useState(() => storeGet('stockMap.PO2', {}));
  const [stockMapPO3, setStockMapPO3Raw] = useState(() => storeGet('stockMap.PO3', {}));
  const setStockMapPO2 = useCallback((v) => { storeSet('stockMap.PO2', v); setStockMapPO2Raw(v); }, []);
  const setStockMapPO3 = useCallback((v) => { storeSet('stockMap.PO3', v); setStockMapPO3Raw(v); }, []);

  // ─── Notifications computed from periods + posters ─────────────────────
  // Get configurable warn-days from ui_config (default [2, 0])
  const warnDays = useMemo(() => {
    const cfg = uiConfig?.global_settings?.warn_days_before_end;
    if (Array.isArray(cfg) && cfg.length > 0) return cfg;
    return DEFAULT_WARN_DAYS;
  }, [uiConfig]);

  const notifications = useMemo(
    () => computeNotifications(periods, posters, dismissals, warnDays),
    [periods, posters, dismissals, warnDays]
  );

  // ─── Email queue: when notifications are computed, create queue entries
  // for periods needing alerts (deduplication via key + DB constraint)
  // Runs on login + once per period change
  const emailQueueRef = useRef(new Set());
  useEffect(() => {
    if (!user || !supabase || !notifications.length) return;
    if (!uiConfig?.global_settings?.emails_enabled) return; // OFF by default

    let cancelled = false;
    (async () => {
      // Get all registered users to email them
      const profiles = await fetchAllProfiles();
      if (cancelled) return;
      const recipients = profiles.filter(p => !p.suspended && p.email);
      if (recipients.length === 0) return;

      for (const notif of notifications) {
        if (notif.kind !== 'period_ending') continue; // only end-warnings, not overdue
        if (!notif.hasPosters) continue; // skip if no posters

        const period = periods.find(p => p.id === notif.periodId);
        if (!period) continue;

        // Dedupe per session
        const dedupeKey = `email:${notif.key}`;
        if (emailQueueRef.current.has(dedupeKey)) continue;
        emailQueueRef.current.add(dedupeKey);

        const { subject, bodyText, bodyHtml } = buildCampaignEndingEmail(period, notif.postersToRemove, notif.daysLeft);

        // Queue one email per recipient (each recipient gets their own row in the queue)
        for (const r of recipients) {
          await queueEmail({
            toEmail: r.email,
            toUserId: r.user_id,
            subject, bodyHtml, bodyText,
            category: notif.kind,
            periodId: notif.periodId,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [notifications, user, uiConfig, periods]);

  // Refresh posters + dismissals after a status change (called by children)
  const refreshPosters = useCallback(async () => {
    if (!user || !supabase) return;
    const [allPosters, dismiss] = await Promise.all([
      fetchAllActivePosters(),
      fetchDismissals(user.id),
    ]);
    setPosters(allPosters);
    setDismissals(dismiss);
  }, [user]);

  // Dismiss a notification (don't show again for this user)
  const handleDismissNotification = useCallback(async (key) => {
    if (!user) return;
    await dismissNotification(user.id, key);
    setDismissals(prev => [...prev, { user_id: user.id, notification_key: key, dismissed_at: new Date().toISOString() }]);
  }, [user]);

  // ─── Period management callbacks ───────────────────────────────────────
  const createPeriod = useCallback((data) => {
    const p = newPeriod(data);
    if (user) p.user_id = user.id;
    if (user) p.created_by = user.id;
    idbPutPeriod(p).catch(err => console.warn('Period save failed:', err));
    setPeriods(ps => [p, ...ps]);
    if (user && supabase) {
      cloudUpsertPeriod(p, user.id).catch(err => console.warn('Period cloud upsert failed:', err));
      logActivity({
        userId: user.id, userEmail: user.email,
        action: 'create', resourceType: 'period',
        resourceId: p.id, resourceName: p.name,
        metadata: { startDate: p.startDate, endDate: p.endDate },
      });
    }
    return p;
  }, [user]);

  const updatePeriod = useCallback((id, patch) => {
    setPeriods(ps => ps.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch, updatedAt: new Date().toISOString() };
      idbPutPeriod(next).catch(err => console.warn('Period save failed:', err));
      if (user && supabase) {
        cloudUpsertPeriod(next, user.id).catch(err => console.warn('Period cloud upsert failed:', err));
        logActivity({
          userId: user.id, userEmail: user.email,
          action: 'update', resourceType: 'period',
          resourceId: id, resourceName: next.name,
          metadata: { changes: Object.keys(patch) },
        });
      }
      return next;
    }));
  }, [user]);

  const deletePeriod = useCallback((id) => {
    const p = periods.find(x => x.id === id);
    if (!p) return;
    const campaignsHere = campaignsRef.current.filter(c => c.periodId === id);
    const msg = campaignsHere.length === 0
      ? `Eliminar período "${p.name}"?\n\nNão tem campanhas associadas. Não pode ser desfeito.`
      : `Eliminar período "${p.name}" e as ${campaignsHere.length} campanha(s) associadas?\n\nApaga TUDO (local + IDB + cloud). Não pode ser desfeito.`;
    if (!confirm(msg)) return;
    // Tombstones FIRST so periodic refresh doesn't resurrect anything
    addTombstone('period', id);
    campaignsHere.forEach(c => addTombstone('campaign', c.id));
    // Delete campaigns (local + IDB + cloud)
    if (campaignsHere.length > 0) {
      campaignsHere.forEach(c => {
        if (c.key) idbDelete(c.key).catch(() => {});
        if (c.id) idbDelete(c.id).catch(() => {});
        if (user && supabase && isUUID(String(c.id))) cloudDeleteCampaign(c.id).catch(err => console.warn('[delete-period] cloud campaign delete failed', err));
      });
      setCampaigns(cs => cs.filter(c => c.periodId !== id));
    }
    // Delete period
    idbDeletePeriod(id).catch(err => console.warn('[delete-period] IDB delete failed:', err));
    if (user && supabase && isUUID(String(id))) cloudDeletePeriod(id).catch(err => console.warn('[delete-period] cloud delete failed:', err));
    setPeriods(ps => ps.filter(p => p.id !== id));
    if (user) logActivity({
      userId: user.id, userEmail: user.email,
      action: 'delete', resourceType: 'period',
      resourceId: id, resourceName: p?.name,
      metadata: { campaignsDeleted: campaignsHere.length },
    });
  }, [user, periods]);

  // Toggle hidden flag (admin only — RLS enforces)
  const togglePeriodHidden = useCallback(async (id) => {
    const p = periods.find(x => x.id === id);
    if (!p) return;
    const newHidden = !p.hidden;
    setPeriods(ps => ps.map(x => x.id === id ? { ...x, hidden: newHidden } : x));
    if (user && supabase) {
      const res = await cloudSetPeriodHidden(id, newHidden);
      if (!res.ok) {
        // Rollback on failure
        setPeriods(ps => ps.map(x => x.id === id ? { ...x, hidden: !newHidden } : x));
        alert('Não foi possível alterar visibilidade: ' + res.error);
      } else {
        logActivity({
          userId: user.id, userEmail: user.email,
          action: 'update', resourceType: 'period',
          resourceId: id, resourceName: p.name,
          metadata: { hidden: newHidden },
        });
      }
    }
  }, [user, periods]);

  // Move a campaign (Excel) into a different period
  const moveCampaignToPeriod = useCallback((campaignId, targetPeriodId) => {
    setCampaigns(cs => cs.map(c => c.id === campaignId ? { ...c, periodId: targetPeriodId } : c));
    // Push to cloud
    if (user && supabase) {
      const c = campaigns.find(x => x.id === campaignId);
      if (c) cloudUpsertCampaign({ ...c, periodId: targetPeriodId }, user.id).catch(() => {});
    }
  }, [user, campaigns]);

  // Notes — single global notebook, auto-saved
  const [notes, setNotes] = useStoredState('notes', '');
  // Track when notes were last edited locally so we can compare with cloud timestamp
  const notesUpdatedAtRef = useRef(storeGet('notes_updated_at', null));
  const setNotesWithTimestamp = useCallback((val) => {
    const ts = new Date().toISOString();
    notesUpdatedAtRef.current = ts;
    storeSet('notes_updated_at', ts);
    setNotes(val);
  }, [setNotes]);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [blueprintOpen, setBlueprintOpen] = useState(false);

  // ─── Cloud sync state ──────────────────────────────────────────────────
  // syncStatus: 'idle' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [cloudLoaded, setCloudLoaded] = useState(false);
  // Track online/offline status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Initial cloud load — runs once when user logs in
  // Strategy: fetch cloud row. If cloud has values and they differ from local,
  // we keep local (it's likely fresher edits) BUT push local to cloud to align.
  // For first-time users (no cloud row), local data is uploaded as-is.
  useEffect(() => {
    if (!user || !supabase) {
      setCloudLoaded(true);
      return;
    }
    if (cloudLoaded) return;
    let cancelled = false;
    setSyncStatus('loading');

    cloudFetchUserData(user.id).then(remote => {
      if (cancelled) return;

      // No remote row yet — push local (first-time user on this account)
      if (!remote) {
        cloudUpsertUserData(user.id, {
          notes: notes || '',
          default_layout: layoutOnly(defaultLayout),
        }).then(({ ok }) => {
          if (cancelled) return;
          setSyncStatus(ok ? 'synced' : 'error');
          setCloudLoaded(true);
        });
        return;
      }

      // Remote row exists — pick the most recently updated version (no concatenation)
      const localHasNotes = (notes || '').trim().length > 0;
      const remoteHasNotes = (remote.notes || '').trim().length > 0;

      let nextNotes = notes;
      if (!localHasNotes && remoteHasNotes) {
        // Local is empty, remote has content → adopt remote
        nextNotes = remote.notes;
      } else if (localHasNotes && remoteHasNotes && notes !== remote.notes) {
        // Both have content and they differ → keep whichever was updated more recently
        const localTs = notesUpdatedAtRef.current ? new Date(notesUpdatedAtRef.current).getTime() : 0;
        const remoteTs = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
        if (remoteTs > localTs) {
          nextNotes = remote.notes; // cloud is newer
        }
        // else: local is newer or equal → keep local (nextNotes already = notes)
      }

      // Adopt remote default_layout only when local is the bare default (untouched)
      let nextLayout = defaultLayout;
      const localIsDefault = JSON.stringify(layoutOnly(defaultLayout)) === JSON.stringify(layoutOnly(DEFAULT_FLOORS));
      if (localIsDefault && remote.default_layout) {
        nextLayout = layoutOnly(remote.default_layout);
      }

      if (nextNotes !== notes) setNotes(nextNotes);
      if (nextLayout !== defaultLayout) setDefaultLayout(nextLayout);

      // Push merged state back to cloud so it's aligned
      cloudUpsertUserData(user.id, {
        notes: nextNotes,
        default_layout: layoutOnly(nextLayout),
      }).then(({ ok }) => {
        if (cancelled) return;
        setSyncStatus(ok ? 'synced' : 'error');
        setCloudLoaded(true);
      });
    }).catch(() => {
      if (cancelled) return;
      setSyncStatus('error');
      setCloudLoaded(true);
    });

    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced cloud upsert — runs after edits stop for 800ms
  const pushUserData = useMemo(
    () => debounce(async (uid, payload) => {
      if (!isOnline) {
        setSyncStatus('offline');
        return;
      }
      setSyncStatus('syncing');
      const { ok } = await cloudUpsertUserData(uid, payload);
      setSyncStatus(ok ? 'synced' : 'error');
    }, 800),
    [isOnline]
  );

  // Push notes to cloud whenever they change (after initial cloud load)
  useEffect(() => {
    if (!user || !supabase || !cloudLoaded) return;
    pushUserData(user.id, { notes });
  }, [notes, user, cloudLoaded, pushUserData]);

  // Push defaultLayout to cloud whenever it changes (after initial cloud load)
  useEffect(() => {
    if (!user || !supabase || !cloudLoaded) return;
    pushUserData(user.id, { default_layout: layoutOnly(defaultLayout) });
  }, [defaultLayout, user, cloudLoaded, pushUserData]);

  // When connection comes back, do a final flush of any pending push
  useEffect(() => {
    if (isOnline && user && supabase && cloudLoaded) {
      // Force sync of current state
      pushUserData.flush?.();
    } else if (!isOnline) {
      setSyncStatus('offline');
    }
  }, [isOnline, user, cloudLoaded, pushUserData]);


  // Export everything to a JSON file the user can download
  const exportSession = useCallback((scope = 'all', specificCampaignId = null) => {
    const payload = {
      _format: 'david-dinis-session',
      _version: 1,
      exportedAt: new Date().toISOString(),
      defaultLayout: layoutOnly(defaultLayout),
      notes: scope === 'all' ? notes : undefined,
      campaigns: scope === 'all'
        ? campaigns.map(c => ({
            key: c.key, name: c.name,
            uploaded: c.uploaded ? c.uploaded.toISOString() : null,
            headers: c.headers, rows: c.rows, floors: c.floors,
          }))
        : campaigns.filter(c => c.id === specificCampaignId).map(c => ({
            key: c.key, name: c.name,
            uploaded: c.uploaded ? c.uploaded.toISOString() : null,
            headers: c.headers, rows: c.rows, floors: c.floors,
          })),
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = scope === 'all'
      ? `david-dinis-sessao-${dateStr}.json`
      : `david-dinis-${(payload.campaigns[0]?.name || 'campanha').replace(/[^a-z0-9]/gi, '_')}-${dateStr}.json`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [campaigns, defaultLayout, notes]);

  // Import a JSON file: validates, then merges into current state
  const importSession = useCallback(async (file) => {
    let payload;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch {
      alert('Ficheiro inválido — não é JSON.');
      return { success: false };
    }

    if (payload._format !== 'david-dinis-session') {
      alert('Ficheiro não é um backup válido da aplicação David Dinis.');
      return { success: false };
    }

    const incomingCampaigns = (payload.campaigns || []).map(c => ({
      id: Date.now() + Math.random(),
      key: c.key,
      name: c.name,
      uploaded: c.uploaded ? new Date(c.uploaded) : new Date(),
      headers: c.headers || [],
      rows: c.rows || [],
      itemCount: (c.rows || []).length,
      floors: c.floors,
    }));

    if (incomingCampaigns.length === 0) {
      alert('O ficheiro não contém nenhuma campanha.');
      return { success: false };
    }

    // Detect conflicts (same campaign key already loaded)
    const existingKeys = new Set(campaigns.map(c => c.key));
    const conflicts = incomingCampaigns.filter(c => existingKeys.has(c.key));

    if (conflicts.length > 0) {
      // Replace: keep incoming (newer) version for conflicts
      setCampaigns(prev => {
        const filtered = prev.filter(c => !incomingCampaigns.some(ic => ic.key === c.key));
        return [...incomingCampaigns, ...filtered];
      });
      const names = conflicts.map(c => c.name).join(', ');
      setMigrationStatus({ migrated: conflicts.length, note: `Campanhas substituídas: ${names}` });
      setTimeout(() => setMigrationStatus(null), 6000);
    } else {
      setCampaigns(prev => [...incomingCampaigns, ...prev]);
    }

    // Optionally restore default layout (zones structure)
    if (payload.defaultLayout && Array.isArray(payload.defaultLayout) && payload.defaultLayout.length) {
      setDefaultLayout(layoutOnly(payload.defaultLayout));
    }

    // Optionally restore notes
    if (typeof payload.notes === 'string' && payload.notes.length > 0) {
      const hasCurrentNotes = notes && notes.trim().length > 0;
      const restoreNotes = !hasCurrentNotes || confirm(
        'O ficheiro contém notas guardadas. Queres ANEXAR ao teu caderno atual?\n\n' +
        '(Cancelar = ignorar as notas do ficheiro)'
      );
      if (restoreNotes) {
        setNotes(prev => {
          if (!prev || prev.trim().length === 0) return payload.notes;
          return prev + '\n\n--- Notas importadas ---\n\n' + payload.notes;
        });
      }
    }

    return { success: true, count: incomingCampaigns.length };
  }, [campaigns, notes]);

  return (
    <div style={{ background: T.bg, color: T.ink, minHeight: '100vh', fontFamily: "'Geist', sans-serif" }}>
      <style>{fonts}{`
        * { box-sizing: border-box; }
        :root { color-scheme: ${theme === 'dark' ? 'dark' : 'light'}; }
        body { margin: 0; background: ${T.bg}; color: ${T.ink}; }
        .display { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: 'Geist Mono', monospace; }
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; color: ${T.ink}; }
        select { background: ${T.bgEl}; }
        select option { background: ${T.bgEl}; color: ${T.ink}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .fade-up { animation: fadeUp 0.4s ease-out backwards; }
        .row-input { border: none; background: transparent; outline: none; padding: 4px 6px; font-size: 12px; width: 100%; color: ${T.ink}; }
        .row-input:focus { background: ${T.paper}; box-shadow: inset 0 0 0 1.5px ${T.accent}; border-radius: 3px; }

        /* ─── Print styles ─── */
        /* Goal: when user presses Ctrl+P, hide all chrome (sidebar, header,
           buttons, filters, panels, floating actions) and show only the
           printable content marked with class .print-area */
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            background: #fff !important;
            color: #000 !important;
            color-scheme: light !important;
          }
          /* Hide everything by default — selectively reveal print-area below */
          .no-print { display: none !important; }

          /* Reset main layout for print */
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
          /* Remove backgrounds/shadows/borders from container chrome to save ink */
          .print-area {
            background: #fff !important;
            box-shadow: none !important;
          }
          .print-area * {
            color: #000 !important;
            background-image: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          /* Keep semantic backgrounds only on small badges/swatches */
          .print-keep-bg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Better readability when printing tables */
          .print-area table { border-collapse: collapse !important; width: 100% !important; }
          .print-area th, .print-area td {
            border: 1px solid #999 !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
          .print-area thead { display: table-header-group; } /* repeat headers on each page */
          .print-area tr { page-break-inside: avoid; }
          /* Page break suggestions for floor sections */
          .print-floor-break { page-break-before: auto; }
          /* Hide cosmetic decoration */
          .print-area .fade-up { animation: none !important; }
        }

        /* ─── Mobile responsive ─── */
        /* Tablet & phone: collapse sidebar to bottom nav, simplify tables */
        @media (max-width: 900px) {
          aside.no-print {
            position: fixed !important;
            bottom: 0 !important; left: 0 !important; right: 0 !important;
            top: auto !important;
            width: 100% !important; height: auto !important;
            flex-direction: row !important;
            padding: 8px 12px !important;
            border-right: none !important;
            border-top: 1px solid ${T.line} !important;
            overflow-x: auto !important;
            z-index: 50;
          }
          aside.no-print > div { display: flex; flex-direction: row; gap: 4px; flex: 1; }
          aside.no-print h1, aside.no-print .display { display: none !important; }
          aside.no-print button { padding: 8px 10px !important; font-size: 11px !important; }
          aside.no-print button span { display: none !important; }
          main { padding-bottom: 80px !important; padding-left: 16px !important; padding-right: 16px !important; max-width: 100% !important; }
          /* Tables: allow horizontal scroll */
          table { font-size: 10px !important; }
          /* Hide low-priority columns by class */
          .mobile-hide { display: none !important; }
          /* Modals full-width on mobile */
          [role="dialog"], .modal { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
          /* Period overview cards stack */
          .period-grid { grid-template-columns: 1fr !important; }
          /* Header buttons wrap */
          h1, h2, .display { font-size: 18px !important; }
        }
        @media (max-width: 600px) {
          /* Hide more columns on phones */
          .phone-hide { display: none !important; }
          input, select, button { font-size: 14px !important; }
          /* Touch targets at least 40px */
          button { min-height: 36px; }
        }
      `}</style>

      <div key={theme} style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          view={view} setView={setView} candidates={candidates}
          onLogout={handleLogoutWithActivity} user={user}
          isAdmin={isAdmin} userProfile={userProfile} uiConfig={uiConfig}
          notifications={notifications}
          syncStatus={syncStatus} isOnline={isOnline}
          theme={theme} toggleTheme={toggleTheme} setTheme={setTheme}
        />
        <main style={{ flex: 1, padding: '48px 40px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>
          {/* Migration success/error toast */}
          {migrationStatus && (
            <div style={{
              padding: '10px 16px', marginBottom: 14, fontSize: 12,
              background: migrationStatus.error ? '#FDECEA' : '#E5F4E5',
              color: migrationStatus.error ? '#A03028' : '#2E5E2A',
              border: `1px solid ${migrationStatus.error ? '#F5C5BD' : '#B8DDB6'}`, borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'fadeUp 0.25s ease-out',
            }}>
              {migrationStatus.error ? <AlertTriangle size={14} /> : <Check size={14} />}
              {migrationStatus.error ? (
                <span><strong>Aviso de sincronização.</strong> {migrationStatus.error}</span>
              ) : (
                <span>{migrationStatus.note
                  ? migrationStatus.note
                  : <><strong>Migração concluída.</strong> {migrationStatus.migrated} {migrationStatus.migrated === 1 ? 'item enviado' : 'itens enviados'} para a cloud. Os teus colegas já vão ver tudo.</>
                }</span>
              )}
              <button onClick={() => setMigrationStatus(null)} style={{
                marginLeft: 'auto', padding: 4, background: 'transparent',
                color: migrationStatus.error ? '#A03028' : '#2E5E2A', border: 'none', cursor: 'pointer',
              }}><X size={12} /></button>
            </div>
          )}

          {/* Notification banner — shown when there are pending alerts */}
          {notifications.length > 0 && (
            <NotificationBanner
              notifications={notifications}
              onOpenPanel={() => setNotificationPanelOpen(true)}
              onDismiss={handleDismissNotification}
              onJumpToPeriod={(id) => {
                storeSet('campaigns.selectedPeriodId', id);
                setView('campaigns');
              }}
            />
          )}
          {view === 'dashboard' && <Dashboard campaigns={filteredCampaigns} stockRowsPO2={stockRowsPO2} stockRowsPO3={stockRowsPO3} defaultLayout={defaultLayout} setView={setView} onExport={exportSession} onImport={importSession} periods={periods} posters={posters} notifications={notifications} />}
          {view === 'campaigns' && <CampaignsView
            campaigns={campaigns} setCampaigns={setCampaigns}
            periods={periods}
            posters={posters} posterZones={posterZones} onRefreshPosters={refreshPosters}
            user={user} isAdmin={isAdmin}
            onCreatePeriod={createPeriod} onUpdatePeriod={updatePeriod}
            onDeletePeriod={deletePeriod} onMoveCampaign={moveCampaignToPeriod}
            onToggleHidden={togglePeriodHidden}
            zoneMemory={zoneMemory} setZoneMemory={setZoneMemory}
            defaultLayout={defaultLayout} setDefaultLayout={setDefaultLayout}
            candidates={candidates} setCandidates={setCandidates}
            stockRowsPO2={stockRowsPO2} stockRowsPO3={stockRowsPO3}
            stockMapPO2={stockMapPO2} stockMapPO3={stockMapPO3}
            onExport={exportSession} onImport={importSession}
            excludedFamilies={excludedFamilies}
            syncError={syncError} syncing={syncing} onClearSyncError={() => setSyncError(null)}
            cloudDataLoaded={cloudDataLoaded}
          />}
          {view === 'calendar' && <CalendarView periods={periods} campaigns={filteredCampaigns} onEnterPeriod={(id) => { setView('campaigns'); storeSet('campaigns.selectedPeriodId', id); window.location.reload(); }} />}
          {view === 'sales' && <SalesView salesData={salesData} setSalesData={setSalesData} candidates={candidates} setCandidates={setCandidates} />}
          {view === 'changes' && <ChangesView campaigns={campaigns} periods={periods} stockRowsPO2={stockRowsPO2} stockRowsPO3={stockRowsPO3} stockMapPO2={stockMapPO2} stockMapPO3={stockMapPO3} user={user} excludedFamilies={excludedFamilies} />}
          {view === 'stock' && <StockView
            stockRowsPO2={stockRowsPO2} setStockRowsPO2={setStockRowsPO2}
            stockRowsPO3={stockRowsPO3} setStockRowsPO3={setStockRowsPO3}
            stockMetaPO2={stockMetaPO2} stockMetaPO3={stockMetaPO3}
            onUploadStock={uploadStockSnapshot}
            onActivateSnapshot={activateStockSnapshot}
            user={user} isAdmin={isAdmin}
            campaigns={filteredCampaigns}
            stockMapPO2={stockMapPO2} setStockMapPO2={setStockMapPO2}
            stockMapPO3={stockMapPO3} setStockMapPO3={setStockMapPO3}
            excludedFamilies={excludedFamilies}
          />}
          {view === 'inventory' && <InventoryView
            stockRowsPO2={stockRowsPO2} stockRowsPO3={stockRowsPO3}
            stockMapPO2={stockMapPO2} stockMapPO3={stockMapPO3}
            campaigns={filteredCampaigns}
            setCampaigns={setCampaigns}
            excludedFamilies={excludedFamilies}
          />}
          {view === 'images' && <FlyerEditor campaigns={filteredCampaigns} />}
          {view === 'pdfs' && <PdfEditor />}
          {view === 'notes' && <NotesView notes={notes} setNotes={setNotesWithTimestamp} />}
          {view === 'admin' && isAdmin && (
            <AdminView
              user={user}
              uiConfig={uiConfig}
              setUIConfig={setUIConfig}
            />
          )}
          {view === 'admin' && !isAdmin && (
            <div style={{ padding: 60, textAlign: 'center', color: T.inkMute }}>
              <Lock size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: T.ink }}>Acesso restrito a administradores.</div>
            </div>
          )}
        </main>
      </div>

      {/* Floating action buttons — stacked, always accessible */}
      {view !== 'notes' && (
        <button
          onClick={() => setNotesPanelOpen(o => !o)}
          title="Notas (atalho rápido)"
          className="no-print"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 90,
            width: 48, height: 48, padding: 0,
            background: notesPanelOpen ? T.accent : T.ink,
            color: notesPanelOpen ? '#fff' : T.bg,
            border: 'none', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px -6px rgba(0,0,0,0.3)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!notesPanelOpen) e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {notesPanelOpen ? <X size={18} /> : <NotebookPen size={18} />}
        </button>
      )}

      {/* Blueprint floating button — stacked above the notes button */}
      <button
        onClick={() => setBlueprintOpen(o => !o)}
        title="Vista da loja (blueprint)"
        className="no-print"
        style={{
          position: 'fixed', bottom: view !== 'notes' ? 84 : 24, right: 24, zIndex: 90,
          width: 48, height: 48, padding: 0,
          background: blueprintOpen ? T.accent : T.ink,
          color: blueprintOpen ? '#fff' : T.bg,
          border: 'none', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 20px -6px rgba(0,0,0,0.3)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!blueprintOpen) e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {blueprintOpen ? <X size={18} /> : <MapPin size={18} />}
      </button>

      {/* Notifications floating button — stacked even higher when there are alerts */}
      {notifications.length > 0 && (
        <button
          onClick={() => setNotificationPanelOpen(o => !o)}
          title="Notificações"
          className="no-print"
          style={{
            position: 'fixed',
            bottom: view !== 'notes' ? 144 : 84, right: 24, zIndex: 90,
            width: 48, height: 48, padding: 0,
            background: notificationPanelOpen ? T.accent : T.red,
            color: '#fff',
            border: 'none', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px -6px rgba(232,76,61,0.4)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!notificationPanelOpen) e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {notificationPanelOpen ? <X size={18} /> : <Bell size={18} />}
          {!notificationPanelOpen && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#fff', color: T.red,
              fontSize: 10, fontWeight: 700,
              minWidth: 18, height: 18, borderRadius: 9,
              padding: '0 5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${T.red}`,
            }}>{notifications.length}</span>
          )}
        </button>
      )}

      {/* Notification panel */}
      {notificationPanelOpen && (
        <NotificationPanel
          notifications={notifications}
          periods={periods}
          posters={posters}
          onClose={() => setNotificationPanelOpen(false)}
          onDismiss={handleDismissNotification}
          onJumpToPeriod={(id) => {
            storeSet('campaigns.selectedPeriodId', id);
            setNotificationPanelOpen(false);
            setView('campaigns');
          }}
        />
      )}

      {/* Quick notes side panel */}
      {notesPanelOpen && view !== 'notes' && (
        <NotesPanel
          notes={notes}
          setNotes={setNotesWithTimestamp}
          onClose={() => setNotesPanelOpen(false)}
          onOpenFull={() => { setNotesPanelOpen(false); setView('notes'); }}
        />
      )}

      {/* Blueprint panel */}
      {blueprintOpen && (
        <BlueprintPanel
          campaigns={campaigns}
          defaultLayout={defaultLayout}
          onClose={() => setBlueprintOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SyncIndicator — small visual badge showing cloud sync state
// ─────────────────────────────────────────────────────────────────────────
function SyncIndicator({ status, isOnline }) {
  // Map status → label + color
  let label, color, pulse;
  if (!isOnline) {
    label = 'Offline'; color = T.inkMute; pulse = false;
  } else if (status === 'loading' || status === 'syncing') {
    label = status === 'loading' ? 'A carregar…' : 'A sincronizar…';
    color = T.orange || '#E68A00'; pulse = true;
  } else if (status === 'error') {
    label = 'Erro de sincronização'; color = T.red || '#E74C3C'; pulse = false;
  } else if (status === 'synced') {
    label = 'Sincronizado'; color = T.green || '#5BAF66'; pulse = false;
  } else {
    label = 'Pronto'; color = T.inkMute; pulse = false;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 8px', marginBottom: 10,
      background: T.bgEl, border: `1px solid ${T.line}`,
      borderRadius: 4, fontSize: 10,
    }}>
      <span
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: color,
          animation: pulse ? 'syncPulse 1.4s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      <span className="mono" style={{
        color: T.inkSoft, letterSpacing: '0.05em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <style>{`
        @keyframes syncPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, candidates, onLogout, user, isAdmin, userProfile, uiConfig, notifications, syncStatus, isOnline, theme, toggleTheme, setTheme }) {
  const userRole = userProfile?.role || 'user';
  const notifCount = (notifications || []).length;
  const allItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'sales', label: 'Análise de Vendas', icon: BarChart3, badge: candidates.length || null },
    { id: 'campaigns', label: 'Campanhas', icon: Layers, dot: notifCount > 0 ? notifCount : null },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'changes', label: 'Alterações', icon: GitCompareArrows },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'inventory', label: 'Inventário', icon: ScanLine },
    { id: 'images', label: 'Folhetos', icon: ImageIcon },
    { id: 'pdfs', label: 'PDFs', icon: FileText },
    { id: 'notes', label: 'Notas', icon: NotebookPen },
  ];
  // Filter items by visibility config (admins always see everything)
  const items = allItems.filter(it => canSeeMenuItem(it.id, userRole, isAdmin, uiConfig));
  // Always append admin item at the end if admin
  if (isAdmin) {
    items.push({ id: 'admin', label: 'Administração', icon: Shield, accent: true });
  }

  return (
    <aside className="no-print" style={{
      width: 240, padding: '40px 24px', borderRight: `1px solid ${T.line}`,
      position: 'sticky', top: 0, height: '100vh', background: T.bgEl, flexShrink: 0,
    }}>
      <div style={{ marginBottom: 56 }}>
        <div className="display" style={{ fontSize: 28, lineHeight: 1, fontStyle: 'italic' }}>David Dinis</div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.inkMute, marginTop: 6, textTransform: 'uppercase' }}>
          Gestão de Campanhas
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item, idx) => {
          const { id, label, icon: Icon, badge, accent, dot } = item;
          const active = view === id;
          // Add a separator before the admin entry
          const showSeparator = accent && idx > 0;
          return (
            <React.Fragment key={id}>
              {showSeparator && (
                <div style={{
                  margin: '10px 4px 6px', borderTop: `1px solid ${T.line}`,
                  paddingTop: 8,
                }}>
                  <div className="mono" style={{
                    fontSize: 9, letterSpacing: '0.15em', color: T.inkMute,
                    textTransform: 'uppercase', paddingLeft: 8,
                  }}>Administração</div>
                </div>
              )}
              <button onClick={() => setView(id)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', border: 'none', borderRadius: 6,
                background: active ? (accent ? T.accent : T.ink) : 'transparent',
                color: active ? '#fff' : (accent ? T.accent : T.inkSoft),
                fontSize: 14, fontWeight: 500, textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.lineSoft; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{
                    background: active ? T.accent : T.ink, color: '#fff',
                    fontSize: 10, padding: '2px 6px', borderRadius: 8,
                    minWidth: 18, textAlign: 'center', fontWeight: 500,
                  }}>{badge}</span>
                )}
                {dot && !badge && (
                  <span title={`${dot} notificações`} style={{
                    background: T.red, color: '#fff',
                    fontSize: 10, padding: '2px 6px', borderRadius: 8,
                    minWidth: 18, textAlign: 'center', fontWeight: 600,
                  }}>{dot}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
        <div style={{ padding: 16, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 8 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 6 }}>
            {user ? 'Sessão' : 'Workspace'}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={user?.email || 'David Dinis'}>
            {user?.email || 'David Dinis'}
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, marginTop: 2, marginBottom: 12 }}>
            {candidates.length} candidatos
          </div>
          {user && supabaseEnabled && (
            <SyncIndicator status={syncStatus} isOnline={isOnline} />
          )}
          <div style={{ marginBottom: 8 }}>
            {setTheme && <ThemeSwitcher theme={theme} setTheme={setTheme} compact />}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '6px 8px', fontSize: 11, fontWeight: 500,
                  background: 'transparent', color: T.inkSoft,
                  border: `1px solid ${T.line}`, borderRadius: 4,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.lineSoft; e.currentTarget.style.color = T.ink; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.inkSoft; }}
              >
                <LogOut size={11} /> Sair
              </button>
            )}
          </div>
        </div>
        {/* App version footer */}
        <VersionFooter />
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VersionFooter — shows app version + build date with changelog tooltip
// ─────────────────────────────────────────────────────────────────────────
function VersionFooter() {
  const [showChangelog, setShowChangelog] = useState(false);
  const buildDt = new Date(APP_BUILD_DATE);
  const buildDate = buildDt.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const buildTime = buildDt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <button
        onClick={() => setShowChangelog(true)}
        title="Ver changelog"
        className="no-print"
        style={{
          marginTop: 10, padding: '6px 10px', width: '100%',
          background: 'transparent', color: T.inkMute,
          border: 'none', borderRadius: 4,
          fontSize: 10, fontFamily: 'Geist Mono', letterSpacing: '0.05em',
          cursor: 'pointer', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}
        onMouseEnter={e => e.currentTarget.style.color = T.inkSoft}
        onMouseLeave={e => e.currentTarget.style.color = T.inkMute}
      >
        v{APP_VERSION} · {buildDate} {buildTime}
      </button>
      {showChangelog && <ChangelogDialog onClose={() => setShowChangelog(false)} />}
    </>
  );
}

function ChangelogDialog({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeUp 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 28,
        width: 'min(560px, 92vw)', maxHeight: '70vh', overflowY: 'auto',
        border: `1px solid ${T.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
              Histórico de versões
            </div>
            <h3 className="display" style={{ fontSize: 22, margin: 0, fontStyle: 'italic' }}>v{APP_VERSION}</h3>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: 'transparent', color: T.inkMute, border: 'none' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {APP_CHANGELOG.map((entry, i) => (
            <div key={entry.version} style={{
              padding: 14, background: i === 0 ? T.accentSoft : T.bgEl,
              border: `1px solid ${i === 0 ? T.accent : T.line}`, borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>v{entry.version}</span>
                <span style={{ fontSize: 10, color: T.inkMute }}>{new Date(entry.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                {i === 0 && <span style={{ fontSize: 9, padding: '1px 6px', background: T.accent, color: '#fff', borderRadius: 3, letterSpacing: '0.08em', fontFamily: 'Geist Mono', fontWeight: 600 }}>ATUAL</span>}
              </div>
              <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>{entry.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────
function Header({ eyebrow, title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
      <div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 12 }}>
          {eyebrow}
        </div>
        <h1 className="display" style={{ fontSize: 56, lineHeight: 1, margin: 0, fontStyle: 'italic' }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 16, color: T.inkSoft, marginTop: 14, maxWidth: 620 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DropZone
// ─────────────────────────────────────────────────────────────────────────
function DropZone({ label, hint, accept, onFile, icon: Icon = Upload, compact = false }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); e.dataTransfer.files[0] && onFile(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `1.5px dashed ${drag ? T.accent : T.line}`,
        background: drag ? T.accentSoft : T.bgEl,
        borderRadius: 10, padding: compact ? '20px 24px' : '40px 32px',
        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
      }}>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      <Icon size={compact ? 20 : 28} strokeWidth={1.5} style={{ color: T.inkSoft, marginBottom: compact ? 6 : 12 }} />
      <div style={{ fontSize: compact ? 14 : 16, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.inkMute }}>{hint}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────
function Dashboard({ campaigns, stockRowsPO2, stockRowsPO3, defaultLayout, setView, onExport, onImport, periods, posters, notifications }) {
  const totalSlots = campaigns.reduce((s, c) => s + countSlots(c.floors || []), 0);
  const stats = [
    { label: 'Campanhas', value: campaigns.length || '—', sub: 'carregadas' },
    { label: 'Zonas Loja', value: defaultLayout.reduce((s, f) => s + f.zones.length, 0), sub: 'configuradas' },
    { label: 'Produtos Atribuídos', value: totalSlots || '—', sub: 'em zonas' },
    { label: 'Stock Cruzado', value: stockRowsPO2.length || '—', sub: 'referências' },
  ];

  return (
    <div className="fade-up">
      <Header eyebrow="Início" title="Visão geral" subtitle="Carrega ficheiros, analisa vendas, distribui produtos pelas zonas da loja e gera os materiais finais." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
        {stats.map((s, i) => (
          <div key={s.label} className="fade-up" style={{
            animationDelay: `${i * 60}ms`,
            padding: '24px 20px', background: T.bgEl,
            border: `1px solid ${T.line}`, borderRadius: 10,
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>{s.label}</div>
            <div className="display" style={{ fontSize: 44, lineHeight: 1, marginTop: 12, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: T.inkSoft }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Active campaigns summary */}
      {periods && periods.length > 0 && (
        <ActiveCampaignsSummary periods={periods} posters={posters} setView={setView} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        <div style={{ padding: 32, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: `radial-gradient(circle, ${T.accentSoft} 0%, transparent 70%)` }} />
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.accent, textTransform: 'uppercase', marginBottom: 16 }}>
            Fluxo recomendado
          </div>
          <h2 className="display" style={{ fontSize: 32, margin: 0, marginBottom: 16, fontStyle: 'italic' }}>Começa por aqui.</h2>
          <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: '01', t: 'Analisa vendas e marca candidatos', v: 'sales' },
              { n: '02', t: 'Carrega Excel da campanha', v: 'campaigns' },
              { n: '03', t: 'Atribui produtos a cada zona/móvel', v: 'campaigns' },
              { n: '04', t: 'Cruza com stock loja & armazém', v: 'stock' },
              { n: '05', t: 'Prepara visuais e gera PDFs', v: 'images' },
            ].map(s => (
              <li key={s.n}>
                <button onClick={() => setView(s.v)} style={{
                  display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                  padding: '12px 0', background: 'transparent', border: 'none',
                  borderBottom: `1px solid ${T.lineSoft}`, textAlign: 'left',
                  color: T.ink, transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.paddingLeft = '8px'}
                  onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}>
                  <span className="mono" style={{ fontSize: 11, color: T.inkMute }}>{s.n}</span>
                  <span style={{ flex: 1, fontSize: 15 }}>{s.t}</span>
                  <ChevronRight size={16} strokeWidth={1.5} style={{ color: T.inkMute }} />
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div style={{ padding: 32, background: T.ink, color: T.bg, borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 320 }}>
          <div>
            <Sparkles size={24} strokeWidth={1.5} style={{ color: T.accent }} />
            <h3 className="display" style={{ fontSize: 26, margin: '20px 0 8px', fontStyle: 'italic', color: T.bg }}>Plano de loja vivo.</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#A8A29A', margin: 0 }}>
              Cada produto tem o seu lugar — móvel, cartaz, estado, stock. Tudo num só sítio, sempre atualizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sales Analysis
// ─────────────────────────────────────────────────────────────────────────
function SalesView({ salesData, setSalesData, candidates, setCandidates }) {
  const [search, setSearch] = useStoredState('sales.search', '');
  const [sortBy, setSortBy] = useStoredState('sales.sortBy', 'qty');
  const [sortDir, setSortDir] = useStoredState('sales.sortDir', 'desc');
  const [topOnly, setTopOnly] = useStoredState('sales.topOnly', false);

  const handleFile = async (file) => {
    const buf = await file.arrayBuffer();
    const { headers, rows } = parseExcelSmart(buf, ['EAN', 'ref', 'descrição', 'quantidade']);

    const findCol = (...patterns) => headers.find(h => patterns.some(p => h.toLowerCase().includes(p)));
    const refCol = findCol('ean', 'ref', 'sku', 'cód', 'cod');
    const nameCol = findCol('descri', 'título', 'titulo', 'nome', 'produto', 'artigo');
    const qtyCol = findCol('qtd', 'quant', 'unid', 'pcs', 'venda');
    const revCol = findCol('valor', 'total', 'receita', 'faturação', 'faturacao', 'eur', '€');

    const parsed = rows.map((r, i) => ({
      id: `s-${i}`,
      ref: refCol ? String(r[refCol]) : `#${i + 1}`,
      name: nameCol ? String(r[nameCol]) : 'Produto',
      qty: qtyCol ? Number(r[qtyCol]) || 0 : 0,
      revenue: revCol ? Number(r[revCol]) || 0 : 0,
      raw: r,
    }));

    setSalesData({
      filename: file.name, headers, rows: parsed,
      detected: { refCol, nameCol, qtyCol, revCol },
    });
  };

  const filtered = useMemo(() => {
    if (!salesData) return [];
    let r = salesData.rows.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.ref.toLowerCase().includes(search.toLowerCase())
    );
    r = [...r].sort((a, b) => {
      const av = a[sortBy] ?? 0; const bv = b[sortBy] ?? 0;
      if (typeof av === 'string') return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return topOnly ? r.slice(0, 20) : r;
  }, [salesData, search, sortBy, sortDir, topOnly]);

  const isMarked = (id) => candidates.some(c => c.id === id);
  const toggleCandidate = (item) => {
    setCandidates(c => isMarked(item.id) ? c.filter(x => x.id !== item.id) : [...c, item]);
  };

  const maxQty = useMemo(() => salesData ? Math.max(...salesData.rows.map(r => r.qty)) : 0, [salesData]);

  return (
    <div className="fade-up">
      <Header
        eyebrow="Performance"
        title="Análise de vendas"
        subtitle="Carrega o Excel de vendas. Detetamos quantidades e receitas, ordenamos por mais vendidos, e marcas candidatos para a próxima campanha."
      />

      {!salesData ? (
        <div>
          <DropZone
            label="Arrasta o Excel de vendas"
            hint="aceita .xlsx, .xls, .csv — colunas detetadas: referência, nome, quantidade, valor"
            accept=".xlsx,.xls,.csv"
            onFile={handleFile}
            icon={BarChart3}
          />
          <div style={{ marginTop: 24, padding: 20, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, color: T.inkSoft, lineHeight: 1.7 }}>
            <strong style={{ color: T.ink }}>Como deve estar o Excel:</strong> uma linha por produto, com colunas que contenham palavras como <span className="mono" style={{ background: T.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>ref</span> / <span className="mono" style={{ background: T.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>nome</span> / <span className="mono" style={{ background: T.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>quantidade</span> / <span className="mono" style={{ background: T.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>valor</span>. Os nomes não têm de ser exatos.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, flex: '1 1 280px' }}>
              <Search size={14} style={{ color: T.inkMute }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar produto, referência…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6 }}>
              {[{ id: 'qty', l: 'Quantidade' }, { id: 'revenue', l: 'Receita' }, { id: 'name', l: 'Nome' }].map(s => (
                <button key={s.id} onClick={() => setSortBy(s.id)} style={{
                  padding: '6px 12px', fontSize: 12, borderRadius: 4, border: 'none',
                  background: sortBy === s.id ? T.ink : 'transparent',
                  color: sortBy === s.id ? T.bg : T.inkSoft,
                }}>{s.l}</button>
              ))}
              <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{
                padding: '6px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: T.inkSoft,
                display: 'flex', alignItems: 'center',
              }}>
                {sortDir === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              </button>
            </div>
            <button onClick={() => setTopOnly(t => !t)} style={{
              padding: '8px 14px', fontSize: 12,
              background: topOnly ? T.accent : T.bgEl,
              color: topOnly ? '#fff' : T.ink,
              border: `1px solid ${topOnly ? T.accent : T.line}`,
              borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <TrendingUp size={14} /> Top 20
            </button>
            <button onClick={() => setSalesData(null)} style={{
              padding: '8px 12px', fontSize: 12, background: 'transparent', color: T.inkSoft,
              border: `1px solid ${T.line}`, borderRadius: 6,
            }}>
              <RotateCcw size={12} style={{ display: 'inline', marginRight: 6 }} /> Substituir ficheiro
            </button>
          </div>

          <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <div className="mono" style={{ color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {filtered.length} produtos · {salesData.filename}
              </div>
              {candidates.length > 0 && (
                <div className="mono" style={{ color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                  ★ {candidates.length} candidatos marcados
                </div>
              )}
            </div>
            <div style={{ maxHeight: 600, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: T.bgEl, zIndex: 1 }}>
                  <tr>
                    <th className="mono" style={thStyle}>#</th>
                    <th className="mono" style={thStyle}>REF</th>
                    <th className="mono" style={thStyle}>PRODUTO</th>
                    <th className="mono" style={{ ...thStyle, textAlign: 'right' }}>QTD</th>
                    <th className="mono" style={{ ...thStyle, textAlign: 'right' }}>RECEITA</th>
                    <th className="mono" style={{ ...thStyle, width: 120 }}>VOLUME</th>
                    <th className="mono" style={{ ...thStyle, width: 60, textAlign: 'center' }}>★</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const marked = isMarked(p.id);
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${T.lineSoft}`, background: marked ? T.accentSoft : 'transparent' }}>
                        <td style={{ ...tdStyle, color: T.inkMute }} className="mono">{String(i + 1).padStart(2, '0')}</td>
                        <td style={{ ...tdStyle, color: T.inkSoft }} className="mono">{p.ref}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{p.name}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{p.qty.toLocaleString('pt-PT')}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">€{p.revenue.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>
                          <div style={{ height: 4, background: T.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${maxQty ? (p.qty / maxQty) * 100 : 0}%`, background: T.accent }} />
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button onClick={() => toggleCandidate(p)} style={{
                            background: marked ? T.accent : 'transparent',
                            border: `1px solid ${marked ? T.accent : T.line}`,
                            borderRadius: 4, padding: '4px 8px',
                            color: marked ? '#fff' : T.inkSoft,
                            display: 'inline-flex', alignItems: 'center',
                          }}>
                            <Star size={12} fill={marked ? '#fff' : 'none'} strokeWidth={1.75} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 10, letterSpacing: '0.1em', color: T.inkMute, textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px 16px', whiteSpace: 'nowrap' };

// ─────────────────────────────────────────────────────────────────────────
// Campaigns — Store Layout Planner
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// ImportButton — file picker styled to match other action buttons
// ─────────────────────────────────────────────────────────────────────────
function ImportButton({ onImport }) {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    setBusy(true);
    try {
      const result = await onImport(file);
      if (result?.success) {
        // Quick confirmation toast-like alert
        setTimeout(() => alert(`Importado: ${result.count} ${result.count === 1 ? 'campanha' : 'campanhas'}.`), 100);
      }
    } finally {
      setBusy(false);
      // Reset so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef} type="file" accept=".json,application/json"
        hidden onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 10px', fontSize: 12, fontWeight: 500,
          background: 'transparent', color: T.ink,
          border: `1px solid ${T.line}`, borderRadius: 5,
          cursor: busy ? 'wait' : 'pointer',
        }}
        onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = T.ink; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; }}
      >
        <Upload size={12} /> {busy ? 'A importar…' : 'Importar ficheiro'}
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CampaignsView — main listing/plan/output for campaigns
// ─────────────────────────────────────────────────────────────────────────
function CampaignsView({
  campaigns, setCampaigns,
  periods, onCreatePeriod, onUpdatePeriod, onDeletePeriod, onMoveCampaign, onToggleHidden,
  posters, posterZones, onRefreshPosters, user, isAdmin,
  zoneMemory, setZoneMemory,
  defaultLayout, setDefaultLayout,
  candidates, setCandidates,
  stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3,
  onExport, onImport,
  excludedFamilies = [],
  syncError = null, syncing = false, onClearSyncError,
  cloudDataLoaded = true,
}) {
  // Selected period (null = show periods overview / no period entered)
  const [selectedPeriodId, setSelectedPeriodId] = useStoredState('campaigns.selectedPeriodId', null);
  const [periodDialog, setPeriodDialog] = useState(null); // { mode: 'create'|'edit', period?: ... }
  const [showImportFromPast, setShowImportFromPast] = useState(false);
  // Auto-fill wizard state
  const [autoFillWizard, setAutoFillWizard] = useState(null); // { mode: 'zone'|'global', floorId?, zoneId?, step: 1|2|3, strategy?, rules?, suggestions? }

  const [activeIds, setActiveIds] = useStoredState('campaigns.activeIds', []);
  const [mode, setMode] = useStoredState('campaigns.mode', 'list');
  const [editZones, setEditZones] = useState(false);
  const [columnOverrides, setColumnOverrides] = useState({});
  const [restoreInfo, setRestoreInfo] = useState(null);
  // Local upload status: { kind: 'parsing'|'saving'|'success'|'error', message: string }
  const [uploadStatus, setUploadStatus] = useState(null);
  // History modal: { type: 'period' | 'campaign', id, name }
  const [historyFor, setHistoryFor] = useState(null);
  // Realtime presence — show who else is viewing the same period
  const presencePeers = usePresence(selectedPeriodId ? `period:${selectedPeriodId}` : null, user);
  // Templates manager modal
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Selected period object (null when not in any period)
  const selectedPeriod = useMemo(
    () => selectedPeriodId ? periods.find(p => p.id === selectedPeriodId) : null,
    [selectedPeriodId, periods]
  );

  // If selected period was deleted, fall back to overview
  useEffect(() => {
    if (selectedPeriodId && !periods.find(p => p.id === selectedPeriodId)) {
      setSelectedPeriodId(null);
    }
  }, [selectedPeriodId, periods, setSelectedPeriodId]);

  // Campaigns scoped to current period (or all if no period selected).
  // Excludes stock files (PO2/PO3) — those belong to the global Stock view.
  const scopedCampaigns = useMemo(() => {
    const list = !selectedPeriodId ? campaigns : campaigns.filter(c => c.periodId === selectedPeriodId);
    return list.filter(c => !isStockFile(c));
  }, [campaigns, selectedPeriodId]);

  // Stock-like files mistakenly attached as campaigns — for the "migrate" notice
  const misplacedStockFiles = useMemo(() => {
    return campaigns.filter(c => c.periodId === selectedPeriodId && isStockFile(c));
  }, [campaigns, selectedPeriodId]);

  // Lazy row hydration: when user enters a period, fetch rows ONLY for the
  // campaigns of that period (not all campaigns globally). This is what
  // makes the startup fast in cloud-only mode.
  const hydratedPeriodsRef = useRef(new Set());
  const [hydratingPeriod, setHydratingPeriod] = useState(false);
  useEffect(() => {
    if (!selectedPeriodId) return;
    if (hydratedPeriodsRef.current.has(selectedPeriodId)) return;
    const needRows = scopedCampaigns.filter(c => c.id && (c._needsRows || !c.rows?.length));
    if (needRows.length === 0) {
      hydratedPeriodsRef.current.add(selectedPeriodId);
      return;
    }
    setHydratingPeriod(true);
    cloudFetchCampaignRows(needRows.map(c => c.id)).then(hydrated => {
      const rowsById = new Map(hydrated.map(h => [h.id, h]));
      setCampaigns(prev => prev.map(c => {
        const r = rowsById.get(c.id);
        return r ? { ...c, rows: r.rows, itemCount: r.itemCount, _needsRows: false } : c;
      }));
      hydratedPeriodsRef.current.add(selectedPeriodId);
    }).catch(err => console.warn('[lazy-hydrate] failed', err))
      .finally(() => setHydratingPeriod(false));
  }, [selectedPeriodId, scopedCampaigns, setCampaigns]);

  // Auto-activate ALL campaigns in the period by default (single shared plan)
  useEffect(() => {
    if (scopedCampaigns.length === 0) return;
    setActiveIds(prev => {
      // If user has activated some, keep their choice. Otherwise activate everything.
      if (prev.length > 0 && prev.some(id => scopedCampaigns.some(c => c.id === id))) return prev;
      return scopedCampaigns.map(c => c.id);
    });
  }, [scopedCampaigns]);

  // Drop active IDs that no longer exist or are out of scope (period changed)
  useEffect(() => {
    setActiveIds(ids => ids.filter(id => scopedCampaigns.some(c => c.id === id)));
  }, [scopedCampaigns]);

  const activeCampaigns = useMemo(
    () => activeIds.map(id => scopedCampaigns.find(c => c.id === id)).filter(Boolean),
    [activeIds, scopedCampaigns]
  );
  // PRIMARY CAMPAIGN = oldest campaign in the period (by sortOrder or uploaded date).
  // Its `floors` field is the single source of truth for the period's plan.
  // This is DETERMINISTIC (not user-selectable) so the plan never changes when
  // the user toggles which Excels are active in the listing.
  const primaryCampaign = useMemo(() => {
    if (scopedCampaigns.length === 0) return null;
    const sorted = [...scopedCampaigns].sort((a, b) => {
      const sa = a.sortOrder ?? Infinity;
      const sb = b.sortOrder ?? Infinity;
      if (sa !== sb) return sa - sb;
      const ua = a.uploaded ? new Date(a.uploaded).getTime() : 0;
      const ub = b.uploaded ? new Date(b.uploaded).getTime() : 0;
      return ua - ub; // oldest first
    });
    return sorted[0];
  }, [scopedCampaigns]);

  // Merged campaign: combines rows from all active campaigns into a single
  // virtual campaign for EAN→produto lookup in SlotRow / OutputPreview / etc.
  // Uses the primary's headers as the canonical column set; rows from other
  // active campaigns are remapped to those headers when keys differ.
  const mergedActiveCampaign = useMemo(() => {
    if (!primaryCampaign) return null;
    if (activeCampaigns.length <= 1) return primaryCampaign;
    const filteredPrimary = filterRowsByFamily(primaryCampaign.rows || [], primaryCampaign.headers, excludedFamilies);
    const seenEans = new Set();
    const cols = detectColumns(primaryCampaign.headers || []);
    const eanCol = cols.ean;
    if (eanCol) {
      filteredPrimary.forEach(r => {
        const k = normalizeEAN(r[eanCol]);
        if (k) seenEans.add(k);
      });
    }
    // Append rows from other active campaigns whose EAN isn't already covered
    const extraRows = [];
    for (const c of activeCampaigns) {
      if (c.id === primaryCampaign.id) continue;
      const filtered = filterRowsByFamily(c.rows || [], c.headers, excludedFamilies);
      const otherCols = detectColumns(c.headers || []);
      if (!otherCols.ean) continue;
      filtered.forEach(r => {
        const k = normalizeEAN(r[otherCols.ean]);
        if (!k || seenEans.has(k)) return;
        seenEans.add(k);
        // Remap to primary headers when names match; else keep original keys
        const remapped = {};
        for (const h of primaryCampaign.headers || []) {
          // Try direct match by header name first
          if (r[h] !== undefined) {
            remapped[h] = r[h];
          } else {
            // Try matching by detected role
            const roleEntries = Object.entries(otherCols);
            const roleMatch = roleEntries.find(([role, header]) => cols[role] === h && r[header] !== undefined);
            if (roleMatch) remapped[h] = r[roleMatch[1]];
          }
        }
        extraRows.push(remapped);
      });
    }
    return {
      ...primaryCampaign,
      rows: [...filteredPrimary, ...extraRows],
      headers: primaryCampaign.headers,
    };
  }, [primaryCampaign, activeCampaigns, excludedFamilies]);

  // ─── PLAN OWNERSHIP: PERIOD ─────────────────────────────────────────
  // The plan (floors) lives on the PERIOD, not on any specific Excel.
  // Falls back to: oldest campaign's floors (legacy data) → defaultLayout.
  // This means uploading/deleting Excels never breaks the plan.
  const floors = useMemo(() => {
    if (selectedPeriod?.floors && Array.isArray(selectedPeriod.floors) && selectedPeriod.floors.length > 0) {
      return selectedPeriod.floors;
    }
    // Legacy fallback: use oldest campaign's floors (for periods that haven't migrated yet)
    if (primaryCampaign?.floors && Array.isArray(primaryCampaign.floors) && primaryCampaign.floors.length > 0) {
      return primaryCampaign.floors;
    }
    return defaultLayout;
  }, [selectedPeriod?.floors, primaryCampaign?.floors, defaultLayout]);

  // Output uses the same period-level plan (no merging of multiple campaign plans)
  const combinedFloors = floors;

  // setFloors writes to the PERIOD (cloud + IDB via onUpdatePeriod).
  // If no period is selected, fall back to defaultLayout (global).
  const setFloors = useCallback((updater) => {
    if (!selectedPeriod) {
      setDefaultLayout(prev => typeof updater === 'function' ? updater(prev) : updater);
      return;
    }
    const next = typeof updater === 'function' ? updater(floors) : updater;
    onUpdatePeriod && onUpdatePeriod(selectedPeriod.id, { floors: next });
  }, [selectedPeriod, floors, onUpdatePeriod, setDefaultLayout]);

  const setOverride = (campaignId, field, header) => {
    setColumnOverrides(o => ({
      ...o,
      [campaignId]: { ...(o[campaignId] || {}), [field]: header || undefined },
    }));
  };

  const toggleActive = useCallback((id) => {
    setActiveIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }, []);

  const setOnlyActive = useCallback((id) => {
    setActiveIds([id]);
  }, []);

  const handleFile = async (file) => {
    if (!file) {
      setUploadStatus({ kind: 'error', message: 'Nenhum ficheiro recebido.' });
      return;
    }
    console.log('[upload] start', file.name, file.size, 'bytes');
    setUploadStatus({ kind: 'parsing', message: `A ler "${file.name}"…` });

    let buf, headers, rows, key;
    try {
      buf = await file.arrayBuffer();
    } catch (e) {
      console.error('[upload] arrayBuffer failed', e);
      setUploadStatus({ kind: 'error', message: `Erro ao ler o ficheiro: ${e?.message || e}. Pode ser uma extensão do browser a interferir — tenta noutro browser ou em modo anónimo.` });
      return;
    }

    try {
      const expected = ['EAN', 'Descrição/Título', 'Des_Fam1', 'PVP Base FNAC', 'PVP Campanha'];
      ({ headers, rows } = parseExcelSmart(buf, expected));
      key = campaignKeyFromFilename(file.name);
      if (!rows || rows.length === 0) {
        setUploadStatus({ kind: 'error', message: 'O Excel parece estar vazio ou os cabeçalhos não foram reconhecidos.' });
        return;
      }
      console.log('[upload] parsed', rows.length, 'rows,', headers.length, 'cols');
    } catch (e) {
      console.error('[upload] parse failed', e);
      setUploadStatus({ kind: 'error', message: `Erro ao processar o Excel: ${e?.message || e}` });
      return;
    }

    // If a campaign with the same key is already loaded, replace its rows + headers
    // and ALWAYS align its periodId with the currently selected period (fixes the
    // case where re-uploading inside period X kept the campaign in period Y).
    const existingInSession = campaigns.find(c => c.key === key);
    if (existingInSession) {
      const targetPeriodId = selectedPeriodId || existingInSession.periodId || null;
      const movedFromOtherPeriod = existingInSession.periodId && existingInSession.periodId !== targetPeriodId;
      const updated = {
        ...existingInSession,
        rows, headers,
        itemCount: rows.length,
        uploaded: new Date(),
        periodId: targetPeriodId,
        updatedAt: new Date().toISOString(),
      };
      setCampaigns(cs => cs.map(c => c.id === existingInSession.id ? updated : c));
      setActiveIds(ids => ids.includes(existingInSession.id) ? ids : [...ids, existingInSession.id]);
      setUploadStatus({
        kind: 'success',
        message: movedFromOtherPeriod
          ? `"${file.name}" movido para este período — ${rows.length} produtos. A guardar na cloud…`
          : `"${file.name}" actualizado — ${rows.length} produtos. A guardar na cloud…`,
      });
      setTimeout(() => setUploadStatus(null), 4000);
      return;
    }

    // Otherwise check IndexedDB for saved progress
    let savedFloors = null;
    let savedSlotCount = 0;
    try {
      const all = await idbGetAll();
      const found = all.find(it => it.key === key);
      if (found && found.floors) {
        savedFloors = found.floors;
        savedSlotCount = countSlots(savedFloors);
      }
    } catch {}

    // Apply zone memory: pre-fill floors with suggested positions from history
    let initialFloors = savedFloors || defaultLayout;
    let memoryHits = 0;
    if (!savedFloors && zoneMemory && zoneMemory.size > 0) {
      // Build a structure with slots based on memory hits
      const cols = detectColumns(headers);
      initialFloors = layoutOnly(defaultLayout); // start with empty zones
      const zonesById = new Map();
      initialFloors.forEach(f => f.zones.forEach(z => zonesById.set(z.id, { zone: z, floor: f })));

      rows.forEach(r => {
        const ean = String(r[cols.ean] ?? '').trim();
        const k = normalizeEAN(ean);
        if (!k) return;
        const memoryEntry = zoneMemory.get(k);
        if (!memoryEntry) return;
        const target = zonesById.get(memoryEntry.zoneId);
        if (!target) return; // zone no longer exists
        // Skip if this EAN is already in this zone
        if (target.zone.slots.some(s => normalizeEAN(s.ref) === k)) return;
        target.zone.slots.push({
          ref: ean,
          status: 'sugerido',
          notes: 'auto: memória',
        });
        memoryHits++;
      });

      if (memoryHits === 0) {
        // No hits — fall back to plain default layout
        initialFloors = defaultLayout;
      }
    }

    const c = {
      id: Date.now(),
      key,
      name: key,
      uploaded: new Date(),
      rows, headers, itemCount: rows.length,
      floors: initialFloors,
      periodId: selectedPeriodId || null,
    };

    if (savedFloors && savedSlotCount > 0) {
      setRestoreInfo({ tempCampaign: c, savedFloors, count: savedSlotCount });
      setUploadStatus({ kind: 'success', message: `"${file.name}" carregado — ${rows.length} produtos. Confirma se queres restaurar o plano anterior.` });
      setTimeout(() => setUploadStatus(null), 5000);
    } else {
      setCampaigns(p => [c, ...p]);
      setActiveIds(ids => [c.id, ...ids]);
      setUploadStatus({ kind: 'success', message: `"${file.name}" carregado — ${rows.length} produtos. A guardar na cloud…` });
      setTimeout(() => setUploadStatus(null), 4000);
      if (memoryHits > 0) {
        setTimeout(() => alert(`A memória de zonas pré-atribuiu ${memoryHits} ${memoryHits === 1 ? 'produto' : 'produtos'} com base em campanhas anteriores. Confirma na vista "Plano".`), 200);
      }
    }
  };

  const confirmRestore = (restore) => {
    const { tempCampaign, savedFloors } = restoreInfo;
    const c = restore ? { ...tempCampaign, floors: savedFloors } : tempCampaign;
    setCampaigns(p => [c, ...p]);
    setActiveIds(ids => [c.id, ...ids]);
    setRestoreInfo(null);
  };

  // Zone management — operate on primary campaign's floors (or defaultLayout)
  const addZone = (floorId) => {
    const name = prompt('Nome da zona/móvel:');
    if (!name) return;
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: [...f.zones, { id: `z-${Date.now()}`, name, slots: [] }] } : f));
  };
  const renameZone = (floorId, zoneId, name) => {
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: f.zones.map(z => z.id === zoneId ? { ...z, name } : z) } : f));
  };
  const deleteZone = (floorId, zoneId) => {
    if (!confirm('Eliminar esta zona e todos os seus produtos?')) return;
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: f.zones.filter(z => z.id !== zoneId) } : f));
  };
  const addFloor = () => {
    const name = prompt('Nome do piso:');
    if (!name) return;
    setFloors(fs => [...fs, { id: `f-${Date.now()}`, name, color: T.purple, zones: [] }]);
  };

  // Delete a campaign and its IndexedDB record
  const deleteCampaign = async (campaignId) => {
    const c = campaigns.find(x => x.id === campaignId);
    if (!c) return;
    if (!confirm(`Eliminar definitivamente "${c.name}"?\n\nApaga local + cloud + IDB. Não pode ser desfeito.`)) return;
    // Tombstone first so periodic refresh doesn't resurrect
    addTombstone('campaign', c.id);
    // Local state
    setCampaigns(cs => cs.filter(x => x.id !== campaignId));
    setActiveIds(ids => ids.filter(id => id !== campaignId));
    // IDB (try both key and id since old code stored by key)
    if (c.key) { try { await idbDelete(c.key); } catch {} }
    if (c.id) { try { await idbDelete(c.id); } catch {} }
    // Cloud — only attempts if id is a UUID (cloud-assigned)
    if (isUUID(String(c.id))) {
      try {
        const res = await cloudDeleteCampaign(c.id);
        if (!res?.ok) console.warn('[delete] cloud delete returned not-ok', res);
      } catch (e) {
        console.warn('[delete] cloud delete failed', e);
      }
    }
    // Activity log
    if (user) {
      logActivity({
        userId: user.id, userEmail: user.email,
        action: 'delete', resourceType: 'campaign',
        resourceId: c.id, resourceName: c.name,
      });
    }
  };

  // Reorder a campaign within its period (up or down). Order controls dedup priority & primary.
  const reorderCampaign = useCallback((campaignId, direction) => {
    setCampaigns(prev => {
      const scopedIdxs = prev.reduce((acc, c, i) => {
        if (c.periodId === selectedPeriodId) acc.push(i);
        return acc;
      }, []);
      const posInScoped = scopedIdxs.findIndex(i => prev[i].id === campaignId);
      if (posInScoped < 0) return prev;
      const targetPos = direction === 'up' ? posInScoped - 1 : posInScoped + 1;
      if (targetPos < 0 || targetPos >= scopedIdxs.length) return prev;
      const result = [...prev];
      const idxA = scopedIdxs[posInScoped];
      const idxB = scopedIdxs[targetPos];
      [result[idxA], result[idxB]] = [result[idxB], result[idxA]];
      // Stamp sortOrder on all campaigns in this period so cloud sync preserves order
      scopedIdxs.forEach((globalIdx, pos) => {
        result[globalIdx] = { ...result[globalIdx], sortOrder: pos, updatedAt: new Date().toISOString() };
      });
      // Persist immediately (don't wait for 30s poll)
      if (user && supabase) {
        setTimeout(() => {
          scopedIdxs.forEach((_, pos) => {
            const c = result[scopedIdxs[pos]];
            cloudUpsertCampaign({ ...c, user_id: c.user_id || user.id }, user.id).catch(() => {});
          });
        }, 0);
      }
      return result;
    });
  }, [selectedPeriodId, user]);

  // Rename a campaign
  const renameCampaign = useCallback((campaignId, newName) => {
    if (!newName?.trim()) return;
    setCampaigns(cs => cs.map(c => c.id === campaignId ? { ...c, name: newName.trim() } : c));
  }, []);

  // Track which campaign is being renamed inline
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Slot management
  const addSlot = (floorId, zoneId) => {
    const newSlot = { id: `s-${Date.now()}`, ref: '', name: '', cartaz: 'A3 HORIZONTAL', state: 'pending', date: '', campaign: '', observations: '', stockPO2: '', stockPO3: '', pedidoGU: '', star: false };
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: f.zones.map(z => z.id === zoneId ? { ...z, slots: [...z.slots, newSlot] } : z) } : f));
  };
  const updateSlot = (floorId, zoneId, slotId, patch) => {
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: f.zones.map(z => z.id === zoneId ? { ...z, slots: z.slots.map(s => s.id === slotId ? { ...s, ...patch } : s) } : z) } : f));
  };
  const deleteSlot = (floorId, zoneId, slotId) => {
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: f.zones.map(z => z.id === zoneId ? { ...z, slots: z.slots.filter(s => s.id !== slotId) } : z) } : f));
  };

  // Add product from listing to zone (pre-fills with EAN + description + stock)
  const addProductToZone = useCallback((floorId, zoneId, product) => {
    const newSlot = {
      id: `s-${Date.now()}`,
      ref: String(product.ean || ''),
      name: String(product.description || ''),
      family: String(product.family || ''),
      subfamily: String(product.subfamily || ''),
      basePrice: product.basePrice || '',
      campaignPrice: product.campaignPrice || '',
      discount: product.discount || 0,
      cartaz: 'A3 HORIZONTAL',
      state: 'pending',
      date: String(product.startDate || ''),
      endDate: String(product.endDate || ''),
      campaign: '',
      observations: '',
      stockPO2: String(product.stockPO2 ?? ''),
      stockPO3: String(product.stockPO3 ?? ''),
      pedidoGU: '',
      star: !!product.isStar,
    };
    setFloors(fs => fs.map(f => f.id === floorId ? { ...f, zones: f.zones.map(z => z.id === zoneId ? { ...z, slots: [...z.slots, newSlot] } : z) } : f));
  }, [setFloors]);

  // MOVE product to a zone (removes from any other zone first). null = unassign.
  const setProductPrimaryZone = useCallback((product, target) => {
    const ean = String(product.ean || '').trim();
    if (!ean) return;
    setFloors(fs => fs.map(f => ({
      ...f,
      zones: f.zones.map(z => {
        const filtered = z.slots.filter(s => String(s.ref || '').trim() !== ean);
        if (target && target.floorId === f.id && target.zoneId === z.id) {
          return {
            ...z,
            slots: [...filtered, {
              id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ref: ean,
              name: String(product.description || ''),
              cartaz: 'A3 HORIZONTAL',
              state: 'pending',
              date: String(product.startDate || ''),
              campaign: '',
              observations: '',
              stockPO2: String(product.stockPO2 ?? ''),
              stockPO3: String(product.stockPO3 ?? ''),
              pedidoGU: '',
              star: !!product.isStar,
            }],
          };
        }
        return { ...z, slots: filtered };
      }),
    })));
  }, [setFloors]);

  // ─── Auto-fill handlers ─────────────────────────────────────────────────
  // Compute suggestions for a single zone and open preview
  // ─── Auto-fill wizard handlers ─────────────────────────────────────────
  // Open the wizard at step 1. mode = 'zone' or 'global'
  const openAutoFillWizard = useCallback((mode, floorId = null, zoneId = null) => {
    if (!primaryCampaign) {
      alert('Carrega primeiro um Excel de campanha para usar o auto-preenchimento.');
      return;
    }
    const columns = detectColumns(primaryCampaign.headers);
    if (!columns.ean) {
      alert('Não foi possível detetar a coluna EAN no Excel.');
      return;
    }
    setAutoFillWizard({
      mode, floorId, zoneId, step: 1,
      strategy: null, rules: null, suggestions: null,
    });
  }, [primaryCampaign]);

  // Generate suggestions based on wizard state (called at step 2 → step 3)
  const generateAutoFillSuggestions = useCallback((wizardState) => {
    const { mode, floorId, zoneId, strategy, rules } = wizardState;
    const columns = detectColumns(primaryCampaign.headers);

    const { index: stockIdxPO2 } = buildStockIndex(stockRowsPO2, stockMapPO2);
    const { index: stockIdxPO3 } = buildStockIndex(stockRowsPO3, stockMapPO3);

    // Build effective strategy with filters from rules
    const effStrategy = {
      ...strategy,
      minDiscount: rules?.minDiscount || 0,
      minStock: rules?.minStock || 0,
      maxPrice: rules?.maxPrice || 0,
    };

    // Build a virtual zone-config for filtering
    const buildEffectiveZone = (zone) => {
      const perZone = rules?.perZone?.[zone.id] || {};
      return {
        ...zone,
        autoFillConfig: {
          enabled: true,
          capacityMin: perZone.capacityMin ?? rules?.capacityMin ?? 1,
          capacityMax: perZone.capacityMax ?? rules?.capacityMax ?? 8,
          preferredFamilies: perZone.preferredFamilies ?? rules?.preferredFamilies ?? [],
          allocatedFamilies: perZone.allocatedFamilies ?? [],
          restrictedFamilies: perZone.restrictedFamilies ?? [],
          restrictedSubfamilies: perZone.restrictedSubfamilies ?? [],
          minDiscount: perZone.minDiscount ?? rules?.minDiscount ?? 0,
          minStock: perZone.minStock ?? rules?.minStock ?? 0,
          maxPrice: perZone.maxPrice ?? rules?.maxPrice ?? 0,
          weights: null,
        },
      };
    };

    if (mode === 'zone') {
      const floor = floors.find(f => f.id === floorId);
      const zone = floor?.zones.find(z => z.id === zoneId);
      if (!zone) return new Map();

      const combined = new Map();
      for (const [e, q] of stockIdxPO2) combined.set(e, (combined.get(e) || 0) + q);
      for (const [e, q] of stockIdxPO3) combined.set(e, (combined.get(e) || 0) + q);

      const usedEans = new Set();
      floors.forEach(f => f.zones.forEach(z => z.slots.forEach(s => {
        const e = normalizeEAN(s.ref);
        if (e) usedEans.add(e);
      })));

      const filteredRows = filterRowsByFamily(primaryCampaign.rows, primaryCampaign.headers, excludedFamilies);
      const suggestions = suggestForZone({
        zone: buildEffectiveZone(zone),
        products: filteredRows, columns,
        stockIndex: combined, excludeEans: usedEans,
        strategy: effStrategy,
      });

      const map = new Map();
      if (suggestions.length > 0) map.set(`${floorId}:${zoneId}`, suggestions);
      return map;
    }

    // Global: all empty zones
    const filteredRows = filterRowsByFamily(primaryCampaign.rows, primaryCampaign.headers, excludedFamilies);
    const enrichedFloors = floors.map(f => ({ ...f, zones: f.zones.map(buildEffectiveZone) }));
    return suggestForAllZones({
      floors: enrichedFloors, products: filteredRows, columns,
      stockPO2Index: stockIdxPO2, stockPO3Index: stockIdxPO3,
      strategy: effStrategy, onlyEmpty: true,
    });
  }, [floors, primaryCampaign, stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, excludedFamilies]);

  // Apply accepted suggestions to floors (creates slots)
  const handleApplySuggestions = useCallback((acceptedMap) => {
    // Build PO2/PO3 indexes so we can populate stock fields in created slots
    const { index: _idxPO2 } = buildStockIndex(stockRowsPO2 || [], stockMapPO2 || {});
    const { index: _idxPO3 } = buildStockIndex(stockRowsPO3 || [], stockMapPO3 || {});

    setFloors(prev => prev.map(f => ({
      ...f,
      zones: f.zones.map(z => {
        const key = `${f.id}:${z.id}`;
        const accepted = acceptedMap.get(key);
        if (!accepted || accepted.length === 0) return z;
        const _cols = detectColumns(primaryCampaign.headers);
        const newSlots = accepted.map(sg => {
          const eanKey = normalizeEAN(sg.ean);
          const basePriceVal = _cols.basePrice ? parseNum(sg.product[_cols.basePrice]) : 0;
          const campPriceVal = _cols.campaignPrice ? parseNum(sg.product[_cols.campaignPrice]) : 0;
          const explicitDisc = _cols.discount ? parseNum(sg.product[_cols.discount]) : 0;
          const calcDisc = (basePriceVal > 0 && campPriceVal > 0 && campPriceVal < basePriceVal)
            ? ((basePriceVal - campPriceVal) / basePriceVal) * 100 : 0;
          const startDateVal = _cols.startDate ? sg.product[_cols.startDate] : '';
          const endDateVal = _cols.endDate ? sg.product[_cols.endDate] : '';
          return {
            id: 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            ref: sg.product[_cols.ean] || sg.ean,
            name: _cols.description ? String(sg.product[_cols.description] || '') : '',
            family: _cols.family ? String(sg.product[_cols.family] || '') : '',
            subfamily: _cols.subfamily ? String(sg.product[_cols.subfamily] || '') : '',
            basePrice: basePriceVal || '',
            campaignPrice: campPriceVal || '',
            discount: explicitDisc >= 0.5 ? explicitDisc : (calcDisc > 0 ? calcDisc : 0),
            startDate: startDateVal ? String(startDateVal) : '',
            endDate: endDateVal ? String(endDateVal) : '',
            state: 'sugerido',
            cartaz: 'A3 HORIZONTAL',
            date: startDateVal ? String(startDateVal) : '',
            campaign: '',
            observations: '',
            stockPO2: String(_idxPO2.get(eanKey) ?? ''),
            stockPO3: String(_idxPO3.get(eanKey) ?? ''),
            pedidoGU: '', star: false,
            notes: `auto: ${sg.reasons.join(', ') || 'auto-preenchido'}`,
          };
        });
        return { ...z, slots: [...z.slots, ...newSlots] };
      }),
    })));

    if (user) {
      const totalAccepted = Array.from(acceptedMap.values()).reduce((s, arr) => s + arr.length, 0);
      logActivity({
        userId: user.id, userEmail: user.email,
        action: 'update', resourceType: 'campaign',
        resourceName: primaryCampaign?.name,
        metadata: { autoFilled: totalAccepted, zones: acceptedMap.size },
      });
    }
    setAutoFillWizard(null);
  }, [setFloors, primaryCampaign, user, stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3]);

  // Cleanup orphan slots: remove slots whose EAN isn't in the active campaign rows
  const cleanupOrphanSlots = useCallback(() => {
    if (!primaryCampaign) {
      alert('Carrega uma campanha primeiro.');
      return;
    }
    const cols = detectColumns(primaryCampaign.headers);
    if (!cols.ean) {
      alert('Não foi detectada coluna EAN na campanha activa.');
      return;
    }
    // Build set of valid EANs from current campaign
    const validEans = new Set();
    for (const r of (primaryCampaign.rows || [])) {
      const k = normalizeEAN(r[cols.ean]);
      if (k) validEans.add(k);
    }
    let removed = 0;
    setFloors(prev => prev.map(f => ({
      ...f,
      zones: f.zones.map(z => {
        const filtered = z.slots.filter(s => {
          const eanKey = normalizeEAN(s.ref);
          if (!eanKey) return true; // keep empty/manual slots
          if (validEans.has(eanKey)) return true;
          removed++;
          return false;
        });
        return { ...z, slots: filtered };
      }),
    })));
    setTimeout(() => {
      alert(removed === 0
        ? 'Todos os slots já correspondem a artigos da campanha activa.'
        : `Removidos ${removed} slot${removed === 1 ? '' : 's'} órfão${removed === 1 ? '' : 's'} (EAN não existe na campanha "${primaryCampaign.name}").`);
    }, 50);
  }, [primaryCampaign, setFloors]);

  return (
    <div className="fade-up">
      {/* Misplaced stock files banner */}
      {misplacedStockFiles.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.yellow, color: '#1A1A1A',
          padding: '10px 14px', marginBottom: 12, borderRadius: 6, fontSize: 12, lineHeight: 1.5,
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            <strong>{misplacedStockFiles.length} ficheiro{misplacedStockFiles.length === 1 ? '' : 's'} de stock</strong> aparec{misplacedStockFiles.length === 1 ? 'e' : 'em'} associado{misplacedStockFiles.length === 1 ? '' : 's'} a este período por engano. Os ficheiros PO2/PO3 são <strong>globais</strong> e devem ser carregados na vista <em>Stock</em>.
          </span>
          <button
            onClick={async () => {
              if (!confirm(`Remover ${misplacedStockFiles.length} ficheiro(s) de stock deste período?\n\nIsto apaga-os do registo de campanhas (não afecta o stock global na vista Stock).`)) return;
              for (const c of misplacedStockFiles) {
                addTombstone('campaign', c.id);
                if (isUUID(String(c.id))) {
                  try { await cloudDeleteCampaign(c.id); } catch (e) { console.warn('[stock-cleanup] cloud delete failed', e); }
                }
              }
              setCampaigns(cs => cs.filter(c => !misplacedStockFiles.some(s => s.id === c.id)));
            }}
            style={{
              padding: '5px 10px', background: '#1A1A1A', color: '#fff',
              border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Remover deste período
          </button>
        </div>
      )}

      {/* Cloud sync error banner */}
      {syncError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#b91c1c', color: '#fff',
          padding: '10px 16px', marginBottom: 12, borderRadius: 6, fontSize: 13,
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>⚠ {syncError}</span>
          <button onClick={onClearSyncError} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
          }}>Dispensar</button>
        </div>
      )}
      {/* Loading indicator while lazy-hydrating period rows */}
      {hydratingPeriod && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: T.inkSoft, marginBottom: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.cyan, display: 'inline-block', animation: 'pulse 1s infinite' }} />
          A carregar artigos da campanha…
        </div>
      )}
      {/* Saving indicator */}
      {syncing && !syncError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: T.inkMute, marginBottom: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, display: 'inline-block', animation: 'pulse 1s infinite' }} />
          A guardar na cloud…
        </div>
      )}
      {/* Upload status banner */}
      {uploadStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: uploadStatus.kind === 'error' ? '#b91c1c'
                    : uploadStatus.kind === 'success' ? T.green
                    : T.bgEl,
          color: uploadStatus.kind === 'error' || uploadStatus.kind === 'success' ? '#fff' : T.ink,
          border: uploadStatus.kind === 'parsing' ? `1px solid ${T.line}` : 'none',
          padding: '10px 14px', marginBottom: 12, borderRadius: 6, fontSize: 13,
        }}>
          {uploadStatus.kind === 'parsing' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, animation: 'pulse 1s infinite' }} />}
          {uploadStatus.kind === 'success' && <Check size={15} />}
          {uploadStatus.kind === 'error' && <AlertTriangle size={15} />}
          <span style={{ flex: 1 }}>{uploadStatus.message}</span>
          {(uploadStatus.kind === 'error' || uploadStatus.kind === 'success') && (
            <button onClick={() => setUploadStatus(null)} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
            }}>Dispensar</button>
          )}
        </div>
      )}
      {/* Period overview: shown when no period is selected */}
      {!selectedPeriod ? (
        <PeriodsOverview
          periods={periods}
          campaigns={campaigns}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onEnterPeriod={(id) => setSelectedPeriodId(id)}
          onCreate={() => setPeriodDialog({ mode: 'create' })}
          onEdit={(p) => setPeriodDialog({ mode: 'edit', period: p })}
          onDelete={onDeletePeriod}
          onToggleHidden={onToggleHidden}
          cloudDataLoaded={cloudDataLoaded}
        />
      ) : (
      <>
      <div className="no-print">
      {/* Period header bar with back button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        padding: '12px 16px', background: T.bgEl, border: `1px solid ${T.line}`,
        borderRadius: 10,
      }}>
        <button onClick={() => setSelectedPeriodId(null)} title="Voltar à lista de campanhas" style={{
          padding: 6, background: 'transparent', color: T.inkSoft,
          border: `1px solid ${T.line}`, borderRadius: 6,
          display: 'flex', alignItems: 'center', cursor: 'pointer',
        }}>
          <ArrowLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase' }}>
            {PERIOD_STATUS_LABEL[periodStatus(selectedPeriod)]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <div className="display" style={{ fontSize: 22, fontStyle: 'italic', lineHeight: 1 }}>
              {selectedPeriod.name}
            </div>
            <span style={{
              fontSize: 11, color: T.inkSoft, padding: '2px 8px',
              background: T.bg, border: `1px solid ${T.line}`, borderRadius: 4,
            }}>
              {formatPeriodDates(selectedPeriod)}
            </span>
          </div>
        </div>
        <button onClick={() => setPeriodDialog({ mode: 'edit', period: selectedPeriod })} title="Editar campanha" style={{
          padding: '6px 10px', background: 'transparent', color: T.inkSoft,
          border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Pencil size={11} /> Editar
        </button>
        <button onClick={() => setHistoryFor({ type: 'period', id: selectedPeriod.id, name: selectedPeriod.name })} title="Histórico de alterações" style={{
          padding: '6px 10px', background: 'transparent', color: T.inkSoft,
          border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Activity size={11} /> Histórico
        </button>
        <button onClick={() => setTemplatesOpen(true)} title="Guardar/aplicar templates de plano" style={{
          padding: '6px 10px', background: 'transparent', color: T.inkSoft,
          border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Layers size={11} /> Templates
        </button>
        <PresenceIndicator peers={presencePeers} currentUserId={user?.id} />
        {scopedCampaigns.length === 0 && periods.length > 1 && (
          <button onClick={() => setShowImportFromPast(true)} title="Importar zonas/produtos de campanhas anteriores" style={{
            padding: '6px 10px', background: T.accent, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 11,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Sparkles size={11} /> Importar de campanha passada
          </button>
        )}
        {primaryCampaign && (
          <button onClick={() => openAutoFillWizard('global')} title="Auto-preencher móveis vazios" style={{
            padding: '6px 10px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 6, fontSize: 11,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Sparkles size={11} /> Auto-preencher campanha
          </button>
        )}
        {primaryCampaign && (
          <button onClick={cleanupOrphanSlots} title="Remove slots cujo EAN não existe na campanha activa" style={{
            padding: '6px 10px', background: 'transparent', color: T.accent,
            border: `1px solid ${T.accent}40`, borderRadius: 6, fontSize: 11,
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          }}>
            <Trash2 size={11} /> Limpar órfãos
          </button>
        )}
      </div>

      {/* Posters section — only visible if period has the toggle ON */}
      {selectedPeriod.has_posters && (
        <PostersSection
          period={selectedPeriod}
          posters={(posters || []).filter(p => p.period_id === selectedPeriod.id)}
          posterZones={posterZones || []}
          user={user}
          onRefresh={onRefreshPosters}
        />
      )}

      <Header
        eyebrow="Plano de Loja"
        title="Campanhas"
        subtitle="Carrega a campanha, atribui cada produto a uma zona/móvel da loja, define cartaz, estado e stock. O resultado fica estruturado e pronto a imprimir."
        action={
          <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
            {[
              { id: 'list', l: 'Listagem', icon: ListTree },
              { id: 'plan', l: 'Plano', icon: Layers },
              { id: 'output', l: 'Saída', icon: Eye },
              { id: 'pedido', l: 'Pedido GU', icon: Warehouse },
            ].map(m => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 6,
                  background: active ? T.ink : 'transparent',
                  color: active ? T.bg : T.inkSoft,
                  border: 'none', fontSize: 13, fontWeight: 500,
                  transition: 'all 0.15s',
                }}>
                  <Icon size={13} />
                  {m.l}
                </button>
              );
            })}
          </div>
        }
      />

      {/* Campaign uploads */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
        <DropZone label={selectedPeriod ? `Adicionar Excel a "${selectedPeriod.name}"` : "Adicionar campanha"} hint=".xlsx, .xls, .csv" accept=".xlsx,.xls,.csv" onFile={handleFile} icon={Plus} compact />
        <div style={{ padding: 16, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: T.inkMute, textTransform: 'uppercase' }}>
              Excels desta campanha ({scopedCampaigns.length})
            </span>
            {scopedCampaigns.length > 1 && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setActiveIds(scopedCampaigns.map(c => c.id))}
                  style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}
                  title="Selecionar todas">Todas</button>
                <button
                  onClick={() => setActiveIds([])}
                  style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}
                  title="Desselecionar todas">Nenhuma</button>
              </div>
            )}
          </div>
          {scopedCampaigns.length === 0 ? (
            <div>
              <div style={{ fontSize: 13, color: T.inkMute, marginBottom: 8 }}>nenhum Excel ainda</div>
              {(() => {
                const elsewhere = campaigns.filter(c => c.periodId !== selectedPeriodId);
                if (elsewhere.length === 0) return null;
                // Group by period name
                const byPeriod = new Map();
                elsewhere.forEach(c => {
                  const p = periods.find(pp => pp.id === c.periodId);
                  const name = p?.name || 'Sem período';
                  if (!byPeriod.has(name)) byPeriod.set(name, []);
                  byPeriod.get(name).push(c);
                });
                return (
                  <div style={{
                    marginTop: 8, padding: '10px 12px', fontSize: 11,
                    background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6,
                    color: T.inkSoft, lineHeight: 1.5,
                  }}>
                    <div style={{ fontWeight: 500, color: T.ink, marginBottom: 6 }}>
                      📂 Tens {elsewhere.length} ficheiro{elsewhere.length === 1 ? '' : 's'} noutros períodos:
                    </div>
                    {[...byPeriod.entries()].map(([pname, list]) => (
                      <div key={pname} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 2 }}>
                          {pname} ({list.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {list.slice(0, 5).map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, periodId: selectedPeriodId, updatedAt: new Date().toISOString() } : x));
                                setActiveIds(ids => ids.includes(c.id) ? ids : [c.id, ...ids]);
                              }}
                              style={{
                                textAlign: 'left', padding: '4px 8px', fontSize: 11,
                                background: T.paper, border: `1px solid ${T.lineSoft}`,
                                borderRadius: 4, color: T.ink, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                              title={`Mover "${c.name}" para o período actual`}
                            >
                              <ArrowRight size={11} style={{ color: T.accent, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.name}</span>
                              <span style={{ fontSize: 9, color: T.inkMute }}>{c.itemCount}</span>
                            </button>
                          ))}
                          {list.length > 5 && (
                            <div style={{ fontSize: 10, color: T.inkMute, fontStyle: 'italic' }}>… e mais {list.length - 5}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: T.inkMute, marginTop: 4, fontStyle: 'italic' }}>
                      Clica num ficheiro para o mover para este período.
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflowY: 'auto' }}>
              {scopedCampaigns.map((c, idx) => {
                const slotCount = countSlots(c.floors || []);
                const isActive = activeIds.includes(c.id);
                const isPrimary = primaryCampaign?.id === c.id;
                const isRenaming = renamingId === c.id;
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {/* Reorder buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                      <button
                        onClick={() => reorderCampaign(c.id, 'up')}
                        disabled={idx === 0}
                        title="Mover para cima (maior prioridade)"
                        style={{ padding: '1px 3px', fontSize: 8, lineHeight: 1, background: 'transparent', border: 'none', color: idx === 0 ? T.lineSoft : T.inkMute, cursor: idx === 0 ? 'default' : 'pointer', borderRadius: 2 }}
                        onMouseEnter={e => { if (idx > 0) e.currentTarget.style.background = T.lineSoft; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >▲</button>
                      <button
                        onClick={() => reorderCampaign(c.id, 'down')}
                        disabled={idx === scopedCampaigns.length - 1}
                        title="Mover para baixo (menor prioridade)"
                        style={{ padding: '1px 3px', fontSize: 8, lineHeight: 1, background: 'transparent', border: 'none', color: idx === scopedCampaigns.length - 1 ? T.lineSoft : T.inkMute, cursor: idx === scopedCampaigns.length - 1 ? 'default' : 'pointer', borderRadius: 2 }}
                        onMouseEnter={e => { if (idx < scopedCampaigns.length - 1) e.currentTarget.style.background = T.lineSoft; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >▼</button>
                    </div>
                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
                      background: isActive ? T.lineSoft : 'transparent',
                      border: `1px solid ${isPrimary && isActive ? T.accent : 'transparent'}`,
                      transition: 'all 0.12s',
                    }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.lineSoft; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleActive(c.id)}
                        style={{ accentColor: T.accent, cursor: 'pointer', flexShrink: 0 }}
                      />
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => { renameCampaign(c.id, renameValue); setRenamingId(null); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { renameCampaign(c.id, renameValue); setRenamingId(null); }
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={e => e.preventDefault()}
                          style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: `1px solid ${T.accent}`, borderRadius: 3, background: T.paper, color: T.ink, outline: 'none' }}
                        />
                      ) : (
                        <span
                          title="Clique duplo para renomear"
                          onDoubleClick={e => { e.preventDefault(); setRenamingId(c.id); setRenameValue(c.name); }}
                          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: T.ink, fontWeight: isPrimary ? 500 : 400 }}
                        >
                          {c.name}
                        </span>
                      )}
                      <span style={{ opacity: 0.6, fontSize: 10, color: T.inkMute, flexShrink: 0 }}>{c.itemCount}</span>
                      {slotCount > 0 && (
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 2, fontWeight: 600,
                          background: T.green, color: '#fff', flexShrink: 0,
                        }} title={`${slotCount} produtos atribuídos`}>{slotCount}★</span>
                      )}
                    </label>
                    <button onClick={() => onExport && onExport('one', c.id)} title="Exportar só esta campanha" style={{
                      padding: 4, background: 'transparent', border: 'none',
                      color: T.inkMute, display: 'flex', alignItems: 'center', borderRadius: 3, flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.ink; e.currentTarget.style.color = T.bg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.inkMute; }}>
                      <Download size={11} />
                    </button>
                    <button onClick={() => deleteCampaign(c.id)} title="Remover campanha e progresso" style={{
                      padding: 4, background: 'transparent', border: 'none',
                      color: T.inkMute, display: 'flex', alignItems: 'center', borderRadius: 3, flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.red; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.inkMute; }}>
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Multi-campaign info: primary notice + dedup count */}
          {(() => {
            const activeScoped = scopedCampaigns.filter(c => activeIds.includes(c.id));
            if (activeScoped.length <= 1) return null;
            // Count deduplicated EANs across active campaigns
            const seen = new Set();
            let dupCount = 0;
            activeScoped.forEach(c => {
              (c.rows || []).forEach(r => {
                const cols = detectColumns(c.headers || []);
                const key = normalizeEAN(r[cols.ean]);
                if (!key) return;
                if (seen.has(key)) dupCount++;
                else seen.add(key);
              });
            });
            return (
              <div style={{ marginTop: 8, padding: '7px 10px', fontSize: 10, color: T.accent, background: T.accentSoft, borderRadius: 4, lineHeight: 1.5 }}>
                <strong>{activeScoped.length} Excels activos.</strong> Os produtos ficam combinados na listagem. O plano (zonas/móveis) e a saída são <strong>partilhados pelo período</strong> — vêm do Excel <em>{primaryCampaign?.name?.slice(0, 24) || '—'}</em> (o mais antigo). Sem sobreposição.
                {dupCount > 0 && <span style={{ marginLeft: 6, color: T.inkSoft }}>· {dupCount} EAN{dupCount !== 1 ? 's' : ''} duplicado{dupCount !== 1 ? 's' : ''} ignorado{dupCount !== 1 ? 's' : ''}.</span>}
              </div>
            );
          })()}
        </div>
        <div style={{ padding: 16, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 10 }}>
            Backup
          </div>
          <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.5, marginBottom: 12 }}>
            Guarda a sessão num ficheiro para usar noutro dispositivo ou criar um ponto de restauro.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => onExport && onExport('all')}
              disabled={campaigns.length === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 10px', fontSize: 12, fontWeight: 500,
                background: campaigns.length === 0 ? T.lineSoft : T.ink,
                color: campaigns.length === 0 ? T.inkMute : T.bg,
                border: 'none', borderRadius: 5,
                cursor: campaigns.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={12} /> Exportar tudo ({campaigns.length})
            </button>
            <ImportButton onImport={onImport} />
          </div>
          {candidates.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.lineSoft}`, fontSize: 11, color: T.inkSoft }}>
              {candidates.length} candidatos de vendas marcados
            </div>
          )}
        </div>
      </div>

      {/* Quick info bar showing session size */}
      {campaigns.length > 0 && (
        <div style={{
          marginBottom: 24, padding: '8px 14px', background: T.accentSoft, color: T.ink,
          borderRadius: 6, fontSize: 11, lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Sparkles size={11} />
          <span><strong>Dica:</strong> Faz "Exportar tudo" antes de fechares o browser para guardar a sessão num ficheiro. Podes voltar a abri-la em qualquer dispositivo com "Importar ficheiro".</span>
        </div>
      )}
      </div>{/* end no-print */}

      {mode === 'plan' && (
        <div className="no-print" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>
            <ListTree size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Estrutura da loja
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditZones(e => !e)} style={{
              padding: '6px 10px', fontSize: 11,
              background: editZones ? T.accent : 'transparent', color: editZones ? '#fff' : T.inkSoft,
              border: `1px solid ${editZones ? T.accent : T.line}`, borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 4,
            }}><Edit3 size={11} /> {editZones ? 'Concluir edição de zonas' : 'Gerir zonas'}</button>
            {editZones && (
              <button onClick={addFloor} style={{
                padding: '6px 10px', fontSize: 11, background: T.bgEl, color: T.ink,
                border: `1px solid ${T.line}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
              }}><Plus size={11} /> Adicionar piso</button>
            )}
          </div>
        </div>
      )}

      {mode === 'plan' ? (
        <div className="print-area" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {floors.map(floor => (
            <FloorPlanner
              key={floor.id}
              floor={floor}
              editZones={editZones}
              activeCampaign={mergedActiveCampaign}
              candidates={candidates}
              stockRowsPO2={stockRowsPO2} stockMapPO2={stockMapPO2}
              stockRowsPO3={stockRowsPO3} stockMapPO3={stockMapPO3}
              onAddZone={() => addZone(floor.id)}
              onRenameZone={(zid, n) => renameZone(floor.id, zid, n)}
              onDeleteZone={zid => deleteZone(floor.id, zid)}
              onAddSlot={zid => addSlot(floor.id, zid)}
              onUpdateSlot={(zid, sid, patch) => updateSlot(floor.id, zid, sid, patch)}
              onDeleteSlot={(zid, sid) => deleteSlot(floor.id, zid, sid)}
              onAutoFillZone={(zid) => openAutoFillWizard('zone', floor.id, zid)}
            />
          ))}
        </div>
      ) : mode === 'list' ? (
        activeCampaigns.length > 0 ? (
          <ProductListing
            campaigns={activeCampaigns.map(c => ({ ...c, rows: filterRowsByFamily(c.rows, c.headers, excludedFamilies) }))}
            primaryCampaignId={primaryCampaign?.id}
            floors={floors}
            stockRowsPO2={stockRowsPO2}
            stockRowsPO3={stockRowsPO3}
            stockMapPO2={stockMapPO2}
            stockMapPO3={stockMapPO3}
            overrides={primaryCampaign ? (columnOverrides[primaryCampaign.id] || {}) : {}}
            onSetOverride={(field, header) => primaryCampaign && setOverride(primaryCampaign.id, field, header)}
            onAddToZone={addProductToZone}
            onSetPrimaryZone={setProductPrimaryZone}
          />
        ) : (
          <div style={{
            padding: 60, textAlign: 'center', background: T.bgEl,
            border: `1px dashed ${T.line}`, borderRadius: 10,
          }}>
            <ListTree size={32} strokeWidth={1.25} style={{ color: T.inkMute, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Sem campanha selecionada</div>
            <div style={{ fontSize: 13, color: T.inkMute }}>
              Carrega uma campanha em cima ou seleciona uma já carregada para ver a listagem.
            </div>
          </div>
        )
      ) : mode === 'output' ? (
        <OutputPreview
          floors={combinedFloors}
          activeCampaign={mergedActiveCampaign}
          stockRowsPO2={stockRowsPO2} stockMapPO2={stockMapPO2}
          stockRowsPO3={stockRowsPO3} stockMapPO3={stockMapPO3}
        />
      ) : (
        <PedidoGUView
          floors={combinedFloors}
          activeCampaign={mergedActiveCampaign}
          stockRowsPO2={stockRowsPO2} stockMapPO2={stockMapPO2}
          stockRowsPO3={stockRowsPO3} stockMapPO3={stockMapPO3}
          onUpdateSlot={(zoneId, slotId, patch) => {
            const floorId = floors.find(f => f.zones.some(z => z.id === zoneId))?.id;
            if (floorId) updateSlot(floorId, zoneId, slotId, patch);
          }}
          campaignName={primaryCampaign?.name || selectedPeriod?.name || 'Campanha'}
        />
      )}

      {restoreInfo && (
        <RestoreDialog
          info={restoreInfo}
          onConfirm={confirmRestore}
        />
      )}

      {historyFor && (
        <HistoryModal
          resourceType={historyFor.type}
          resourceId={historyFor.id}
          resourceName={historyFor.name}
          onClose={() => setHistoryFor(null)}
        />
      )}

      {templatesOpen && (
        <TemplatesModal
          currentFloors={primaryCampaign?.floors || floors}
          currentName={primaryCampaign?.name || selectedPeriod?.name || ''}
          onApply={(tpl) => {
            if (!primaryCampaign) { alert('Carrega uma campanha primeiro para aplicar o template.'); return; }
            if (!confirm(`Substituir o plano actual de "${primaryCampaign.name}" pelo template "${tpl.name}"? Os slots actuais serão perdidos.`)) return;
            setCampaigns(cs => cs.map(c => c.id === primaryCampaign.id ? { ...c, floors: tpl.floors, updatedAt: new Date().toISOString() } : c));
            setTemplatesOpen(false);
          }}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
      </>
      )}

      {/* Period create/edit dialog — visible regardless of period selection */}
      {periodDialog && (
        <PeriodDialog
          mode={periodDialog.mode}
          period={periodDialog.period}
          onClose={() => setPeriodDialog(null)}
          onSave={(data) => {
            if (periodDialog.mode === 'create') {
              const created = onCreatePeriod(data);
              setSelectedPeriodId(created.id);
            } else if (periodDialog.period) {
              onUpdatePeriod(periodDialog.period.id, data);
            }
            setPeriodDialog(null);
          }}
        />
      )}

      {/* Import-from-past dialog */}
      {showImportFromPast && selectedPeriod && (
        <ImportFromPastDialog
          allCampaigns={campaigns}
          allPeriods={periods}
          excludePeriodId={selectedPeriod.id}
          onClose={() => setShowImportFromPast(false)}
          onPick={(sourceCampaign, options) => {
            // Clone campaign data into a new campaign attached to current period
            const cloned = {
              id: Date.now() + Math.random(),
              key: `${sourceCampaign.key} (copiada)`,
              name: `${sourceCampaign.name} (copiada)`,
              uploaded: new Date(),
              headers: sourceCampaign.headers,
              rows: sourceCampaign.rows,
              itemCount: (sourceCampaign.rows || []).length,
              floors: options.includeZones ? sourceCampaign.floors : layoutOnly(defaultLayout),
              periodId: selectedPeriod.id,
            };
            setCampaigns(p => [cloned, ...p]);
            setActiveIds([cloned.id]);
            setShowImportFromPast(false);
          }}
        />
      )}

      {/* Auto-fill wizard (3-step: strategy → rules → preview) */}
      {autoFillWizard && primaryCampaign && (
        <AutoFillWizard
          state={autoFillWizard}
          floors={floors}
          campaign={{ ...primaryCampaign, rows: filterRowsByFamily(primaryCampaign.rows, primaryCampaign.headers, excludedFamilies) }}
          stockRowsPO2={stockRowsPO2}
          stockRowsPO3={stockRowsPO3}
          stockMapPO2={stockMapPO2}
          stockMapPO3={stockMapPO3}
          onClose={() => setAutoFillWizard(null)}
          onUpdate={(patch) => setAutoFillWizard(s => ({ ...s, ...patch }))}
          onGenerate={(rules) => {
            const next = { ...autoFillWizard, rules, step: 3 };
            const suggestions = generateAutoFillSuggestions(next);
            setAutoFillWizard({ ...next, suggestions });
          }}
          onApply={(acceptedMap) => handleApplySuggestions(acceptedMap)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PresenceIndicator — shows avatars of users currently viewing the same resource
// ─────────────────────────────────────────────────────────────────────────
function PresenceIndicator({ peers = [], currentUserId }) {
  // Filter out self
  const others = peers.filter(p => p.user_id !== currentUserId);
  if (others.length === 0) return null;
  const colors = ['#7C9885', '#D87C5A', '#5B7C99', '#A87C9C', '#C49A6C'];
  const initials = (email) => {
    if (!email) return '?';
    const parts = email.split('@')[0].split(/[._-]/);
    return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
  };
  return (
    <div title={`${others.length} a ver agora: ${others.map(o => o.email).join(', ')}`} style={{
      display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4,
    }}>
      {others.slice(0, 3).map((p, i) => (
        <div key={p.user_id} style={{
          width: 22, height: 22, borderRadius: '50%',
          background: colors[i % colors.length], color: '#fff',
          fontSize: 9, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${T.bg}`,
          marginLeft: i === 0 ? 0 : -8,
        }}>
          {initials(p.email)}
        </div>
      ))}
      {others.length > 3 && (
        <span style={{ fontSize: 10, color: T.inkMute, marginLeft: 2 }}>+{others.length - 3}</span>
      )}
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: T.green,
        marginLeft: 4, animation: 'pulse 2s infinite',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TemplatesModal — save/apply layout templates for recurring campaigns
// ─────────────────────────────────────────────────────────────────────────
function TemplatesModal({ currentFloors, currentName, onApply, onClose }) {
  const [list, setList] = useState(() => listTemplates());
  const [name, setName] = useState(currentName || '');

  const refresh = () => setList(listTemplates());

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { alert('Indica um nome para o template.'); return; }
    if (!currentFloors || currentFloors.length === 0) { alert('Não há plano para guardar.'); return; }
    saveTemplate(trimmed, currentFloors);
    setName('');
    refresh();
  };

  const handleDelete = (id) => {
    if (!confirm('Eliminar este template?')) return;
    deleteTemplate(id);
    refresh();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 10, border: `1px solid ${T.line}`,
        width: '100%', maxWidth: 600, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>
              Templates de plano
            </div>
            <div className="display" style={{ fontSize: 18, fontStyle: 'italic', marginTop: 2 }}>
              Guardar / aplicar layout
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: 6, background: 'transparent', border: 'none', color: T.inkMute, borderRadius: 4, cursor: 'pointer',
          }}><X size={18} /></button>
        </div>

        {/* Save current */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.lineSoft}`, background: T.bgEl }}>
          <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
            Guardar o plano actual ({(currentFloors || []).reduce((s, f) => s + (f.zones || []).length, 0)} zonas) como template:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do template (ex: Apple Week)"
              style={{
                flex: 1, padding: '8px 12px', fontSize: 13,
                background: T.paper, border: `1px solid ${T.line}`, borderRadius: 6,
                color: T.ink, outline: 'none',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
            <button onClick={handleSave} style={{
              padding: '8px 14px', background: T.ink, color: T.bg, border: 'none',
              borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Plus size={12} /> Guardar
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {list.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
              <Layers size={20} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div>Sem templates guardados.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Guarda o plano actual acima para criar o primeiro.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map(t => {
                const zones = (t.floors || []).reduce((s, f) => s + (f.zones || []).length, 0);
                const slots = (t.floors || []).reduce((s, f) => s + (f.zones || []).reduce((ss, z) => ss + (z.slots || []).length, 0), 0);
                const date = new Date(t.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1px solid ${T.lineSoft}`, borderRadius: 6, background: T.paper,
                  }}>
                    <Layers size={14} style={{ color: T.accent }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2, fontFamily: 'Geist Mono, monospace' }}>
                        {zones} zonas · {slots} slots · {date}
                      </div>
                    </div>
                    <button onClick={() => onApply(t)} title="Aplicar este template à campanha activa" style={{
                      padding: '6px 10px', background: T.green, color: '#fff', border: 'none',
                      borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Check size={11} /> Aplicar
                    </button>
                    <button onClick={() => handleDelete(t.id)} title="Eliminar template" style={{
                      padding: 6, background: 'transparent', color: T.inkMute, border: 'none', borderRadius: 4, cursor: 'pointer',
                    }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HistoryModal — shows activity log for a specific resource (period/campaign)
// ─────────────────────────────────────────────────────────────────────────
function HistoryModal({ resourceType, resourceId, resourceName, onClose }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchActivityForResource(resourceType, resourceId, { limit: 100 }).then(data => {
      if (!cancelled) setEntries(data);
    });
    return () => { cancelled = true; };
  }, [resourceType, resourceId]);

  const ACTION_LABELS = {
    create: 'Criou', update: 'Atualizou', delete: 'Eliminou',
    upload: 'Carregou', upsert: 'Atualizou', activate: 'Activou',
  };
  const ACTION_COLORS = {
    create: T.green, update: T.accent, delete: '#b91c1c',
    upload: T.green, upsert: T.accent, activate: T.green,
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 10, border: `1px solid ${T.line}`,
        width: '100%', maxWidth: 640, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>
              Histórico · {resourceType === 'period' ? 'Período' : 'Campanha'}
            </div>
            <div className="display" style={{ fontSize: 18, fontStyle: 'italic', marginTop: 2 }}>{resourceName}</div>
          </div>
          <button onClick={onClose} style={{
            padding: 6, background: 'transparent', border: 'none', color: T.inkMute, borderRadius: 4, cursor: 'pointer',
          }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {entries === null ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>A carregar…</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
              <Activity size={20} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div>Sem alterações registadas para este recurso.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(e => {
                const dt = new Date(e.created_at);
                const dateStr = dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
                const timeStr = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                const actionColor = ACTION_COLORS[e.action] || T.inkMute;
                return (
                  <div key={e.id} style={{
                    display: 'flex', gap: 10, padding: '8px 10px',
                    border: `1px solid ${T.lineSoft}`, borderRadius: 6,
                    background: T.paper,
                  }}>
                    <div style={{
                      width: 4, alignSelf: 'stretch', background: actionColor, borderRadius: 2,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.ink }}>
                          {ACTION_LABELS[e.action] || e.action}
                        </span>
                        <span style={{ fontSize: 11, color: T.inkSoft }}>{e.user_email || 'sistema'}</span>
                        <span className="mono" style={{ fontSize: 10, color: T.inkMute, marginLeft: 'auto' }}>
                          {dateStr} · {timeStr}
                        </span>
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div className="mono" style={{
                          fontSize: 10, color: T.inkMute, marginTop: 4,
                          background: T.bgEl, padding: '4px 6px', borderRadius: 3,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {Object.entries(e.metadata).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}
                        </div>
                      )}
                      {e.reverted && (
                        <div style={{ fontSize: 10, color: T.accent, fontStyle: 'italic', marginTop: 3 }}>
                          ⤺ Revertido em {new Date(e.reverted_at).toLocaleString('pt-PT')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RestoreDialog — shown when uploading a campaign that has saved progress
// ─────────────────────────────────────────────────────────────────────────
function RestoreDialog({ info, onConfirm }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      animation: 'fadeUp 0.2s ease-out',
    }}>
      <div style={{
        background: T.bg, borderRadius: 12, padding: 32,
        width: 'min(480px, 90vw)',
        border: `1px solid ${T.line}`,
        boxShadow: '0 40px 80px -20px rgba(20,18,16,0.4)',
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 8 }}>
          Progresso encontrado
        </div>
        <h3 className="display" style={{ fontSize: 28, margin: '0 0 6px', fontStyle: 'italic' }}>
          Continuar onde paraste?
        </h3>
        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginBottom: 24 }}>
          Encontrámos progresso guardado para <strong style={{ color: T.ink }}>{info.tempCampaign.name}</strong> com <strong style={{ color: T.accent }}>{info.count} {info.count === 1 ? 'produto atribuído' : 'produtos atribuídos'}</strong>. Queres restaurar o que já tinhas, ou começar do zero?
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onConfirm(false)} style={{
            flex: 1, padding: '12px 14px', background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 8,
            fontSize: 13, fontWeight: 500,
          }}>Começar do zero</button>
          <button onClick={() => onConfirm(true)} style={{
            flex: 1, padding: '12px 14px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
          }}>Restaurar progresso</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Column detection — maps Excel headers to known field types
// More specific patterns first; excludes prevent collisions (e.g. "Nome do Gestor")
// ─────────────────────────────────────────────────────────────────────────
const COL_PATTERNS = {
  family: ['des_fam1', 'des_fam', 'des fam1', 'des fam', 'família', 'familia', 'categoria'],
  subfamily: ['des_fam2', 'des fam2', 'des_fam 2', 'sub-família', 'subfamília', 'subfamilia', 'sub familia', 'sub-familia', 'subcategoria'],
  ean: ['ean', 'cód.barras', 'cod.barras', 'cód barras', 'cod barras', 'cod_barras', 'barcode'],
  description: ['descrição/título', 'descrição / título', 'descricao/titulo', 'descrição', 'descricao', 'descri', 'título', 'titulo', 'designação', 'designacao'],
  startDate: ['data início', 'data inicio', 'data_início', 'data_inicio', 'início', 'inicio'],
  endDate: ['data fim', 'data_fim', 'fim'],
  basePrice: ['pvp base fnac', 'pvp base', 'pvp_base', 'preço base', 'preco base'],
  campaignPrice: ['pvp campanha', 'pvp_campanha', 'pvp camp', 'preço campanha', 'preço promo', 'preco campanha'],
  discount: ['desconto %', 'desconto%', 'desc %', 'desc%', 'desconto', 'discount'],
  star: ['produto estrela', 'produto_estrela', 'estrela'],
  lastSale: ['última venda', 'ultima venda', 'última_venda', 'ultima_venda', 'data última venda', 'data ultima venda', 'last sale', 'last_sale'],
  margin: ['margem %', 'margem%', 'margem', 'margin', 'lucro %', 'lucro'],
  totalSales: ['total vendas', 'total_vendas', 'qtd vendida', 'unidades vendidas', 'vendas totais', 'sales'],
};

const FIELD_LABELS = {
  family: 'Família (Des_Fam1)',
  subfamily: 'Sub-família (Des_Fam2)',
  ean: 'EAN',
  description: 'Descrição / Título',
  startDate: 'Data Início',
  endDate: 'Data Fim',
  basePrice: 'PVP Base FNAC',
  campaignPrice: 'PVP Campanha',
  discount: 'Desconto %',
  star: 'Produto Estrela',
  lastSale: 'Última Venda',
  margin: 'Margem %',
  totalSales: 'Vendas Totais',
};

// Words that disqualify a header from being matched for a specific field
const FIELD_EXCLUDES = {
  description: ['gestor', 'responsável', 'responsavel', 'utilizador', 'user', 'criado', 'modificado'],
  basePrice: ['campanha', 'promo'],
  campaignPrice: ['base'],
  lastSale: ['preço', 'preco', 'pvp'],
  totalSales: ['última', 'ultima'],
};

function detectColumns(headers) {
  const result = {};
  for (const type of Object.keys(COL_PATTERNS)) {
    const patterns = COL_PATTERNS[type];
    const excludes = FIELD_EXCLUDES[type] || [];
    // First-match wins; iterate patterns in priority order
    for (const p of patterns) {
      const found = headers.find(h => {
        const lh = String(h).toLowerCase().trim();
        if (excludes.some(ex => lh.includes(ex))) return false;
        return lh === p || lh.includes(p);
      });
      if (found) { result[type] = found; break; }
    }
  }
  return result;
}

// Normalize an EAN value for comparison (handles number vs string, leading zeros, whitespace)
function normalizeEAN(v) {
  if (v == null) return '';
  let s = String(v).trim();
  // Excel often turns long numbers into scientific notation — try to fix
  if (/^\d+\.?\d*e\+?\d+$/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n)) s = n.toFixed(0);
  }
  // Strip any non-digit (some sheets pad with apostrophes or spaces)
  s = s.replace(/[^\d]/g, '');
  // Strip leading zeros for comparison
  return s.replace(/^0+/, '');
}

// Detect if a "campaign" record is actually a stock file (PO2/PO3) that
// shouldn't be listed under a period's campaigns. Stock files are global
// and uploaded via the Stock view — but historically users may have dropped
// them on the campaign upload, so they end up in the campaigns table.
// We detect by filename pattern OR by a stock-style header signature.
function isStockFile(c) {
  if (!c) return false;
  const name = String(c.name || c.key || '').toLowerCase();
  // Filename patterns common to stock files
  if (/^\s*stock[\s_]?ponto/i.test(name)) return true;
  if (/^\s*po[23][\s_-]/i.test(name)) return true;
  if (/^\s*stock[\s_-]+(?:armaz|loja|aveiro)/i.test(name)) return true;
  // Header signature: only EAN + Stock (+ Description) columns and no campaign fields
  const headers = (c.headers || []).map(h => String(h || '').toLowerCase().trim());
  if (headers.length > 0 && headers.length <= 4) {
    const hasEan = headers.some(h => /\bean\b|barcode|cód.?barras|cod.?barras/.test(h));
    const hasStock = headers.some(h => /^stock$|qtd|stock_aveiro|stock_armaz/.test(h));
    const hasCampaignField = headers.some(h => /pvp|preço|preco|desconto|discount|campanha/.test(h));
    if (hasEan && hasStock && !hasCampaignField) return true;
  }
  return false;
}

// Filter rows by family: remove rows whose Des_Fam1 is in excludedFamilies (case-insensitive).
// Returns original array if nothing to filter (avoids unnecessary allocations).
function filterRowsByFamily(rows, headers, excludedFamilies) {
  if (!excludedFamilies || excludedFamilies.length === 0 || !rows || rows.length === 0) return rows;
  const cols = detectColumns(headers);
  if (!cols.family) return rows;
  const excluded = new Set(excludedFamilies.map(f => f.toUpperCase()));
  return rows.filter(r => {
    const fam = String(r[cols.family] || '').trim().toUpperCase();
    return !excluded.has(fam);
  });
}

// Build an indexed Map of stock rows keyed by normalized EAN. O(n) build, O(1) lookup.
function buildStockIndex(stockRows, mapping = {}) {
  if (!stockRows || !stockRows.length) return { index: new Map(), eanCol: null, stockCol: null };
  const headers = Object.keys(stockRows[0]);

  const eanCol = mapping.eanCol ||
    headers.find(h => /^\s*ean\s*$/i.test(h)) ||
    headers.find(h => /ean|barcode|cód.?barras|cod.?barras/i.test(h)) ||
    headers[0];

  let stockCol = mapping.stockCol;
  if (!stockCol) {
    stockCol =
      headers.find(h => /^\s*stock\s*$/i.test(h)) ||
      headers.find(h => /aveiro/i.test(h)) ||
      headers.find(h => /\bstock\b/i.test(h)) ||
      headers.find(h => /^qtd[\s._-]?disp/i.test(h.trim())) ||
      headers.find(h => /^qtd$|quantidade|disponí|disponi|existên|existen/i.test(h.trim())) ||
      headers.find(h => /saldo|dispon/i.test(h)) ||
      // Last resort: first non-EAN header that has at least one numeric value in the first 20 rows
      headers.find(h => {
        if (h === eanCol) return false;
        let numCount = 0;
        for (let i = 0; i < Math.min(20, stockRows.length); i++) {
          const v = stockRows[i][h];
          if (v !== null && v !== '' && !isNaN(Number(v))) numCount++;
        }
        return numCount >= Math.min(5, stockRows.length);
      });
  }

  const index = new Map();
  if (!stockCol) return { index, eanCol, stockCol: null };

  for (const r of stockRows) {
    const key = normalizeEAN(r[eanCol]);
    if (!key) continue;
    const v = Number(r[stockCol]) || 0;
    // If duplicate EAN, keep max (some sheets have variants)
    const existing = index.get(key);
    if (existing === undefined || v > existing) index.set(key, v);
  }
  return { index, eanCol, stockCol };
}

// Build an indexed Map of zones keyed by normalized EAN. O(slots) build, O(1) lookup.
function buildZoneIndex(floors) {
  const index = new Map();
  for (const f of floors) {
    for (const z of f.zones) {
      for (const s of z.slots) {
        const key = normalizeEAN(s.ref);
        if (!key) continue;
        const entry = { floorId: f.id, zoneId: z.id, floorName: f.name, zoneName: z.name, color: f.color };
        const arr = index.get(key);
        if (arr) arr.push(entry); else index.set(key, [entry]);
      }
    }
  }
  return index;
}

// Auto-detect EAN and stock columns for a stock file (used by StockPanel UI)
function detectStockColumns(stockRows) {
  const { eanCol, stockCol } = buildStockIndex(stockRows);
  return { eanCol, stockCol };
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-fill engine — score and rank products for a zone, fill empty zones
// ─────────────────────────────────────────────────────────────────────────

// Default scoring weights (must sum to 1.0 conceptually but normalized at use)
const DEFAULT_AUTOFILL_STRATEGY = {
  weights: {
    discount: 0.40, // higher discount % → more attractive
    stock: 0.30,    // more stock available → easier to display & sell
    sales: 0.20,    // products with recent sales → proven appeal
    price: 0.10,    // higher price → premium feel (positive by default)
  },
  pricePreference: 'high', // 'high' = premium first, 'low' = discounted first
  // Filter thresholds (0 = no filter)
  minDiscount: 0,
  minStock: 0,
  maxPrice: 0,
  // Capacity defaults (per zone)
  defaultMin: 1,
  defaultMax: 8,
};

// Default zone-level config (stored on zone object as autoFillConfig)
function defaultZoneAutofillConfig() {
  return {
    enabled: true,
    capacityMin: 1,
    capacityMax: 8,
    preferredFamilies: [],    // legacy — keep for compat
    allocatedFamilies: [],    // soft boost: these families score higher in this zone
    restrictedFamilies: [],   // hard filter: ONLY products from these families (empty = all)
    restrictedSubfamilies: [],// hard filter: ONLY products from these subfamilies (empty = all)
    minDiscount: 0,
    minStock: 0,
    maxPrice: 0,
    weights: null, // null = inherit campaign strategy
  };
}

// Compute a normalized score for a product against a zone+strategy
// Returns { score, reasons[] } — reasons explain what drove the score
function scoreProduct(product, columns, stockTotal, strategy) {
  const reasons = [];
  let total = 0;
  let weightSum = 0;

  const w = strategy.weights || DEFAULT_AUTOFILL_STRATEGY.weights;

  // Discount component (0-100% normalized to 0-1)
  if (w.discount && columns.discount) {
    const discount = parseNum(product[columns.discount]);
    if (discount > 0) {
      const norm = Math.min(discount / 50, 1); // 50% = max score
      total += norm * w.discount;
      weightSum += w.discount;
      if (discount >= 30) reasons.push(`-${Math.round(discount)}%`);
    }
  }

  // Stock component (logarithmic — 5+ is good, 50+ is excellent)
  if (w.stock && stockTotal > 0) {
    const norm = Math.min(Math.log10(stockTotal + 1) / Math.log10(50), 1);
    total += norm * w.stock;
    weightSum += w.stock;
    if (stockTotal >= 10) reasons.push(`stock ${stockTotal}`);
  }

  // Sales component (recent = better)
  if (w.sales) {
    const totalSales = columns.totalSales ? parseNum(product[columns.totalSales]) : 0;
    if (totalSales > 0) {
      const norm = Math.min(Math.log10(totalSales + 1) / 2, 1);
      total += norm * w.sales;
      weightSum += w.sales;
      if (totalSales >= 5) reasons.push(`vendas ${totalSales}`);
    }
    // Bonus for recent last-sale date
    if (columns.lastSale) {
      const ls = product[columns.lastSale];
      if (ls) {
        const date = new Date(ls);
        if (!isNaN(date.getTime())) {
          const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < 30) {
            total += 0.1 * w.sales;
            reasons.push('venda recente');
          }
        }
      }
    }
  }

  // Price component
  if (w.price && columns.campaignPrice) {
    const price = parseNum(product[columns.campaignPrice]) || parseNum(product[columns.basePrice]);
    if (price > 0) {
      const norm = strategy.pricePreference === 'low'
        ? Math.max(0, 1 - price / 500)  // cheaper better
        : Math.min(price / 500, 1);     // pricier better
      total += norm * w.price;
      weightSum += w.price;
    }
  }

  // Star products bonus
  if (columns.star) {
    const sv = String(product[columns.star] || '').toLowerCase().trim();
    if (sv === 'sim' || sv === 'yes' || sv === '1' || sv === 'true' || sv === 'x') {
      total += 0.15;
      reasons.push('★ estrela');
    }
  }

  // Normalize so missing fields don't penalize
  const score = weightSum > 0 ? (total / weightSum) : 0;
  return { score, reasons };
}

// Generate auto-fill suggestions for a single zone
// Returns array of { ean, product, score, reasons }
function suggestForZone({
  zone, products, columns,
  stockIndex,        // Map<ean, stockTotal>
  excludeEans,       // Set<ean> — already used elsewhere or in this zone
  strategy = DEFAULT_AUTOFILL_STRATEGY,
}) {
  const config = zone.autoFillConfig || defaultZoneAutofillConfig();
  const minStock = Math.max(config.minStock || 0, strategy.minStock || 0);
  const minDiscount = Math.max(config.minDiscount || 0, strategy.minDiscount || 0);
  const maxPrice = config.maxPrice || strategy.maxPrice || 0; // 0 = no cap

  const candidates = [];
  for (const product of products) {
    const ean = normalizeEAN(product[columns.ean]);
    if (!ean) continue;
    if (excludeEans.has(ean)) continue;

    // Hard family restriction: only allow products from these families
    if (config.restrictedFamilies && config.restrictedFamilies.length > 0 && columns.family) {
      const fam = String(product[columns.family] || '').trim();
      if (!config.restrictedFamilies.includes(fam)) continue;
    }
    // Hard subfamily restriction: only allow products from these subfamilies
    if (config.restrictedSubfamilies && config.restrictedSubfamilies.length > 0 && columns.subfamily) {
      const sub = String(product[columns.subfamily] || '').trim();
      if (!config.restrictedSubfamilies.includes(sub)) continue;
    }
    // Legacy: preferredFamilies used as hard filter (kept for backwards compat)
    if (config.preferredFamilies && config.preferredFamilies.length > 0 && !config.restrictedFamilies?.length && columns.family) {
      const fam = String(product[columns.family] || '').trim();
      if (!config.preferredFamilies.includes(fam)) continue;
    }

    // Discount filter
    if (minDiscount > 0 && columns.discount) {
      const d = parseNum(product[columns.discount]);
      if (d < minDiscount) continue;
    }

    // Price cap
    if (maxPrice > 0 && (columns.campaignPrice || columns.basePrice)) {
      const p = parseNum(product[columns.campaignPrice]) || parseNum(product[columns.basePrice]);
      if (p > maxPrice) continue;
    }

    // Stock minimum
    const stockTotal = stockIndex.get(ean) || 0;
    if (minStock > 0 && stockTotal < minStock) continue;

    // Score it
    let { score, reasons } = scoreProduct(product, columns, stockTotal, strategy);
    // Soft boost for allocated families: +30% score for matching family
    if (config.allocatedFamilies && config.allocatedFamilies.length > 0 && columns.family) {
      const fam = String(product[columns.family] || '').trim();
      if (config.allocatedFamilies.includes(fam)) {
        score *= 1.3;
        reasons = [...reasons, `família alocada: ${fam}`];
      }
    }
    candidates.push({ ean, product, score, reasons, stockTotal });
  }

  // Sort by score desc
  candidates.sort((a, b) => b.score - a.score);

  // Pick up to capacityMax
  const max = config.capacityMax || strategy.defaultMax || 8;
  return candidates.slice(0, max);
}

// Generate suggestions for ALL zones (used by global auto-fill)
// Returns Map<zoneKey, [suggestions]> where zoneKey = floorId:zoneId
function suggestForAllZones({ floors, products, columns, stockPO2Index, stockPO3Index, strategy, onlyEmpty = true }) {
  const result = new Map();
  const usedEans = new Set();

  // Combine stock indices (PO2 + PO3)
  const combinedStock = new Map();
  for (const [ean, q] of stockPO2Index) combinedStock.set(ean, (combinedStock.get(ean) || 0) + q);
  for (const [ean, q] of stockPO3Index) combinedStock.set(ean, (combinedStock.get(ean) || 0) + q);

  // Collect EANs already manually assigned to ANY zone (across all floors)
  for (const f of floors) {
    for (const z of f.zones) {
      for (const s of z.slots) {
        const e = normalizeEAN(s.ref);
        if (e) usedEans.add(e);
      }
    }
  }

  // For each zone in priority order: zones with min capacity unmet first, then by floor order
  const zoneList = [];
  floors.forEach(f => f.zones.forEach(z => zoneList.push({ floor: f, zone: z })));

  for (const { floor, zone } of zoneList) {
    if (onlyEmpty && zone.slots.length > 0) continue;
    const key = `${floor.id}:${zone.id}`;
    const suggestions = suggestForZone({
      zone, products, columns, stockIndex: combinedStock,
      excludeEans: usedEans, strategy,
    });
    if (suggestions.length > 0) {
      result.set(key, suggestions);
      // Mark these EANs as used so other zones don't pick them
      suggestions.forEach(s => usedEans.add(s.ean));
    }
  }

  return result;
}

// Tolerant number parser — handles "30%", "32,19", "€41,99", whitespace, etc.
function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  // Strip common non-numeric chars: €, %, spaces
  s = s.replace(/[€%\s]/g, '');
  // Handle "1.234,56" (Portuguese) vs "1,234.56" (English)
  // If both . and , present, the last one is the decimal separator
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      // PT format: "1.234,56" — drop dots, replace comma with dot
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // EN format: "1,234.56" — drop commas
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    // Only comma → assume PT decimal: "32,19"
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function isStarValue(v) {
  if (!v) return false;
  const s = String(v).toLowerCase().trim();
  return ['sim', 's', 'y', 'yes', 'true', '1', 'x', '★', 'estrela'].includes(s);
}

function formatPrice(v) {
  if (v === '' || v == null) return '—';
  const n = parseNum(v);
  if (n === 0 && String(v).trim() !== '0') return String(v); // non-numeric, show as-is
  return `€${n.toFixed(2).replace('.', ',')}`;
}

function formatDate(v) {
  if (v === null || v === undefined || v === '') return '—';
  // Date object (when XLSX.read used cellDates: true)
  if (v instanceof Date && !isNaN(v)) {
    return v.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  if (typeof v === 'number') {
    // Excel date serial fallback
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  // String — try to detect dd-mm-yyyy and reformat compactly
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const yr = m[3].length === 2 ? m[3] : m[3].slice(-2);
    return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yr}`;
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────
// PeriodsOverview — landing screen for Campanhas: shows period cards
// ─────────────────────────────────────────────────────────────────────────
function PeriodsOverview({ periods, campaigns, isAdmin, currentUserId, onEnterPeriod, onCreate, onEdit, onDelete, onToggleHidden, cloudDataLoaded = true }) {
  // Compute counts per period
  const periodStats = useMemo(() => {
    const stats = {};
    periods.forEach(p => {
      const periodCampaigns = campaigns.filter(c => c.periodId === p.id);
      const totalProducts = periodCampaigns.reduce((s, c) => s + (c.rows?.length || 0), 0);
      const totalAssigned = periodCampaigns.reduce((s, c) => s + countSlots(c.floors), 0);
      stats[p.id] = {
        excelCount: periodCampaigns.length,
        productCount: totalProducts,
        assignedCount: totalAssigned,
      };
    });
    return stats;
  }, [periods, campaigns]);

  // Group periods by status for visual ordering
  const grouped = useMemo(() => {
    const out = { active: [], planned: [], finished: [] };
    periods.forEach(p => {
      const s = periodStatus(p);
      out[s].push(p);
    });
    return out;
  }, [periods]);

  // Show skeleton while cloud data is still loading to avoid "1 campaign then all" flash
  if (!cloudDataLoaded) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ width: 160, height: 28, background: T.lineSoft, borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 120, height: 32, background: T.lineSoft, borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ width: 220, height: 140, background: T.lineSoft, borderRadius: 10, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
      </div>
    );
  }

  return (
    <div>
      <Header
        eyebrow="Plano de Loja"
        title="Campanhas"
        subtitle="Cria campanhas planeadas com data de início e fim. Dentro de cada campanha podes carregar vários ficheiros Excel de produtos e gerir as atribuições aos móveis."
        action={
          <button onClick={onCreate} style={{
            padding: '10px 16px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}>
            <Plus size={14} /> Nova campanha
          </button>
        }
      />

      {periods.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center', background: T.bgEl,
          border: `1px dashed ${T.line}`, borderRadius: 10,
        }}>
          <Layers size={32} strokeWidth={1.25} style={{ color: T.inkMute, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Sem campanhas planeadas</div>
          <div style={{ fontSize: 13, color: T.inkMute, marginBottom: 18 }}>
            Cria a tua primeira campanha planeada para começar a organizar os produtos.
          </div>
          <button onClick={onCreate} style={{
            padding: '10px 18px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}>
            <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Criar campanha
          </button>
        </div>
      ) : (
        <>
          {grouped.active.length > 0 && (
            <PeriodGroup title="Em curso" badge={T.green} periods={grouped.active} stats={periodStats} onEnter={onEnterPeriod} onEdit={onEdit} onDelete={onDelete} onToggleHidden={onToggleHidden} isAdmin={isAdmin} currentUserId={currentUserId} />
          )}
          {grouped.planned.length > 0 && (
            <PeriodGroup title="Planeadas" badge={T.accent} periods={grouped.planned} stats={periodStats} onEnter={onEnterPeriod} onEdit={onEdit} onDelete={onDelete} onToggleHidden={onToggleHidden} isAdmin={isAdmin} currentUserId={currentUserId} />
          )}
          {grouped.finished.length > 0 && (
            <PeriodGroup title="Terminadas" badge={T.inkMute} periods={grouped.finished} stats={periodStats} onEnter={onEnterPeriod} onEdit={onEdit} onDelete={onDelete} onToggleHidden={onToggleHidden} isAdmin={isAdmin} currentUserId={currentUserId} dimmed />
          )}
        </>
      )}
    </div>
  );
}

function PeriodGroup({ title, badge, periods, stats, onEnter, onEdit, onDelete, onToggleHidden, isAdmin, currentUserId, dimmed }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, background: badge, borderRadius: '50%' }} />
        <h3 className="mono" style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', color: T.inkSoft, textTransform: 'uppercase' }}>
          {title} ({periods.length})
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {periods.map(p => (
          <PeriodCard
            key={p.id}
            period={p}
            stats={stats[p.id]}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            onEnter={() => onEnter(p.id)}
            onEdit={() => onEdit(p)}
            onDelete={() => onDelete(p.id)}
            onToggleHidden={onToggleHidden}
            dimmed={dimmed || p.hidden}
          />
        ))}
      </div>
    </div>
  );
}

function PeriodCard({ period, stats, isAdmin, currentUserId, onEnter, onEdit, onDelete, onToggleHidden, dimmed }) {
  const status = periodStatus(period);
  const statusColor = status === 'active' ? T.green : (status === 'planned' ? T.accent : T.inkMute);
  const isOwner = period.created_by === currentUserId || period.user_id === currentUserId;
  const canEdit = isOwner || isAdmin;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirm(`Eliminar a campanha "${period.name}"?\n\nOs Excels dentro ficam disponíveis mas sem campanha associada.`)) return;
    onDelete();
  };

  const handleToggleHidden = (e) => {
    e.stopPropagation();
    onToggleHidden && onToggleHidden(period.id);
  };

  // Format "criado por" / "última edição"
  const updatedDate = period.updatedAt ? new Date(period.updatedAt) : null;
  const updatedText = updatedDate
    ? updatedDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' ' + updatedDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      onClick={onEnter}
      style={{
        padding: 18, background: period.hidden ? T.bgEl : T.paper,
        border: `1px solid ${period.hidden ? T.line : T.line}`,
        borderLeft: `3px solid ${period.hidden ? T.inkMute : statusColor}`,
        borderRadius: 8, cursor: 'pointer',
        opacity: dimmed ? 0.65 : 1,
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.ink; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; }}
    >
      {period.hidden && isAdmin && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: 8, padding: '2px 6px', background: T.inkMute, color: '#fff',
          borderRadius: 3, fontWeight: 600, letterSpacing: '0.08em',
          fontFamily: 'Geist Mono', textTransform: 'uppercase',
        }}>ESCONDIDA</span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: statusColor, textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>
            {PERIOD_STATUS_LABEL[status]}
          </div>
          <div className="display" style={{ fontSize: 18, fontStyle: 'italic', lineHeight: 1.2, marginBottom: 6 }}>
            {period.name}
          </div>
          <div style={{ fontSize: 11, color: T.inkSoft }}>
            {formatPeriodDates(period)}
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 4 }}>
            {isAdmin && onToggleHidden && (
              <button onClick={handleToggleHidden} title={period.hidden ? 'Mostrar para todos' : 'Esconder para utilizadores normais'} style={iconBtnStyle()}>
                {period.hidden ? <Eye size={12} /> : <ShieldOff size={12} />}
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar" style={iconBtnStyle()}>
              <Pencil size={12} />
            </button>
            <button onClick={handleDelete} title="Eliminar" style={iconBtnStyle(T.red)}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.lineSoft}`, fontSize: 11 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Excels</div>
          <div style={{ fontWeight: 600, color: T.ink, marginTop: 2 }}>{stats?.excelCount || 0}</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 9, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Produtos</div>
          <div style={{ fontWeight: 600, color: T.ink, marginTop: 2 }}>{(stats?.productCount || 0).toLocaleString('pt-PT')}</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 9, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Atribuídos</div>
          <div style={{ fontWeight: 600, color: T.green, marginTop: 2 }}>{stats?.assignedCount || 0}</div>
        </div>
      </div>

      {updatedText && (
        <div style={{ marginTop: 8, fontSize: 10, color: T.inkMute, fontFamily: 'Geist Mono', letterSpacing: '0.04em' }}>
          última edição · {updatedText}
        </div>
      )}

      {period.notes && (
        <div style={{
          marginTop: 10, padding: '6px 8px', background: T.bgEl, borderRadius: 4,
          fontSize: 10, color: T.inkSoft, fontStyle: 'italic',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {period.notes}
        </div>
      )}
    </div>
  );
}

function iconBtnStyle(hoverColor) {
  return {
    padding: 6, background: 'transparent', color: T.inkMute,
    border: 'none', borderRadius: 4, cursor: 'pointer',
    display: 'flex', alignItems: 'center', flexShrink: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PeriodDialog — create/edit campaign period (modal)
// ─────────────────────────────────────────────────────────────────────────
function PeriodDialog({ mode, period, onClose, onSave }) {
  const [name, setName] = useState(period?.name || '');
  const [startDate, setStartDate] = useState(period?.startDate || '');
  const [endDate, setEndDate] = useState(period?.endDate || '');
  const [notes, setNotes] = useState(period?.notes || '');
  const [statusOverride, setStatusOverride] = useState(period?.statusOverride || '');
  const [hasPosters, setHasPosters] = useState(period?.has_posters ?? false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    if (!name.trim()) { alert('Indica um nome para a campanha.'); return; }
    onSave({
      name: name.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes.trim(),
      statusOverride: statusOverride || null,
      has_posters: hasPosters,
    });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeUp 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 28,
        width: 'min(520px, 92vw)', border: `1px solid ${T.line}`,
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
              {mode === 'create' ? 'Nova campanha' : 'Editar campanha'}
            </div>
            <h3 className="display" style={{ fontSize: 24, margin: 0, fontStyle: 'italic' }}>
              {mode === 'create' ? 'Planear nova campanha' : period?.name}
            </h3>
          </div>
          <button onClick={onClose} style={{
            padding: 6, background: 'transparent', color: T.inkMute, border: 'none', borderRadius: 4,
          }}><X size={16} /></button>
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Nome *</div>
          <input
            value={name} onChange={e => setName(e.target.value)} autoFocus
            placeholder="Ex: Black Friday 2026 / Janeiro / Campanha Inverno"
            style={dialogInput()}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Início</div>
            <input
              type="date" value={startDate || ''}
              onChange={e => setStartDate(e.target.value)}
              style={dialogInput()}
            />
          </label>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fim</div>
            <input
              type="date" value={endDate || ''}
              onChange={e => setEndDate(e.target.value)}
              style={dialogInput()}
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Observações</div>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas internas, objetivos, fornecedores envolvidos…"
            rows={3}
            style={{ ...dialogInput(), resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
          />
        </label>

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', marginBottom: 14,
          background: hasPosters ? T.accentSoft : T.bgEl,
          border: `1px solid ${hasPosters ? T.accent : T.line}`,
          borderRadius: 8, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={hasPosters}
            onChange={e => setHasPosters(e.target.checked)}
            style={{ accentColor: T.accent, marginTop: 2 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, marginBottom: 2 }}>
              Esta campanha tem cartazes/visuais
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.4 }}>
              Ativa para registar os cartazes (formato, quantidade, zona). Recebes avisos quando a campanha estiver a terminar para retirá-los.
            </div>
          </div>
        </label>

        {mode === 'edit' && (
          <label style={{ display: 'block', marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Estado (opcional)</div>
            <select value={statusOverride} onChange={e => setStatusOverride(e.target.value)} style={dialogInput()}>
              <option value="">Automático (pelas datas)</option>
              <option value="planned">Planeada</option>
              <option value="active">Em curso</option>
              <option value="finished">Terminada</option>
            </select>
          </label>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
          <button onClick={onClose} style={{
            padding: '10px 16px', background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 13,
            cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={submit} style={{
            padding: '10px 18px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}>
            {mode === 'create' ? 'Criar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function dialogInput() {
  return {
    width: '100%', padding: '9px 12px', fontSize: 13,
    background: T.paper, color: T.ink,
    border: `1px solid ${T.line}`, borderRadius: 6,
    outline: 'none', fontFamily: 'inherit',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ImportFromPastDialog — pick a campaign from another period to clone in
// ─────────────────────────────────────────────────────────────────────────
function ImportFromPastDialog({ allCampaigns, allPeriods, excludePeriodId, onClose, onPick }) {
  const [includeZones, setIncludeZones] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // List campaigns from OTHER periods, decorated with their period name
  const candidates = useMemo(() => {
    const periodMap = new Map(allPeriods.map(p => [p.id, p]));
    return allCampaigns
      .filter(c => c.periodId && c.periodId !== excludePeriodId)
      .map(c => ({
        ...c,
        periodName: periodMap.get(c.periodId)?.name || '?',
        slotCount: countSlots(c.floors),
      }))
      .filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.periodName.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
  }, [allCampaigns, allPeriods, excludePeriodId, search]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 24,
        width: 'min(680px, 92vw)', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        border: `1px solid ${T.line}`,
      }}>
        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
            Importar
          </div>
          <h3 className="display" style={{ fontSize: 22, margin: 0, fontStyle: 'italic' }}>Importar de campanha passada</h3>
          <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4, lineHeight: 1.5 }}>
            Escolhe um Excel de outra campanha. Os produtos e (opcionalmente) as atribuições aos móveis serão copiados para a campanha atual.
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12, color: T.ink, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeZones} onChange={e => setIncludeZones(e.target.checked)} style={{ accentColor: T.accent }} />
          Incluir atribuições aos móveis (recomendado)
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, marginBottom: 10 }}>
          <Search size={13} style={{ color: T.inkMute }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)} autoFocus
            placeholder="Pesquisar por nome do Excel ou campanha…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.ink }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${T.line}`, borderRadius: 6 }}>
          {candidates.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
              Sem campanhas anteriores para importar.
            </div>
          ) : candidates.map(c => (
            <button key={c.id} onClick={() => onPick(c, { includeZones })} style={{
              width: '100%', textAlign: 'left', padding: '11px 14px',
              display: 'flex', gap: 10, alignItems: 'center',
              background: T.bgEl, border: 'none',
              borderBottom: `1px solid ${T.lineSoft}`,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: T.inkMute, marginTop: 2, display: 'flex', gap: 8 }}>
                  <span className="mono">{c.periodName}</span>
                  <span>·</span>
                  <span>{c.itemCount} produtos</span>
                  {c.slotCount > 0 && <><span>·</span><span style={{ color: T.green }}>{c.slotCount} atribuídos</span></>}
                </div>
              </div>
              <ChevronRight size={14} style={{ color: T.inkMute }} />
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12,
          }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ProductListing — enriched table cross-referencing campaign × stock × zones
// ─────────────────────────────────────────────────────────────────────────
function ProductListing({ campaigns, primaryCampaignId, floors, stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, overrides, onSetOverride, onAddToZone, onSetPrimaryZone }) {
  const [search, setSearch] = useStoredState('listing.search', '');
  const [filterFamily, setFilterFamily] = useStoredState('listing.filterFamily', 'all');
  const [filterStar, setFilterStar] = useStoredState('listing.filterStar', false);
  const [filterAssign, setFilterAssign] = useStoredState('listing.filterAssign', 'all');
  const [filterStock, setFilterStock] = useStoredState('listing.filterStock', 'all');
  const [filterCampaign, setFilterCampaign] = useStoredState('listing.filterCampaign', 'all');
  const [sortBy, setSortBy] = useStoredState('listing.sortBy', 'discount');
  const [sortDir, setSortDir] = useStoredState('listing.sortDir', 'desc');
  const [assignFor, setAssignFor] = useState(null);

  const isMulti = campaigns.length > 1;
  // Use the primary campaign's headers for column detection (most predictable behavior)
  const primary = campaigns.find(c => c.id === primaryCampaignId) || campaigns[0];

  const autoCols = useMemo(() => detectColumns(primary.headers), [primary.headers]);
  const cols = useMemo(() => {
    const merged = { ...autoCols };
    Object.keys(overrides || {}).forEach(k => {
      if (overrides[k] !== undefined) merged[k] = overrides[k];
    });
    return merged;
  }, [autoCols, overrides]);

  const stockIndexPO2 = useMemo(() => buildStockIndex(stockRowsPO2, stockMapPO2), [stockRowsPO2, stockMapPO2]);
  const stockIndexPO3 = useMemo(() => buildStockIndex(stockRowsPO3, stockMapPO3), [stockRowsPO3, stockMapPO3]);
  const zoneIndex = useMemo(() => buildZoneIndex(floors), [floors]);

  // Build products from ALL active campaigns. Deduplicate by EAN — keep first occurrence.
  const products = useMemo(() => {
    const seen = new Map(); // eanKey -> product
    const orderedProducts = [];
    campaigns.forEach(camp => {
      // Detect cols for this specific campaign (in case headers differ)
      const campCols = camp.id === primary.id ? cols : { ...detectColumns(camp.headers) };
      camp.rows.forEach((r, i) => {
        const eanRaw = String(r[campCols.ean] ?? '').trim();
        const eanKey = normalizeEAN(eanRaw);
        // Dedupe: skip if already seen
        if (eanKey && seen.has(eanKey)) return;

        const stockPO2 = eanKey ? (stockIndexPO2.index.get(eanKey) ?? 0) : 0;
        const stockPO3 = eanKey ? (stockIndexPO3.index.get(eanKey) ?? 0) : 0;
        const zones = eanKey ? (zoneIndex.get(eanKey) ?? []) : [];

        const basePriceVal = parseNum(campCols.basePrice ? r[campCols.basePrice] : 0);
        const campPriceVal = parseNum(campCols.campaignPrice ? r[campCols.campaignPrice] : 0);
        const explicitDiscount = parseNum(campCols.discount ? r[campCols.discount] : 0);
        const calcDiscount = (basePriceVal > 0 && campPriceVal > 0 && campPriceVal < basePriceVal)
          ? ((basePriceVal - campPriceVal) / basePriceVal) * 100
          : 0;
        const discount = explicitDiscount >= 0.5 ? explicitDiscount : calcDiscount;

        const product = {
          id: `p-${camp.id}-${i}`,
          family: campCols.family ? String(r[campCols.family] ?? '').trim() : '',
          ean: eanRaw,
          eanKey,
          description: campCols.description ? String(r[campCols.description] ?? '').trim() : '',
          startDate: campCols.startDate ? r[campCols.startDate] : '',
          endDate: campCols.endDate ? r[campCols.endDate] : '',
          basePrice: campCols.basePrice ? r[campCols.basePrice] : '',
          campaignPrice: campCols.campaignPrice ? r[campCols.campaignPrice] : '',
          discount,
          discountIsCalculated: explicitDiscount < 0.5 && calcDiscount > 0,
          isStar: campCols.star ? isStarValue(r[campCols.star]) : false,
          stockPO2,
          stockPO3,
          stockTotal: stockPO2 + stockPO3,
          zones,
          assigned: zones.length > 0,
          sourceCampaignId: camp.id,
          sourceCampaignName: camp.name,
        };
        if (eanKey) seen.set(eanKey, product);
        orderedProducts.push(product);
      });
    });
    return orderedProducts;
  }, [campaigns, primary, cols, stockIndexPO2, stockIndexPO3, zoneIndex]);

  const [pageSize, setPageSize] = useState(100);

  // Products que passam todos os filtros EXCEPTO filterFamily.
  // Os chips de família ficam dinâmicos — clicar "Com stock" actualiza counts.
  const productsExcludingFamilyFilter = useMemo(() => {
    return products.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.description.toLowerCase().includes(q) &&
            !p.ean.toLowerCase().includes(q) &&
            !p.family.toLowerCase().includes(q)) return false;
      }
      if (filterStar && !p.isStar) return false;
      if (filterAssign === 'assigned' && !p.assigned) return false;
      if (filterAssign === 'unassigned' && p.assigned) return false;
      if (filterStock === 'total' && p.stockTotal <= 0) return false;
      if (filterStock === 'po2' && p.stockPO2 <= 0) return false;
      if (filterStock === 'po3' && p.stockPO3 <= 0) return false;
      if (filterCampaign !== 'all' && p.sourceCampaignId !== filterCampaign) return false;
      return true;
    });
  }, [products, search, filterStar, filterAssign, filterStock, filterCampaign]);

  const families = useMemo(() => {
    const counts = new Map();
    for (const p of productsExcludingFamilyFilter) {
      if (p.family) counts.set(p.family, (counts.get(p.family) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [productsExcludingFamilyFilter]);

  const filtered = useMemo(() => {
    let r = products.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.description.toLowerCase().includes(q) &&
            !p.ean.toLowerCase().includes(q) &&
            !p.family.toLowerCase().includes(q)) return false;
      }
      if (filterFamily !== 'all' && p.family !== filterFamily) return false;
      if (filterStar && !p.isStar) return false;
      if (filterAssign === 'assigned' && !p.assigned) return false;
      if (filterAssign === 'unassigned' && p.assigned) return false;
      if (filterStock === 'total' && p.stockTotal <= 0) return false;
      if (filterStock === 'po2' && p.stockPO2 <= 0) return false;
      if (filterStock === 'po3' && p.stockPO3 <= 0) return false;
      if (filterCampaign !== 'all' && p.sourceCampaignId !== filterCampaign) return false;
      return true;
    });
    r = [...r].sort((a, b) => {
      const av = a[sortBy] ?? 0; const bv = b[sortBy] ?? 0;
      if (typeof av === 'string') return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return r;
  }, [products, search, filterFamily, filterStar, filterAssign, filterStock, filterCampaign, sortBy, sortDir]);

  // Reset page size when filters change
  useEffect(() => { setPageSize(100); }, [search, filterFamily, filterStar, filterAssign, filterStock, filterCampaign, sortBy, sortDir]);

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize]);

  // Bulk selection: Set of product ids
  const [selected, setSelected] = useState(new Set());
  const [bulkZonePicker, setBulkZonePicker] = useState(false);
  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const visibleIds = visible.map(p => p.id);
      const allSelected = visibleIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  }, [visible]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  // Reset selection on filter change to avoid acting on hidden items
  useEffect(() => { setSelected(new Set()); }, [search, filterFamily, filterStar, filterAssign, filterStock, filterCampaign]);

  const stockReady = stockRowsPO2.length > 0 || stockRowsPO3.length > 0;
  // Cheap: count assigned via products.length comparison; compute lazily
  const totalAssigned = useMemo(() => products.reduce((n, p) => n + (p.assigned ? 1 : 0), 0), [products]);

  return (
    <div>
      <div className="no-print">
      {/* Column mapping panel — collapsible */}
      <ColumnMappingPanel
        headers={primary.headers}
        autoCols={autoCols}
        cols={cols}
        overrides={overrides}
        onSetOverride={onSetOverride}
        stockRowsPO2={stockRowsPO2}
        stockRowsPO3={stockRowsPO3}
      />

      {/* Status bar */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center',
        padding: '12px 16px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8,
        fontSize: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: cols.ean && cols.description ? T.green : T.warn || T.orange }} />
          <span className="mono" style={{ color: T.inkSoft, letterSpacing: '0.05em' }}>
            colunas: {Object.values(cols).filter(Boolean).length}/{Object.keys(COL_PATTERNS).length} mapeadas
          </span>
        </div>
        <span style={{ color: T.line }}>·</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: stockReady ? T.green : T.inkMute }} />
          <span className="mono" style={{ color: T.inkSoft, letterSpacing: '0.05em' }}>
            stock: {stockReady ? `PO2 ${stockRowsPO2.length} · PO3 ${stockRowsPO3.length}` : 'não carregado'}
          </span>
        </div>
        <span style={{ color: T.line }}>·</span>
        <div className="mono" style={{ color: T.inkSoft, letterSpacing: '0.05em' }}>
          {totalAssigned} de {products.length} já em destaque
        </div>
        <button
          onClick={() => {
            // Show all products before printing
            setPageSize(filtered.length);
            // Wait a tick for DOM to update, then print
            setTimeout(() => window.print(), 100);
          }}
          style={{
            marginLeft: 'auto', padding: '6px 12px', fontSize: 11, fontWeight: 500,
            background: T.ink, color: T.bg, border: 'none', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          title="Imprime a tabela atual com os filtros aplicados"
        >
          <FileText size={11} /> Imprimir
        </button>
      </div>

      {/* Filters — primary row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, flex: '1 1 280px', minWidth: 240 }}>
          <Search size={14} style={{ color: T.inkMute }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar EAN, descrição, família…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%' }} />
        </div>
        <button onClick={() => setFilterStar(s => !s)} style={{
          padding: '8px 12px', fontSize: 12,
          background: filterStar ? T.yellow : T.bgEl, color: T.ink,
          border: `1px solid ${filterStar ? T.yellow : T.line}`, borderRadius: 6,
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: filterStar ? 500 : 400,
        }}>
          <Star size={12} fill={filterStar ? T.ink : 'none'} /> Só estrela
        </button>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6 }}>
          {[
            { id: 'all', l: 'Todos' },
            { id: 'assigned', l: 'Em destaque' },
            { id: 'unassigned', l: 'Por colocar' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterAssign(f.id)} style={{
              padding: '4px 10px', fontSize: 11, borderRadius: 4, border: 'none',
              background: filterAssign === f.id ? T.ink : 'transparent',
              color: filterAssign === f.id ? T.bg : T.inkSoft,
            }}>{f.l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6 }}
             title="Filtrar por stock">
          {[
            { id: 'all', l: 'Stock: todos' },
            { id: 'total', l: 'Com stock' },
            { id: 'po2', l: 'Armazém' },
            { id: 'po3', l: 'Aveiro' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterStock(f.id)} style={{
              padding: '4px 10px', fontSize: 11, borderRadius: 4, border: 'none',
              background: filterStock === f.id ? T.green : 'transparent',
              color: filterStock === f.id ? '#fff' : T.inkSoft,
              fontWeight: filterStock === f.id ? 500 : 400,
            }}>{f.l}</button>
          ))}
        </div>
        {isMulti && (
          <select
            value={filterCampaign}
            onChange={e => setFilterCampaign(e.target.value)}
            style={{
              padding: '6px 10px', fontSize: 11, color: T.ink,
              background: filterCampaign !== 'all' ? T.accentSoft : T.bgEl,
              border: `1px solid ${filterCampaign !== 'all' ? T.accent : T.line}`,
              borderRadius: 6, cursor: 'pointer',
            }}
            title="Filtrar por campanha de origem"
          >
            <option value="all">Todas as campanhas</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        {(filterStar || filterAssign !== 'all' || filterStock !== 'all' || filterFamily !== 'all' || filterCampaign !== 'all' || search) && (
          <button onClick={() => {
            setSearch(''); setFilterStar(false); setFilterAssign('all');
            setFilterStock('all'); setFilterFamily('all'); setFilterCampaign('all');
          }} style={{
            padding: '6px 10px', fontSize: 11,
            background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.inkSoft; e.currentTarget.style.borderColor = T.line; }}
            title="Limpar todos os filtros"
          >
            <X size={11} /> Limpar
          </button>
        )}
        <div className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: T.inkMute, letterSpacing: '0.05em' }}>
          {filtered.length} resultados
        </div>
      </div>

      {/* Family chips */}
      {families.length > 0 && (
        <FamilyChips
          families={families}
          selected={filterFamily}
          onSelect={setFilterFamily}
          totalProducts={productsExcludingFamilyFilter.length}
        />
      )}
      </div>{/* end no-print controls */}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', marginBottom: 10,
          background: T.accent, color: '#fff', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
        }}>
          <Check size={14} />
          <span><strong>{selected.size}</strong> seleccionados</span>
          <button onClick={() => setBulkZonePicker(true)} style={{
            marginLeft: 'auto', padding: '6px 12px', fontSize: 12,
            background: '#fff', color: T.accent, border: 'none', borderRadius: 5,
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <MapPin size={12} /> Mover para zona
          </button>
          <button onClick={clearSelection} title="Limpar selecção" style={{
            padding: '6px 10px', fontSize: 11,
            background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 5,
            cursor: 'pointer',
          }}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Bulk zone picker modal */}
      {bulkZonePicker && (
        <BulkZonePicker
          floors={floors}
          count={selected.size}
          onClose={() => setBulkZonePicker(false)}
          onPick={({ floorId, zoneId }) => {
            const productsToMove = visible.filter(p => selected.has(p.id));
            productsToMove.forEach(p => onSetPrimaryZone(p, { floorId, zoneId }));
            setBulkZonePicker(false);
            clearSelection();
          }}
        />
      )}

      {/* Listing table */}
      <div className="print-area" style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: isMulti ? 1360 : 1280, tableLayout: 'fixed' }}>
            <thead style={{ background: T.lineSoft }}>
              <tr>
                <th style={{ ...lhStyle, width: 28, textAlign: 'center', padding: '4px' }}>
                  <input
                    type="checkbox"
                    checked={visible.length > 0 && visible.every(p => selected.has(p.id))}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                    title="Selecionar tudo o que está visível"
                  />
                </th>
                <SortHeader label="★" align="center" width={28} />
                <SortHeader field="family" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="Família" width={90} />
                <SortHeader field="ean" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="EAN" width={110} />
                <SortHeader field="description" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="Descrição / Título" />
                {isMulti && <th style={{ ...lhStyle, width: 80 }}>Origem</th>}
                <SortHeader field="startDate" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="Início" width={62} />
                <SortHeader label="Fim" width={62} />
                <SortHeader field="basePrice" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="PVP Base" align="right" width={70} />
                <SortHeader field="campaignPrice" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="PVP Camp." align="right" width={72} />
                <SortHeader field="discount" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="Desc %" align="right" width={60} />
                <th style={{ ...lhStyle, background: T.cyan, textAlign: 'right', width: 50 }}>PO2</th>
                <th style={{ ...lhStyle, background: T.cyan, textAlign: 'right', width: 50 }}>PO3</th>
                <SortHeader field="stockTotal" current={sortBy} dir={sortDir} onSort={(f, d) => { setSortBy(f); setSortDir(d); }} label="Total" align="right" width={56} bg={T.cyan} />
                <th style={{ ...lhStyle, width: 220 }}>Móvel atribuído</th>
                <th style={{ ...lhStyle, width: 38, textAlign: 'center' }}>+</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isMulti ? 16 : 15} style={{ padding: 32, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
                  Sem resultados para os filtros atuais.
                </td></tr>
              ) : visible.map((p, i) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  zebra={i % 2 === 1}
                  isSelected={selected.has(p.id)}
                  onToggleSelect={toggleSelect}
                  floors={floors}
                  isMulti={isMulti}
                  onSetPrimaryZone={onSetPrimaryZone}
                  onAssignMore={() => setAssignFor(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > visible.length && (
          <div className="no-print" style={{
            padding: '14px 20px', borderTop: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: T.bg,
          }}>
            <span className="mono" style={{ fontSize: 11, color: T.inkMute, letterSpacing: '0.05em' }}>
              A mostrar {visible.length} de {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPageSize(s => s + 100)} style={{
                padding: '6px 12px', fontSize: 12, background: T.bgEl,
                border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink, fontWeight: 500,
              }}>+100</button>
              <button onClick={() => setPageSize(filtered.length)} style={{
                padding: '6px 12px', fontSize: 12, background: T.ink,
                border: 'none', borderRadius: 6, color: T.bg, fontWeight: 500,
              }}>Mostrar todos ({filtered.length})</button>
            </div>
          </div>
        )}
      </div>

      {/* Assign dialog */}
      {assignFor && (
        <AssignDialog
          product={assignFor}
          floors={floors}
          onPick={(floorId, zoneId) => {
            onAddToZone(floorId, zoneId, assignFor);
            setAssignFor(null);
          }}
          onClose={() => setAssignFor(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FamilyChips — visual filter strip with all families and counts
// ─────────────────────────────────────────────────────────────────────────
function FamilyChips({ families, selected, onSelect, totalProducts }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? families : families.slice(0, 18);
  const hidden = families.length - visible.length;

  return (
    <div style={{
      marginBottom: 16, padding: '12px 14px',
      background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8,
    }}>
      <div className="mono" style={{
        fontSize: 10, letterSpacing: '0.12em', color: T.inkMute,
        textTransform: 'uppercase', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Tag size={11} /> Famílias ({families.length})
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => onSelect('all')}
          style={chipStyle(selected === 'all', T.ink)}
        >
          Todas <span style={chipCountStyle(selected === 'all')}>{totalProducts}</span>
        </button>
        {visible.map(f => {
          const active = selected === f.name;
          return (
            <button
              key={f.name}
              onClick={() => onSelect(active ? 'all' : f.name)}
              title={f.name}
              style={chipStyle(active, T.accent)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {f.name}
              </span>
              <span style={chipCountStyle(active)}>{f.count}</span>
            </button>
          );
        })}
        {hidden > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: '5px 10px', fontSize: 11, fontWeight: 500,
              background: 'transparent', color: T.inkSoft,
              border: `1px dashed ${T.line}`, borderRadius: 4,
              cursor: 'pointer',
            }}
          >+ {hidden} mais</button>
        )}
        {showAll && families.length > 18 && (
          <button
            onClick={() => setShowAll(false)}
            style={{
              padding: '5px 10px', fontSize: 11, fontWeight: 500,
              background: 'transparent', color: T.inkSoft,
              border: `1px solid ${T.line}`, borderRadius: 4,
            }}
          >mostrar menos</button>
        )}
      </div>
    </div>
  );
}

function chipStyle(active, accentColor) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', fontSize: 11, fontWeight: 500,
    background: active ? accentColor : '#fff',
    color: active ? '#fff' : T.ink,
    border: `1px solid ${active ? accentColor : T.line}`,
    borderRadius: 4, cursor: 'pointer',
    transition: 'all 0.12s',
  };
}
function chipCountStyle(active) {
  return {
    fontFamily: 'Geist Mono', fontSize: 10,
    padding: '1px 5px', borderRadius: 2,
    background: active ? 'rgba(255,255,255,0.2)' : T.lineSoft,
    color: active ? '#fff' : T.inkSoft,
    fontWeight: 500,
  };
}

function SortHeader({ field, current, dir, onSort, label, align = 'left', width, bg }) {
  const active = field && current === field;
  const handle = () => {
    if (!field || !onSort) return;
    if (active) onSort(field, dir === 'desc' ? 'asc' : 'desc');
    else onSort(field, 'desc');
  };
  return (
    <th
      onClick={handle}
      style={{ ...lhStyle, textAlign: align, width, background: bg, cursor: field ? 'pointer' : 'default', userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active && (dir === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
      </span>
    </th>
  );
}

const lhStyle = {
  textAlign: 'left', padding: '10px 8px', fontSize: 9, fontWeight: 600,
  letterSpacing: '0.08em', color: T.inkSoft, textTransform: 'uppercase',
  borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap',
};

// ─── BulkZonePicker — modal to pick a destination zone for N selected products
function BulkZonePicker({ floors = [], count, onClose, onPick }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 10, border: `1px solid ${T.line}`,
        width: '100%', maxWidth: 560, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>Mover em massa</div>
            <div className="display" style={{ fontSize: 18, fontStyle: 'italic', marginTop: 2 }}>
              {count} produto{count === 1 ? '' : 's'} → escolhe destino
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {floors.map(floor => (
            <div key={floor.id} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 11, fontWeight: 600, color: T.inkSoft,
                paddingBottom: 6, marginBottom: 8, borderBottom: `2px solid ${floor.color}`,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {floor.star && <Star size={11} fill={floor.color} stroke={floor.color} />}
                {floor.name}
              </div>
              {floor.zones.length === 0 ? (
                <div style={{ fontSize: 11, color: T.inkMute, fontStyle: 'italic' }}>Sem zonas neste piso</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                  {floor.zones.map(zone => (
                    <button
                      key={zone.id}
                      onClick={() => onPick({ floorId: floor.id, zoneId: zone.id })}
                      style={{
                        padding: '8px 10px', textAlign: 'left',
                        background: T.paper, border: `1px solid ${T.lineSoft}`,
                        borderRadius: 5, fontSize: 12, color: T.ink, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = `${T.accent}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.lineSoft; e.currentTarget.style.background = T.paper; }}
                    >
                      <span style={{ fontWeight: 500 }}>{zone.name}</span>
                      <span style={{ fontSize: 9, color: T.inkMute, fontFamily: 'Geist Mono' }}>{(zone.slots || []).length} slots</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Deterministic hue from string — consistent colour per campaign name
function strHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h % 360;
}

const ProductRow = React.memo(function ProductRow({ product, zebra, floors, isMulti, onSetPrimaryZone, onAssignMore, isSelected, onToggleSelect }) {
  const p = product;
  const discount = Number(p.discount);
  const hasStock = p.stockTotal > 0;
  const primaryZone = p.zones[0];
  const primaryValue = primaryZone ? `${primaryZone.floorId}|${primaryZone.zoneId}` : '';

  const handleZoneChange = (val) => {
    if (!val) {
      onSetPrimaryZone(p, null);
      return;
    }
    const [floorId, zoneId] = val.split('|');
    onSetPrimaryZone(p, { floorId, zoneId });
  };

  return (
    <tr style={{
      background: isSelected ? `${T.accent}10` : (zebra ? T.bg : 'transparent'),
      borderLeft: isSelected ? `3px solid ${T.accent}` : (p.isStar ? `3px solid ${T.yellow}` : '3px solid transparent'),
      borderBottom: `1px solid ${T.lineSoft}`,
    }}>
      <td style={{ ...ltdStyle, textAlign: 'center', padding: '4px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={() => onToggleSelect && onToggleSelect(p.id)} style={{ cursor: 'pointer' }} />
      </td>
      <td style={{ ...ltdStyle, textAlign: 'center' }}>
        {p.isStar && <Star size={14} fill={T.yellow} stroke={T.yellow} style={{ verticalAlign: 'middle' }} />}
      </td>
      <td style={ltdStyle}>
        {p.family ? (
          <span style={{
            fontSize: 9, padding: '2px 5px', background: T.lineSoft,
            borderRadius: 3, color: T.inkSoft, fontWeight: 500,
            display: 'inline-block', maxWidth: '100%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={p.family}>{p.family}</span>
        ) : <span style={{ color: T.inkMute }}>—</span>}
      </td>
      <td style={{ ...ltdStyle, fontFamily: 'Geist Mono', fontSize: 11, color: T.inkSoft }}>
        {p.ean || '—'}
      </td>
      <td style={{ ...ltdStyle, fontWeight: 500 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.description}>
          {p.description || '—'}
        </div>
      </td>
      {isMulti && (
        <td style={ltdStyle}>
          {p.sourceCampaignName ? (() => {
            const hue = strHue(p.sourceCampaignName);
            return (
              <span title={p.sourceCampaignName} style={{
                display: 'inline-block', maxWidth: '100%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 9, padding: '2px 5px', borderRadius: 3, fontWeight: 600,
                background: `hsl(${hue},55%,88%)`, color: `hsl(${hue},50%,28%)`,
              }}>{p.sourceCampaignName}</span>
            );
          })() : <span style={{ color: T.inkMute }}>—</span>}
        </td>
      )}
      <td style={{ ...ltdStyle, color: T.inkSoft }} className="mono">{formatDate(p.startDate)}</td>
      <td style={{ ...ltdStyle, color: T.inkSoft }} className="mono">{formatDate(p.endDate)}</td>
      <td style={{ ...ltdStyle, textAlign: 'right', color: T.inkSoft, textDecoration: discount > 0 ? 'line-through' : 'none' }} className="mono">
        {formatPrice(p.basePrice)}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right', fontWeight: 600 }} className="mono">
        {formatPrice(p.campaignPrice)}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right' }}>
        {discount >= 1 ? (
          <span title={p.discountIsCalculated ? 'Calculado a partir dos preços' : 'Valor explícito do ficheiro'} style={{
            display: 'inline-block', padding: '2px 6px',
            background: p.discountIsCalculated ? '#fff' : T.accent,
            color: p.discountIsCalculated ? T.accent : '#fff',
            border: p.discountIsCalculated ? `1px solid ${T.accent}` : 'none',
            borderRadius: 3, fontWeight: 600, fontSize: 11,
            fontFamily: 'Geist Mono',
          }}>−{discount.toFixed(0)}%</span>
        ) : <span style={{ color: T.inkMute }}>—</span>}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right', color: hasStock ? T.ink : T.inkMute }} className="mono">{p.stockPO2}</td>
      <td style={{ ...ltdStyle, textAlign: 'right', color: hasStock ? T.ink : T.inkMute }} className="mono">{p.stockPO3}</td>
      <td style={{ ...ltdStyle, textAlign: 'right', fontWeight: 600, color: hasStock ? T.green : T.red }} className="mono">{p.stockTotal}</td>
      <td style={ltdStyle}>
        <ZonePicker
          product={p}
          floors={floors}
          primaryZone={primaryZone}
          onChange={handleZoneChange}
        />
      </td>
      <td style={{ ...ltdStyle, textAlign: 'center' }}>
        <button onClick={onAssignMore} disabled={!p.ean} title="Atribuir a múltiplas zonas" style={{
          padding: 4, background: 'transparent', color: p.ean ? T.inkSoft : T.inkMute,
          border: `1px solid ${T.line}`, borderRadius: 3,
          display: 'inline-flex', alignItems: 'center', cursor: p.ean ? 'pointer' : 'not-allowed',
        }}
          onMouseEnter={e => { if (p.ean) { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = T.accent; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = p.ean ? T.inkSoft : T.inkMute; e.currentTarget.style.borderColor = T.line; }}>
          <Plus size={11} />
        </button>
      </td>
    </tr>
  );
});

// ─────────────────────────────────────────────────────────────────────────
// ZonePicker — click-to-edit. Only mounts the <select> when active.
// Massive perf win: with 100 rows × 15 zones, would be 1500 <option> elements
// otherwise, all parsed and held in DOM. With this pattern: 0 until clicked.
// ─────────────────────────────────────────────────────────────────────────
const ZonePicker = React.memo(function ZonePicker({ product, floors, primaryZone, onChange }) {
  const [editing, setEditing] = useState(false);
  const p = product;

  if (!p.ean) {
    return (
      <span style={{
        display: 'inline-block', padding: '4px 8px', fontSize: 11,
        color: T.inkMute, fontStyle: 'italic',
      }}>sem EAN</span>
    );
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setEditing(true)}
          style={{
            flex: 1, padding: '4px 8px', fontSize: 11, textAlign: 'left',
            background: p.assigned ? '#fff' : T.bgEl,
            color: p.assigned ? T.ink : T.inkMute,
            border: `1px solid ${(p.assigned && primaryZone) ? primaryZone.color : T.line}`,
            borderLeft: (p.assigned && primaryZone) ? `3px solid ${primaryZone.color}` : `1px solid ${T.line}`,
            borderRadius: 3, cursor: 'pointer',
            fontWeight: (p.assigned && primaryZone) ? 500 : 400,
            maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
          title={(p.assigned && primaryZone) ? `${primaryZone.floorName} › ${primaryZone.zoneName} — clica para alterar` : 'Clica para atribuir'}
        >
          {(p.assigned && primaryZone) ? primaryZone.zoneName : '— Atribuir móvel'}
        </button>
        {p.zones.length > 1 && (
          <span title={p.zones.slice(1).map(z => `${z.floorName} › ${z.zoneName}`).join('\n')} style={{
            fontSize: 9, padding: '2px 5px', background: T.accent, color: '#fff',
            borderRadius: 3, fontWeight: 600, fontFamily: 'Geist Mono',
          }}>+{p.zones.length - 1}</span>
        )}
      </div>
    );
  }

  // Active editing — only this row mounts the full <select>
  return (
    <select
      autoFocus
      value={primaryZone ? `${primaryZone.floorId}|${primaryZone.zoneId}` : ''}
      onChange={e => { onChange(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      style={{
        width: '100%', padding: '4px 6px', fontSize: 11,
        background: T.paper, color: T.ink,
        border: `1.5px solid ${T.accent}`, borderRadius: 3,
        maxWidth: 240, fontFamily: 'inherit',
      }}
    >
      <option value="">— Não atribuído</option>
      {floors.map(f => (
        <optgroup key={f.id} label={f.name}>
          {f.zones.map(z => (
            <option key={z.id} value={`${f.id}|${z.id}`}>{z.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});

const ltdStyle = { padding: '7px 8px', fontSize: 12, verticalAlign: 'middle', whiteSpace: 'nowrap' };

function AssignDialog({ product, floors, onPick, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      animation: 'fadeUp 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 32,
        width: 'min(560px, 90vw)', maxHeight: '80vh', overflow: 'auto',
        border: `1px solid ${T.line}`,
        boxShadow: '0 40px 80px -20px rgba(20,18,16,0.4)',
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 8 }}>
          Atribuir a uma zona
        </div>
        <h3 className="display" style={{ fontSize: 24, margin: '0 0 4px', fontStyle: 'italic' }}>
          {product.description || product.ean || 'Produto'}
        </h3>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 24, fontFamily: 'Geist Mono' }}>
          EAN {product.ean || '—'} · stock total {product.stockTotal}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {floors.map(f => (
            <div key={f.id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                paddingBottom: 6, borderBottom: `1.5px solid ${f.color}`,
              }}>
                {f.star && <Star size={14} fill={f.color} stroke={f.color} />}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {f.zones.map(z => (
                  <button key={z.id} onClick={() => onPick(f.id, z.id)} style={{
                    padding: '10px 12px', textAlign: 'left',
                    background: T.bgEl, color: T.ink,
                    border: `1px solid ${T.line}`, borderRadius: 6,
                    fontSize: 12, transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = f.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = f.color; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.bgEl; e.currentTarget.style.color = T.ink; e.currentTarget.style.borderColor = T.line; }}>
                    {z.name}
                    <div className="mono" style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{z.slots.length} produtos</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          marginTop: 24, padding: '10px 16px', background: 'transparent',
          color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 6,
          fontSize: 13, width: '100%',
        }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ColumnMappingPanel — collapsible UI to fix wrongly-detected columns
// ─────────────────────────────────────────────────────────────────────────
function ColumnMappingPanel({ headers, autoCols, cols, overrides, onSetOverride, stockRowsPO2, stockRowsPO3 }) {
  const [open, setOpen] = useState(false);
  const fields = Object.keys(COL_PATTERNS);
  const numMapped = fields.filter(f => cols[f]).length;
  const allMapped = numMapped === fields.length;
  const hasIssues = !cols.ean || !cols.description;

  return (
    <div style={{
      marginBottom: 16, background: hasIssues ? '#FEF6E7' : T.bgEl,
      border: `1px solid ${hasIssues ? T.warn || T.orange : T.line}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 4,
          background: allMapped ? T.green : (hasIssues ? T.orange : T.warn || T.orange),
        }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          Mapeamento de colunas
        </span>
        <span className="mono" style={{ fontSize: 11, color: T.inkMute }}>
          {numMapped}/{fields.length} mapeadas
          {hasIssues && ' · ⚠ campos críticos por mapear'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.inkSoft }}>
          {open ? '▲ fechar' : '▼ abrir para corrigir'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.lineSoft}` }}>
          <div style={{ fontSize: 12, color: T.inkSoft, padding: '12px 0', lineHeight: 1.5 }}>
            Se algum campo está a apanhar a coluna errada (por ex. <em>Descrição</em> a mostrar o nome do gestor),
            escolhe a coluna correta na lista abaixo. As alterações aplicam-se imediatamente à listagem.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {fields.map(f => {
              const auto = autoCols[f];
              const current = overrides[f] !== undefined ? overrides[f] : auto;
              const isOverride = overrides[f] !== undefined;
              return (
                <div key={f} style={{
                  padding: 10, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 3,
                      background: current ? T.green : T.inkMute,
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.ink }}>{FIELD_LABELS[f]}</span>
                    {isOverride && (
                      <span style={{ fontSize: 9, padding: '1px 5px', background: T.accent, color: '#fff', borderRadius: 2, marginLeft: 'auto' }}>MANUAL</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select
                      value={current || ''}
                      onChange={e => onSetOverride(f, e.target.value || null)}
                      style={{
                        flex: 1, padding: '4px 6px', fontSize: 11,
                        border: `1px solid ${T.line}`, borderRadius: 3, background: T.paper,
                      }}
                    >
                      <option value="">— não mapeada</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {isOverride && (
                      <button onClick={() => onSetOverride(f, undefined)} title="Voltar ao auto" style={{
                        padding: '4px 8px', fontSize: 10, background: T.bgEl,
                        border: `1px solid ${T.line}`, borderRadius: 3, color: T.inkSoft,
                      }}>auto</button>
                    )}
                  </div>
                  {auto && current !== auto && (
                    <div style={{ fontSize: 10, color: T.inkMute, marginTop: 4, fontStyle: 'italic' }}>
                      auto-detetado: {auto}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stock files info */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.lineSoft}`, fontSize: 11, color: T.inkSoft, lineHeight: 1.6 }}>
            <strong style={{ color: T.ink }}>Stock PO2 / PO3:</strong>{' '}
            {stockRowsPO2.length === 0 && stockRowsPO3.length === 0
              ? 'Carrega os ficheiros em "Stock" para cruzar.'
              : 'O cruzamento é feito por EAN (com normalização para zeros à esquerda e formato científico). Se algum produto não puxa o stock, vai a "Stock" e ajusta o mapeamento das colunas EAN / Aveiro.'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Floor Planner
// ─────────────────────────────────────────────────────────────────────────
function FloorPlanner({ floor, editZones, activeCampaign, candidates, stockRowsPO2, stockMapPO2, stockRowsPO3, stockMapPO3, onAddZone, onRenameZone, onDeleteZone, onAddSlot, onUpdateSlot, onDeleteSlot, onAutoFillZone }) {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
        paddingBottom: 8, borderBottom: `1.5px solid ${floor.color}`,
      }}>
        {floor.star && <Star size={18} fill={floor.color} stroke={floor.color} />}
        <h2 className="display" style={{ fontSize: 32, margin: 0, fontStyle: 'italic' }}>{floor.name}</h2>
        <div className="mono" style={{ fontSize: 10, color: T.inkMute, letterSpacing: '0.1em' }}>
          {floor.zones.length} zonas · {floor.zones.reduce((s, z) => s + z.slots.length, 0)} produtos
        </div>
        {editZones && (
          <button onClick={onAddZone} style={{
            marginLeft: 'auto', padding: '6px 10px', fontSize: 11,
            background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}><Plus size={11} /> Adicionar zona</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {floor.zones.map(zone => (
          <ZoneBlock
            key={zone.id}
            zone={zone}
            color={floor.color}
            editZones={editZones}
            activeCampaign={activeCampaign}
            candidates={candidates}
            stockRowsPO2={stockRowsPO2} stockMapPO2={stockMapPO2}
            stockRowsPO3={stockRowsPO3} stockMapPO3={stockMapPO3}
            onRename={n => onRenameZone(zone.id, n)}
            onDelete={() => onDeleteZone(zone.id)}
            onAddSlot={() => onAddSlot(zone.id)}
            onUpdateSlot={(sid, patch) => onUpdateSlot(zone.id, sid, patch)}
            onDeleteSlot={sid => onDeleteSlot(zone.id, sid)}
            onAutoFillZone={onAutoFillZone}
          />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Zone Block
// ─────────────────────────────────────────────────────────────────────────
function ZoneBlock({ zone, color, editZones, activeCampaign, candidates, stockRowsPO2, stockMapPO2, stockRowsPO3, stockMapPO3, onRename, onDelete, onAddSlot, onUpdateSlot, onDeleteSlot, onAutoFillZone }) {
  const [editName, setEditName] = useState(false);
  const [tempName, setTempName] = useState(zone.name);

  return (
    <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: color, color: '#fff',
      }}>
        {editZones && <GripVertical size={14} style={{ opacity: 0.6, cursor: 'grab' }} />}
        {editName ? (
          <input
            value={tempName}
            autoFocus
            onChange={e => setTempName(e.target.value)}
            onBlur={() => { onRename(tempName); setEditName(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(tempName); setEditName(false); } }}
            style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 3, outline: 'none', fontSize: 13, fontWeight: 600 }}
          />
        ) : (
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', flex: 1 }}>{zone.name.toUpperCase()}</h3>
        )}
        <span className="mono" style={{ fontSize: 10, opacity: 0.8 }}>
          {zone.slots.length} produtos
        </span>
        {onAutoFillZone && activeCampaign && (
          <button onClick={() => onAutoFillZone(zone.id)} title="Auto-preencher esta zona com base nas regras" style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', borderRadius: 3, padding: '3px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500,
          }}>
            <Sparkles size={11} /> Auto
          </button>
        )}
        {editZones && (
          <>
            <button onClick={() => setEditName(true)} style={iconBtn}><Edit3 size={12} /></button>
            <button onClick={onDelete} style={iconBtn}><Trash2 size={12} /></button>
          </>
        )}
      </header>

      {zone.slots.length > 0 && (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: T.lineSoft }}>
                <th style={zhStyle}>REF</th>
                <th style={{ ...zhStyle, minWidth: 240 }}>PRODUTO</th>
                <th style={zhStyle}>CARTAZ</th>
                <th style={zhStyle}>ESTADO</th>
                <th style={zhStyle}>DATA</th>
                <th style={{ ...zhStyle, minWidth: 160 }}>CAMPANHA</th>
                <th style={zhStyle}>OBSERVAÇÕES</th>
                <th style={{ ...zhStyle, background: T.cyan, textAlign: 'center', width: 70 }}>STOCK PO2</th>
                <th style={{ ...zhStyle, background: T.cyan, textAlign: 'center', width: 70 }}>STOCK PO3</th>
                <th style={{ ...zhStyle, background: T.yellow, textAlign: 'center', width: 70 }}>PEDIDO GU</th>
                <th style={{ ...zhStyle, width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {zone.slots.map(slot => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  activeCampaign={activeCampaign}
                  candidates={candidates}
                  stockRowsPO2={stockRowsPO2} stockMapPO2={stockMapPO2}
                  stockRowsPO3={stockRowsPO3} stockMapPO3={stockMapPO3}
                  onUpdate={p => onUpdateSlot(slot.id, p)}
                  onDelete={() => onDeleteSlot(slot.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: '8px 16px', borderTop: zone.slots.length ? `1px solid ${T.lineSoft}` : 'none' }}>
        <button onClick={onAddSlot} style={{
          background: 'transparent', border: 'none', color: T.accent,
          fontSize: 12, fontWeight: 500, padding: '4px 0',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={12} /> Adicionar produto a esta zona
        </button>
      </div>
    </div>
  );
}

const iconBtn = { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 3, padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' };
const zhStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap' };
const ztdStyle = { padding: '2px 4px', borderBottom: `1px solid ${T.lineSoft}`, verticalAlign: 'middle' };

// ─────────────────────────────────────────────────────────────────────────
// Slot Row
// ─────────────────────────────────────────────────────────────────────────
function SlotRow({ slot, activeCampaign, candidates, stockRowsPO2 = [], stockMapPO2 = {}, stockRowsPO3 = [], stockMapPO3 = {}, onUpdate, onDelete }) {
  const [showSuggest, setShowSuggest] = useState(false);
  const stateOpt = STATES.find(s => s.id === slot.state) || STATES[0];

  // Build stock indexes (memoised per stock data, not per slot)
  const { index: stockIdxPO2 } = useMemo(() => buildStockIndex(stockRowsPO2, stockMapPO2), [stockRowsPO2, stockMapPO2]);
  const { index: stockIdxPO3 } = useMemo(() => buildStockIndex(stockRowsPO3, stockMapPO3), [stockRowsPO3, stockMapPO3]);

  // Resolve PO2/PO3: use stored value if set, otherwise look up by EAN from stock index
  const resolvedPO2 = useMemo(() => {
    if (slot.stockPO2 !== '' && slot.stockPO2 !== undefined) return slot.stockPO2;
    const key = normalizeEAN(slot.ref);
    return key ? String(stockIdxPO2.get(key) ?? '') : '';
  }, [slot.stockPO2, slot.ref, stockIdxPO2]);

  const resolvedPO3 = useMemo(() => {
    if (slot.stockPO3 !== '' && slot.stockPO3 !== undefined) return slot.stockPO3;
    const key = normalizeEAN(slot.ref);
    return key ? String(stockIdxPO3.get(key) ?? '') : '';
  }, [slot.stockPO3, slot.ref, stockIdxPO3]);

  // If slot.name is empty but slot.ref is set, resolve full product info from activeCampaign by EAN
  const resolvedProduct = useMemo(() => {
    if (!slot.ref || !activeCampaign) return null;
    const cols = detectColumns(activeCampaign.headers);
    if (!cols.ean) return null;
    const normRef = normalizeEAN(slot.ref);
    const match = activeCampaign.rows.find(r => normalizeEAN(String(r[cols.ean] || '')) === normRef);
    if (!match) return null;
    return {
      name: cols.description ? String(match[cols.description] || '') : '',
      family: cols.family ? String(match[cols.family] || '') : '',
      subfamily: cols.subfamily ? String(match[cols.subfamily] || '') : '',
      basePrice: cols.basePrice ? parseNum(match[cols.basePrice]) : 0,
      campaignPrice: cols.campaignPrice ? parseNum(match[cols.campaignPrice]) : 0,
      discount: cols.discount ? parseNum(match[cols.discount]) : 0,
    };
  }, [slot.ref, activeCampaign]);
  const resolvedName = slot.name || resolvedProduct?.name || '';
  const resolvedFamily = slot.family || resolvedProduct?.family || '';
  const resolvedSubfamily = slot.subfamily || resolvedProduct?.subfamily || '';
  const resolvedBasePrice = Number(slot.basePrice || resolvedProduct?.basePrice || 0);
  const resolvedCampPrice = Number(slot.campaignPrice || resolvedProduct?.campaignPrice || 0);
  // Use the explicit discount when ≥0.5%; otherwise compute from prices
  const explicitDiscount = Number(slot.discount || resolvedProduct?.discount || 0);
  const calcDiscount = (resolvedBasePrice > 0 && resolvedCampPrice > 0 && resolvedCampPrice < resolvedBasePrice)
    ? ((resolvedBasePrice - resolvedCampPrice) / resolvedBasePrice) * 100
    : 0;
  const resolvedDiscount = explicitDiscount >= 0.5 ? explicitDiscount : calcDiscount;

  // Auto-suggest from active campaign or candidates as user types — full product object
  const suggestions = useMemo(() => {
    if (!slot.name || slot.name.length < 2) return [];
    const all = [];
    if (activeCampaign) {
      const cols = detectColumns(activeCampaign.headers || []);
      activeCampaign.rows.forEach((r, i) => {
        const refKey = cols.ean || activeCampaign.headers.find(h => /ref|sku|cód|cod|ean/i.test(h)) || activeCampaign.headers[0];
        const nameKey = cols.description || activeCampaign.headers.find(h => /nome|descri|produto|artigo/i.test(h)) || activeCampaign.headers[1];
        all.push({
          source: 'campanha',
          ref: String(r[refKey] ?? `#${i}`),
          name: String(r[nameKey] ?? ''),
          family: cols.family ? String(r[cols.family] ?? '') : '',
          subfamily: cols.subfamily ? String(r[cols.subfamily] ?? '') : '',
          basePrice: cols.basePrice ? parseNum(r[cols.basePrice]) : 0,
          campaignPrice: cols.campaignPrice ? parseNum(r[cols.campaignPrice]) : 0,
          discount: cols.discount ? parseNum(r[cols.discount]) : 0,
          startDate: cols.startDate ? r[cols.startDate] : '',
          endDate: cols.endDate ? r[cols.endDate] : '',
        });
      });
    }
    candidates.forEach(c => all.push({ source: 'vendas', ref: c.ref, name: c.name }));
    const q = slot.name.toLowerCase();
    return all.filter(a => a.name.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q)).slice(0, 5);
  }, [slot.name, activeCampaign, candidates]);

  return (
    <tr style={{ background: slot.state === 'falta' ? '#FEF1EF' : 'transparent' }}>
      <td style={{ ...ztdStyle, background: T.cyan, fontFamily: 'Geist Mono', fontSize: 11 }}>
        <input
          value={slot.ref}
          onChange={e => onUpdate({ ref: e.target.value })}
          onBlur={() => {
            if (!resolvedProduct) return;
            const updates = {};
            if (!slot.name && resolvedProduct.name) updates.name = resolvedProduct.name;
            if (!slot.family && resolvedProduct.family) updates.family = resolvedProduct.family;
            if (!slot.subfamily && resolvedProduct.subfamily) updates.subfamily = resolvedProduct.subfamily;
            if (!slot.basePrice && resolvedProduct.basePrice) updates.basePrice = resolvedProduct.basePrice;
            if (!slot.campaignPrice && resolvedProduct.campaignPrice) updates.campaignPrice = resolvedProduct.campaignPrice;
            if (!slot.discount && resolvedProduct.discount) updates.discount = resolvedProduct.discount;
            if (Object.keys(updates).length > 0) onUpdate(updates);
          }}
          className="row-input"
          placeholder="ref"
          style={{ fontSize: 11 }}
        />
      </td>
      <td style={{ ...ztdStyle, position: 'relative' }}>
        {(resolvedFamily || resolvedCampPrice > 0 || resolvedDiscount > 0) && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 9, color: T.inkMute, fontFamily: 'Geist Mono', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resolvedFamily && <span>{resolvedFamily}{resolvedSubfamily ? ` › ${resolvedSubfamily}` : ''}</span>}
            {resolvedCampPrice > 0 && (
              <>
                {resolvedFamily && <span style={{ color: T.line }}>·</span>}
                <span style={{ color: T.ink, fontWeight: 500 }}>{Number(resolvedCampPrice).toFixed(2)}€</span>
                {resolvedBasePrice > 0 && resolvedBasePrice > resolvedCampPrice && (
                  <span style={{ color: T.inkMute, textDecoration: 'line-through' }}>{Number(resolvedBasePrice).toFixed(2)}€</span>
                )}
                {resolvedDiscount > 0 && (
                  <span style={{ color: resolvedDiscount >= 30 ? T.green : T.accent, fontWeight: 600 }}>-{Math.round(resolvedDiscount)}%</span>
                )}
              </>
            )}
          </div>
        )}
        <input
          value={slot.name || resolvedName || ''}
          onChange={e => { onUpdate({ name: e.target.value }); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
          className="row-input"
          placeholder="nome do produto"
          title={resolvedName}
          style={!slot.name && resolvedName ? { color: T.inkSoft, fontStyle: 'italic' } : undefined}
        />
        {showSuggest && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            background: T.paper, border: `1px solid ${T.line}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(20,18,16,0.12)', marginTop: 2,
          }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => onUpdate({
                ref: s.ref, name: s.name,
                family: s.family || '', subfamily: s.subfamily || '',
                basePrice: s.basePrice || '', campaignPrice: s.campaignPrice || '',
                discount: s.discount || 0,
                startDate: s.startDate ? String(s.startDate) : '',
                endDate: s.endDate ? String(s.endDate) : '',
              })} style={{
                display: 'flex', width: '100%', padding: '8px 10px', textAlign: 'left',
                background: 'transparent', border: 'none', borderBottom: i < suggestions.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
                gap: 8, alignItems: 'center',
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.bgEl}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="mono" style={{ fontSize: 9, padding: '2px 5px', background: s.source === 'vendas' ? T.accentSoft : T.cyan, borderRadius: 2, color: T.ink }}>
                  {s.source}
                </span>
                <span className="mono" style={{ fontSize: 10, color: T.inkMute, minWidth: 70 }}>{s.ref}</span>
                <span style={{ fontSize: 12, flex: 1 }}>{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </td>
      <td style={ztdStyle}>
        <select value={slot.cartaz} onChange={e => onUpdate({ cartaz: e.target.value })} className="row-input">
          {CARTAZ.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td style={{ ...ztdStyle, padding: 4 }}>
        <select value={slot.state} onChange={e => onUpdate({ state: e.target.value })} style={{
          width: '100%', padding: '4px 6px', fontSize: 11, fontWeight: 600,
          background: stateOpt.bg, color: stateOpt.fg, border: 'none', borderRadius: 3,
          textAlign: 'center', appearance: 'none', cursor: 'pointer',
        }}>
          {STATES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </td>
      <td style={ztdStyle}>
        <input type="text" value={slot.date} onChange={e => onUpdate({ date: e.target.value })} className="row-input" placeholder="—" />
      </td>
      <td style={{ ...ztdStyle, background: slot.campaign ? T.blue : 'transparent', color: slot.campaign ? '#fff' : T.ink }}>
        <input value={slot.campaign} onChange={e => onUpdate({ campaign: e.target.value })} className="row-input"
          placeholder="campanha" style={{ color: slot.campaign ? '#fff' : T.ink, fontWeight: slot.campaign ? 500 : 400 }} />
      </td>
      <td style={ztdStyle}>
        <input value={slot.observations} onChange={e => onUpdate({ observations: e.target.value })} className="row-input" placeholder="—" />
      </td>
      <td style={{ ...ztdStyle, textAlign: 'center', background: resolvedPO2 && !slot.stockPO2 ? '#EAF5FB' : 'transparent' }}>
        <input
          value={slot.stockPO2}
          onChange={e => onUpdate({ stockPO2: e.target.value })}
          onFocus={e => { if (!slot.stockPO2 && resolvedPO2) onUpdate({ stockPO2: resolvedPO2 }); }}
          placeholder={resolvedPO2 || '—'}
          className="row-input mono"
          style={{ textAlign: 'center', fontSize: 11, color: slot.stockPO2 ? T.ink : T.inkMute }}
        />
      </td>
      <td style={{ ...ztdStyle, textAlign: 'center', background: resolvedPO3 && !slot.stockPO3 ? '#EAF5FB' : 'transparent' }}>
        <input
          value={slot.stockPO3}
          onChange={e => onUpdate({ stockPO3: e.target.value })}
          onFocus={e => { if (!slot.stockPO3 && resolvedPO3) onUpdate({ stockPO3: resolvedPO3 }); }}
          placeholder={resolvedPO3 || '—'}
          className="row-input mono"
          style={{ textAlign: 'center', fontSize: 11, color: slot.stockPO3 ? T.ink : T.inkMute }}
        />
      </td>
      <td style={{ ...ztdStyle, textAlign: 'center', background: T.yellow }}>
        <input value={slot.pedidoGU} onChange={e => onUpdate({ pedidoGU: e.target.value })} className="row-input mono" style={{ textAlign: 'center', fontSize: 11, fontWeight: 600 }} />
      </td>
      <td style={ztdStyle}>
        <button onClick={onDelete} style={{
          background: 'transparent', border: 'none', color: T.inkMute, padding: 4,
          display: 'flex', alignItems: 'center', borderRadius: 3,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = T.red; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.inkMute; }}>
          <X size={12} />
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Output Preview — print-friendly structured view (matches spreadsheet)
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// PedidoGUView — calcula e exporta unidades a pedir ao armazém (PO2)
// para preencher cada zona/móvel. GU = Garantia de Unidades = qtd a pedir.
// ─────────────────────────────────────────────────────────────────────────
function PedidoGUView({ floors, activeCampaign, stockRowsPO2, stockMapPO2, stockRowsPO3, stockMapPO3, onUpdateSlot, campaignName }) {
  // Default target qty per slot (configurable globally; can be overridden per zone via zoneTargets)
  const [defaultTarget, setDefaultTarget] = useStoredState('pedido.defaultTarget', 1);
  // Map: zoneId → target qty (overrides defaultTarget for that zone)
  const [zoneTargets, setZoneTargets] = useStoredState('pedido.zoneTargets', {});

  const { index: idxPO2 } = useMemo(() => buildStockIndex(stockRowsPO2, stockMapPO2), [stockRowsPO2, stockMapPO2]);
  const { index: idxPO3 } = useMemo(() => buildStockIndex(stockRowsPO3, stockMapPO3), [stockRowsPO3, stockMapPO3]);

  const productIdx = useMemo(() => {
    const map = new Map();
    if (!activeCampaign) return map;
    const cols = detectColumns(activeCampaign.headers || []);
    if (!cols.ean) return map;
    for (const r of (activeCampaign.rows || [])) {
      const key = normalizeEAN(r[cols.ean]);
      if (!key || map.has(key)) continue;
      map.set(key, {
        name: cols.description ? String(r[cols.description] ?? '').trim() : '',
        family: cols.family ? String(r[cols.family] ?? '').trim() : '',
      });
    }
    return map;
  }, [activeCampaign]);

  const targetForZone = (zoneId) => zoneTargets[zoneId] ?? defaultTarget;

  // Build list of {floor, zone, slot, ean, name, po2, po3, target, suggestedPedido, currentPedido}
  const allRows = useMemo(() => {
    const out = [];
    for (const floor of (floors || [])) {
      for (const zone of (floor.zones || [])) {
        const target = targetForZone(zone.id);
        for (const slot of (zone.slots || [])) {
          const ean = String(slot.ref || '').trim();
          const eanKey = normalizeEAN(ean);
          if (!ean) continue;
          const po2 = eanKey ? Number(idxPO2.get(eanKey) ?? 0) : 0;
          const po3 = eanKey ? Number(idxPO3.get(eanKey) ?? 0) : 0;
          const product = eanKey ? productIdx.get(eanKey) : null;
          const name = slot.name || product?.name || '';
          const family = slot.family || product?.family || '';
          // Suggested = max(0, target - PO3), capped at PO2 available
          const suggested = Math.max(0, Math.min(po2, target - po3));
          const current = slot.pedidoGU !== '' && slot.pedidoGU != null ? Number(slot.pedidoGU) : suggested;
          out.push({
            floorId: floor.id, floorName: floor.name, floorColor: floor.color,
            zoneId: zone.id, zoneName: zone.name,
            slotId: slot.id,
            ean, name, family,
            po2, po3, target,
            suggested,
            current: isNaN(current) ? suggested : current,
          });
        }
      }
    }
    return out;
  }, [floors, idxPO2, idxPO3, productIdx, zoneTargets, defaultTarget]);

  // Group by zone
  const zonesGrouped = useMemo(() => {
    const groups = new Map();
    for (const r of allRows) {
      const key = `${r.floorId}|${r.zoneId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          floorName: r.floorName, floorColor: r.floorColor,
          zoneId: r.zoneId, zoneName: r.zoneName, target: r.target, slots: [],
        });
      }
      groups.get(key).slots.push(r);
    }
    return [...groups.values()];
  }, [allRows]);

  // Aggregated per-EAN totals (the export's main view)
  const aggregated = useMemo(() => {
    const map = new Map();
    for (const r of allRows) {
      if (!map.has(r.ean)) {
        map.set(r.ean, { ean: r.ean, name: r.name, family: r.family, po2: r.po2, po3: r.po3, units: 0 });
      }
      map.get(r.ean).units += (r.current || 0);
    }
    return [...map.values()].filter(r => r.units > 0).sort((a, b) => b.units - a.units);
  }, [allRows]);

  const totalUnits = aggregated.reduce((s, r) => s + r.units, 0);
  const totalDistinct = aggregated.length;

  const applyAllSuggested = () => {
    if (!confirm(`Substituir todos os pedidos GU pelos valores sugeridos (target − PO3, limitado pelo PO2)?\n\n${allRows.length} slots serão actualizados.`)) return;
    for (const r of allRows) {
      onUpdateSlot && onUpdateSlot(r.zoneId, r.slotId, { pedidoGU: String(r.suggested) });
    }
  };

  const setSlotPedido = (zoneId, slotId, value) => {
    const v = String(value).replace(/[^\d]/g, '');
    onUpdateSlot && onUpdateSlot(zoneId, slotId, { pedidoGU: v });
  };

  const setZoneTarget = (zoneId, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setZoneTargets({ ...zoneTargets, [zoneId]: n });
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    // Sheet 1: aggregated (EAN, Descrição, Unidades) — the user's main request
    const ws1 = XLSX.utils.json_to_sheet(aggregated.map(r => ({
      EAN: r.ean,
      'Descrição': r.name,
      'Família': r.family,
      'Unidades': r.units,
      'Stock PO2 (armazém)': r.po2,
      'Stock PO3 (loja)': r.po3,
    })));
    // Sheet 2: detalhe por slot (audit trail)
    const ws2 = XLSX.utils.json_to_sheet(allRows.filter(r => r.current > 0).map(r => ({
      Piso: r.floorName,
      'Móvel/Zona': r.zoneName,
      EAN: r.ean,
      'Descrição': r.name,
      'Target/slot': r.target,
      'Stock PO2': r.po2,
      'Stock PO3': r.po3,
      'Sugerido': r.suggested,
      'Pedido': r.current,
    })));
    XLSX.utils.book_append_sheet(wb, ws1, 'Pedido (resumo)');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalhe por móvel');
    const stamp = new Date().toISOString().slice(0, 10);
    const safeName = (campaignName || 'campanha').replace(/[^\w\d-_]/g, '_').slice(0, 40);
    XLSX.writeFile(wb, `pedido_${safeName}_${stamp}.xlsx`);
  };

  if (allRows.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: T.inkMute }}>
        <Warehouse size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>Nenhum slot atribuído ainda.</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Adiciona produtos às zonas no Plano para calcular o pedido ao armazém.</div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Warehouse size={22} style={{ color: T.accent }} /> Pedido ao Armazém (GU)
        </h2>
        <p style={{ fontSize: 12, color: T.inkMute, marginTop: 6, lineHeight: 1.5, maxWidth: 720 }}>
          Calcula as unidades a pedir ao armazém (PO2) para preencher cada móvel da campanha. Por defeito sugere
          <strong> target − stock PO3 actual</strong>, limitado pelas unidades disponíveis em PO2. Podes ajustar
          manualmente cada slot ou redefinir o target por zona.
        </p>
      </div>

      {/* Top controls */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        padding: '12px 16px', marginBottom: 16, background: T.bgEl,
        border: `1px solid ${T.line}`, borderRadius: 8,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.inkSoft }}>
          Target por slot (default):
          <input
            type="number" min="0" max="999"
            value={defaultTarget}
            onChange={e => setDefaultTarget(Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{
              width: 60, padding: '5px 8px', fontSize: 13, fontFamily: 'Geist Mono, monospace',
              background: T.paper, border: `1px solid ${T.line}`, borderRadius: 4, color: T.ink,
            }}
          />
        </label>
        <button onClick={applyAllSuggested} title="Sobrescreve os pedidos GU manuais" style={{
          padding: '6px 12px', background: T.ink, color: T.bg, border: 'none',
          borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Sparkles size={12} /> Aplicar sugestões a todos
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: T.inkSoft, display: 'flex', gap: 16 }}>
          <span><strong style={{ color: T.ink }}>{totalDistinct}</strong> EANs · <strong style={{ color: T.accent }}>{totalUnits}</strong> unidades</span>
        </div>
        <button onClick={exportXLSX} disabled={totalUnits === 0} style={{
          padding: '6px 12px', background: totalUnits > 0 ? T.green : T.line,
          color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500,
          cursor: totalUnits > 0 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Download size={12} /> Exportar Pedido (Excel)
        </button>
      </div>

      {/* Per-zone tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {zonesGrouped.map(zone => {
          const zoneTotal = zone.slots.reduce((s, r) => s + (r.current || 0), 0);
          return (
            <div key={zone.zoneId} style={{ border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden', background: T.paper }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: zone.floorColor, color: '#fff',
              }}>
                <strong style={{ fontSize: 13 }}>{zone.zoneName}</strong>
                <span style={{ fontSize: 10, opacity: 0.85, fontFamily: 'Geist Mono, monospace' }}>
                  {zone.floorName} · {zone.slots.length} slots
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 10, opacity: 0.85 }}>target:</label>
                  <input
                    type="number" min="0" max="999"
                    value={zone.target}
                    onChange={e => setZoneTarget(zone.zoneId, e.target.value)}
                    style={{
                      width: 50, padding: '3px 6px', fontSize: 11, fontFamily: 'Geist Mono, monospace',
                      background: 'rgba(255,255,255,0.18)', border: `1px solid rgba(255,255,255,0.3)`,
                      borderRadius: 3, color: '#fff', textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace', fontWeight: 700, marginLeft: 8 }}>
                    pedido total: {zoneTotal}
                  </span>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: T.bgEl }}>
                    <th style={pthStyle}>EAN</th>
                    <th style={pthStyle}>DESCRIÇÃO</th>
                    <th style={{ ...pthStyle, textAlign: 'right', background: T.cyan }}>PO3</th>
                    <th style={{ ...pthStyle, textAlign: 'right', background: T.cyan }}>PO2</th>
                    <th style={{ ...pthStyle, textAlign: 'right' }}>SUGERIDO</th>
                    <th style={{ ...pthStyle, textAlign: 'right', background: T.yellow }}>PEDIDO GU</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.slots.map(r => {
                    const overSuggested = r.current > r.po2;
                    return (
                      <tr key={r.slotId} style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                        <td style={{ ...ptdStyle, fontFamily: 'Geist Mono, monospace', background: T.cyan, fontSize: 10 }}>{r.ean || '—'}</td>
                        <td style={ptdStyle}>
                          <div style={{ fontWeight: 500, fontSize: 11 }}>{r.name || <span style={{ color: T.inkMute, fontStyle: 'italic' }}>—</span>}</div>
                          {r.family && <div style={{ fontSize: 9, color: T.inkMute, fontFamily: 'Geist Mono, monospace' }}>{r.family}</div>}
                        </td>
                        <td style={{ ...ptdStyle, textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontWeight: r.po3 > 0 ? 600 : 400 }}>{r.po3}</td>
                        <td style={{ ...ptdStyle, textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontWeight: r.po2 > 0 ? 600 : 400 }}>{r.po2}</td>
                        <td style={{ ...ptdStyle, textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: r.suggested > 0 ? T.accent : T.inkMute, fontWeight: r.suggested > 0 ? 600 : 400 }}>{r.suggested}</td>
                        <td style={{ ...ptdStyle, textAlign: 'right', background: T.yellow }}>
                          <input
                            type="number" min="0" max="9999"
                            value={r.current}
                            onChange={e => setSlotPedido(r.zoneId, r.slotId, e.target.value)}
                            title={overSuggested ? `Atenção: pedido (${r.current}) > stock PO2 disponível (${r.po2})` : ''}
                            style={{
                              width: 60, padding: '4px 6px', fontSize: 12,
                              fontFamily: 'Geist Mono, monospace', fontWeight: 700,
                              background: overSuggested ? '#FFE4D9' : '#fff',
                              border: `1px solid ${overSuggested ? T.accent : T.line}`,
                              borderRadius: 3, color: T.ink, textAlign: 'right',
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pthStyle = { padding: '8px 10px', fontSize: 10, fontWeight: 600, color: T.inkSoft, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`, textAlign: 'left' };
const ptdStyle = { padding: '8px 10px', fontSize: 11, color: T.ink, verticalAlign: 'middle' };

function OutputPreview({ floors, activeCampaign = null, stockRowsPO2 = [], stockMapPO2 = {}, stockRowsPO3 = [], stockMapPO3 = {} }) {
  // Build stock indexes once for EAN lookup
  const { index: idxPO2 } = useMemo(() => buildStockIndex(stockRowsPO2, stockMapPO2), [stockRowsPO2, stockMapPO2]);
  const { index: idxPO3 } = useMemo(() => buildStockIndex(stockRowsPO3, stockMapPO3), [stockRowsPO3, stockMapPO3]);

  // Build EAN → product info index from the active campaign
  const productIdx = useMemo(() => {
    const map = new Map();
    if (!activeCampaign) return map;
    const cols = detectColumns(activeCampaign.headers || []);
    if (!cols.ean) return map;
    for (const r of (activeCampaign.rows || [])) {
      const key = normalizeEAN(r[cols.ean]);
      if (!key || map.has(key)) continue;
      const basePriceVal = cols.basePrice ? parseNum(r[cols.basePrice]) : 0;
      const campPriceVal = cols.campaignPrice ? parseNum(r[cols.campaignPrice]) : 0;
      const explicitDisc = cols.discount ? parseNum(r[cols.discount]) : 0;
      const calcDisc = (basePriceVal > 0 && campPriceVal > 0 && campPriceVal < basePriceVal)
        ? ((basePriceVal - campPriceVal) / basePriceVal) * 100 : 0;
      map.set(key, {
        name: cols.description ? String(r[cols.description] ?? '').trim() : '',
        family: cols.family ? String(r[cols.family] ?? '').trim() : '',
        subfamily: cols.subfamily ? String(r[cols.subfamily] ?? '').trim() : '',
        basePrice: basePriceVal,
        campaignPrice: campPriceVal,
        discount: explicitDisc >= 0.5 ? explicitDisc : calcDisc,
        startDate: cols.startDate ? r[cols.startDate] : '',
        endDate: cols.endDate ? r[cols.endDate] : '',
      });
    }
    return map;
  }, [activeCampaign]);

  const resolveField = (s, field) => {
    if (s[field] !== '' && s[field] !== undefined && s[field] !== null) return s[field];
    const key = normalizeEAN(s.ref);
    if (!key) return '';
    const info = productIdx.get(key);
    return info ? (info[field] ?? '') : '';
  };

  // Resolve PO2/PO3 for a slot: prefer stored value, fall back to live stock lookup by EAN
  const resolvePO2 = (s) => {
    if (s.stockPO2 !== '' && s.stockPO2 !== undefined && s.stockPO2 !== null) return s.stockPO2;
    const key = normalizeEAN(s.ref);
    return key ? (idxPO2.get(key) ?? '') : '';
  };
  const resolvePO3 = (s) => {
    if (s.stockPO3 !== '' && s.stockPO3 !== undefined && s.stockPO3 !== null) return s.stockPO3;
    const key = normalizeEAN(s.ref);
    return key ? (idxPO3.get(key) ?? '') : '';
  };
  const fmtPrice = (v) => (v && Number(v) > 0) ? `${Number(v).toFixed(2)}€` : '—';
  const fmtDate = (v) => {
    if (!v) return '—';
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div>
      <div className="no-print" style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12,
      }}>
        <button
          onClick={async () => {
            const target = document.querySelector('.print-area');
            if (!target) return;
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
              import('jspdf'), import('html2canvas'),
            ]);
            const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            // A4 landscape: 297 x 210 mm
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pdfW = 297, pdfH = 210;
            const imgW = pdfW - 10; // 5mm margin each side
            const imgH = (canvas.height * imgW) / canvas.width;
            let heightLeft = imgH;
            let y = 5;
            pdf.addImage(imgData, 'PNG', 5, y, imgW, imgH);
            heightLeft -= (pdfH - 10);
            while (heightLeft > 0) {
              y = -((imgH - heightLeft) - 5);
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 5, y, imgW, imgH);
              heightLeft -= (pdfH - 10);
            }
            const stamp = new Date().toISOString().slice(0, 10);
            pdf.save(`destaques_${stamp}.pdf`);
          }}
          style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 500,
            background: 'transparent', color: T.ink, border: `1px solid ${T.line}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <Download size={13} /> Exportar PDF
        </button>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 500,
            background: T.ink, color: T.bg, border: 'none', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <FileText size={13} /> Imprimir
        </button>
      </div>
      <div className="print-area" style={{ background: T.paper, padding: 32, borderRadius: 10, border: `1px solid ${T.line}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 className="display" style={{ fontSize: 32, margin: 0, fontStyle: 'italic', letterSpacing: '0.02em' }}>
            DESTAQUES SEMANAIS
          </h2>
          <div className="mono" style={{ fontSize: 10, color: T.inkMute, letterSpacing: '0.15em', marginTop: 8, textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {floors.map(floor => (
          <div key={floor.id}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
              padding: '8px 0', borderBottom: `2px solid ${floor.color}`,
            }}>
              {floor.star && <Star size={18} fill={floor.color} stroke={floor.color} />}
              <h3 className="display" style={{ fontSize: 24, margin: 0, fontStyle: 'italic' }}>{floor.name}</h3>
            </div>

            {floor.zones.filter(z => z.slots.length > 0).map(zone => (
              <div key={zone.id} style={{ marginBottom: 20 }}>
                <div style={{ background: floor.color, color: '#fff', padding: '6px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
                  {zone.name.toUpperCase()}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: T.lineSoft }}>
                      <th style={{ ...ohStyle, width: 110 }}>REF</th>
                      <th style={ohStyle}>PRODUTO</th>
                      <th style={{ ...ohStyle, width: 100 }}>CARTAZ</th>
                      <th style={{ ...ohStyle, width: 80, textAlign: 'center' }}>ESTADO</th>
                      <th style={{ ...ohStyle, width: 70 }}>DATA</th>
                      <th style={{ ...ohStyle, width: 90 }}>CAMPANHA</th>
                      <th style={ohStyle}>OBS</th>
                      <th style={{ ...ohStyle, width: 50, background: T.cyan, textAlign: 'center' }}>PO2</th>
                      <th style={{ ...ohStyle, width: 50, background: T.cyan, textAlign: 'center' }}>PO3</th>
                      <th style={{ ...ohStyle, width: 50, background: T.yellow, textAlign: 'center' }}>GU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zone.slots.map(s => {
                      const stateOpt = STATES.find(o => o.id === s.state) || STATES[0];
                      const name = resolveField(s, 'name') || '—';
                      const family = resolveField(s, 'family');
                      const subfamily = resolveField(s, 'subfamily');
                      const famDisplay = [family, subfamily].filter(Boolean).join(' › ');
                      const basePrice = Number(resolveField(s, 'basePrice') || 0);
                      const campPrice = Number(resolveField(s, 'campaignPrice') || 0);
                      const explicitDisc = Number(resolveField(s, 'discount') || 0);
                      const calcDisc = (basePrice > 0 && campPrice > 0 && campPrice < basePrice)
                        ? ((basePrice - campPrice) / basePrice) * 100 : 0;
                      const discount = explicitDisc >= 0.5 ? explicitDisc : calcDisc;
                      return (
                        <tr key={s.id}>
                          <td style={{ ...otdStyle, background: T.cyan, fontFamily: 'Geist Mono', fontSize: 10 }}>{s.ref || '—'}</td>
                          <td style={otdStyle}>
                            <div style={{ fontWeight: 500, fontSize: 11, color: T.ink, lineHeight: 1.3 }}>{name}</div>
                            {(famDisplay || campPrice > 0 || discount > 0) && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 9, color: T.inkMute, fontFamily: 'Geist Mono', marginTop: 2, flexWrap: 'wrap' }}>
                                {famDisplay && <span>{famDisplay}</span>}
                                {campPrice > 0 && (
                                  <>
                                    {famDisplay && <span style={{ color: T.line }}>·</span>}
                                    <span style={{ color: T.ink, fontWeight: 600 }}>{Number(campPrice).toFixed(2)}€</span>
                                    {basePrice > 0 && basePrice > campPrice && (
                                      <span style={{ color: T.inkMute, textDecoration: 'line-through' }}>{Number(basePrice).toFixed(2)}€</span>
                                    )}
                                    {discount > 0 && (
                                      <span style={{ color: discount >= 30 ? T.green : T.accent, fontWeight: 700 }}>-{Math.round(discount)}%</span>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ ...otdStyle, fontSize: 10, color: T.inkSoft }}>{s.cartaz || '—'}</td>
                          <td style={{ ...otdStyle, background: stateOpt.bg, color: stateOpt.fg, fontWeight: 600, textAlign: 'center', fontSize: 9, letterSpacing: '0.05em' }}>{stateOpt.label}</td>
                          <td style={otdStyle} className="mono">{s.date || '—'}</td>
                          <td style={{ ...otdStyle, background: s.campaign ? T.blue : 'transparent', color: s.campaign ? '#fff' : T.ink, fontSize: 10 }}>{s.campaign || '—'}</td>
                          <td style={{ ...otdStyle, fontSize: 10, color: T.inkSoft }}>{s.observations || '—'}</td>
                          <td style={{ ...otdStyle, textAlign: 'center' }} className="mono">{resolvePO2(s) !== '' ? resolvePO2(s) : '—'}</td>
                          <td style={{ ...otdStyle, textAlign: 'center' }} className="mono">{resolvePO3(s) !== '' ? resolvePO3(s) : '—'}</td>
                          <td style={{ ...otdStyle, background: T.yellow, textAlign: 'center', fontWeight: 600 }} className="mono">{s.pedidoGU || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {floor.zones.every(z => z.slots.length === 0) && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: T.inkMute, fontStyle: 'italic' }}>
                Nenhum produto atribuído neste piso ainda
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="no-print" style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.inkMute }}>
        <div className="mono" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>David Dinis · Gestão de Campanhas</div>
        <button onClick={() => window.print()} style={{
          padding: '6px 14px', background: T.ink, color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Download size={12} /> Imprimir / Exportar
        </button>
      </div>
      </div>
    </div>
  );
}

const ohStyle = { textAlign: 'left', padding: '6px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: T.inkSoft, textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap' };
const otdStyle = { padding: '6px 10px', borderBottom: `1px solid ${T.lineSoft}`, fontSize: 11, whiteSpace: 'nowrap' };

// ─────────────────────────────────────────────────────────────────────────
// Stock
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Changes View — compares an uploaded snapshot Excel against active campaigns
// Shows: novos, removidos, alterados (preço campanha, base, ou stock)
// ─────────────────────────────────────────────────────────────────────────

// Aggregate all campaign rows within a period into a single compare-with object
function buildPeriodCompareWith(periodId, campaigns, periods, excludedFamilies = []) {
  const camps = (campaigns || []).filter(c => c.periodId === periodId && c.rows?.length);
  if (!camps.length) return null;
  const period = (periods || []).find(p => p.id === periodId);
  const HEADERS = ['EAN', 'Descrição', 'Des_Fam1', 'Des_Fam2', 'PVP Base FNAC', 'PVP Campanha'];
  const byEan = new Map();
  for (const camp of camps) {
    const cols = detectColumns(camp.headers);
    const filteredRows = filterRowsByFamily(camp.rows, camp.headers, excludedFamilies);
    for (const row of filteredRows) {
      const key = normalizeEAN(row[cols.ean]);
      if (!key || byEan.has(key)) continue;
      byEan.set(key, {
        'EAN': row[cols.ean] ?? '',
        'Descrição': cols.description ? (row[cols.description] ?? '') : '',
        'Des_Fam1': cols.family ? (row[cols.family] ?? '') : '',
        'Des_Fam2': cols.subfamily ? (row[cols.subfamily] ?? '') : '',
        'PVP Base FNAC': cols.basePrice ? (row[cols.basePrice] ?? '') : '',
        'PVP Campanha': cols.campaignPrice ? (row[cols.campaignPrice] ?? '') : '',
      });
    }
  }
  return {
    id: `period:${periodId}`,
    name: period?.name || 'Período',
    headers: HEADERS,
    rows: Array.from(byEan.values()),
    itemCount: byEan.size,
    isPeriod: true,
  };
}

function ChangesView({ campaigns, periods, stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, user, excludedFamilies = [] }) {
  // ── "Novo" side (left) ───────────────────────────────────────────────────
  const [newSource, setNewSource] = useStoredState('changes.newSource', 'period'); // 'period'|'campaign'|'upload'
  const [newPeriodId, setNewPeriodId] = useStoredState('changes.newPeriodId', null);
  const [newCampaignId, setNewCampaignId] = useStoredState('changes.newCampaignId', null);
  const [uploadedSnapshot, setUploadedSnapshot] = useState(null); // only for 'upload' source
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  // ── "Antigo" side (right / compare-with) ────────────────────────────────
  const [compareSource, setCompareSource] = useStoredState('changes.compareSource', 'period');
  const [compareWithId, setCompareWithId] = useStoredState('changes.compareWithId', null);
  const [comparePeriodId, setComparePeriodId] = useStoredState('changes.comparePeriodId', null);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filter, setFilter] = useStoredState('changes.filter', 'all');
  const [search, setSearch] = useStoredState('changes.search', '');
  const [filterAveiro, setFilterAveiro] = useStoredState('changes.filterAveiro', false);
  const [filterFamily, setFilterFamily] = useStoredState('changes.filterFamily', '');

  // Load last uploaded snapshot from cloud (only relevant when source='upload')
  useEffect(() => {
    if (!user || !supabase) { setSnapshotLoading(false); return; }
    let cancelled = false;
    cloudLoadPriceSnapshot(user.id).then(saved => {
      if (cancelled) return;
      if (saved) setUploadedSnapshot({ ...saved, fromCloud: true });
      setSnapshotLoading(false);
    }).catch(() => setSnapshotLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  // Auto-pick periods: most recent → new, second most recent → old
  useEffect(() => {
    if (!periods?.length) return;
    const sorted = [...periods].sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1; if (!b.startDate) return -1;
      return new Date(b.startDate) - new Date(a.startDate);
    });
    if (!newPeriodId && sorted[0]) setNewPeriodId(sorted[0].id);
    if (!comparePeriodId && sorted[1]) setComparePeriodId(sorted[1].id);
    else if (!comparePeriodId && sorted[0]) setComparePeriodId(sorted[0].id);
  }, [periods]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (newSource === 'campaign' && !newCampaignId && campaigns.length > 0) setNewCampaignId(campaigns[0].id);
    if (compareSource === 'campaign' && !compareWithId && campaigns.length > 0) setCompareWithId(campaigns[0].id);
  }, [campaigns, newSource, compareSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build snapshot (new/left) ────────────────────────────────────────────
  const snapshot = useMemo(() => {
    if (newSource === 'upload') {
      if (!uploadedSnapshot) return null;
      // Apply excluded families filter to the uploaded snapshot too
      const filtered = filterRowsByFamily(uploadedSnapshot.rows || [], uploadedSnapshot.headers, excludedFamilies);
      return { ...uploadedSnapshot, rows: filtered, itemCount: filtered.length };
    }
    if (newSource === 'campaign') {
      const c = campaigns.find(x => x.id === newCampaignId);
      if (!c) return null;
      const rows = filterRowsByFamily(c.rows || [], c.headers, excludedFamilies);
      return { filename: c.name, uploaded: new Date(), headers: c.headers, rows, itemCount: rows.length, fromSystem: true };
    }
    if (newSource === 'period') {
      const built = buildPeriodCompareWith(newPeriodId, campaigns, periods, excludedFamilies);
      if (!built) return null;
      const p = periods?.find(x => x.id === newPeriodId);
      return { ...built, filename: p?.name || 'Período', uploaded: new Date(), fromSystem: true };
    }
    return null;
  }, [newSource, uploadedSnapshot, newCampaignId, newPeriodId, campaigns, periods, excludedFamilies]);

  // ── Build compareWith (old/right) ────────────────────────────────────────
  const compareWith = useMemo(() => {
    if (compareSource === 'period') return buildPeriodCompareWith(comparePeriodId, campaigns, periods, excludedFamilies);
    const c = campaigns.find(x => x.id === compareWithId);
    if (!c) return null;
    const rows = filterRowsByFamily(c.rows || [], c.headers, excludedFamilies);
    return { ...c, rows, itemCount: rows.length };
  }, [compareSource, comparePeriodId, compareWithId, campaigns, periods, excludedFamilies]);

  const handleFile = async (file) => {
    const buf = await file.arrayBuffer();
    const { headers, rows } = parseExcelSmart(buf, ['EAN', 'Descrição/Título', 'Des_Fam1', 'PVP Base FNAC', 'PVP Campanha']);
    const snap = { filename: file.name, uploaded: new Date(), headers, rows, itemCount: rows.length };
    setUploadedSnapshot(snap);
    if (user && supabase) cloudSavePriceSnapshot(user.id, snap).catch(() => {});
  };

  const handleClear = () => {
    setUploadedSnapshot(null);
    if (newSource === 'upload' && user && supabase) cloudClearPriceSnapshot(user.id).catch(() => {});
  };

  // Build stock indexes for cross-reference
  const stockIndexPO2 = useMemo(() => buildStockIndex(stockRowsPO2 || [], stockMapPO2 || {}), [stockRowsPO2, stockMapPO2]);
  const stockIndexPO3 = useMemo(() => buildStockIndex(stockRowsPO3 || [], stockMapPO3 || {}), [stockRowsPO3, stockMapPO3]);

  // Build the diff — apply family exclusion on both sides before comparing
  const diff = useMemo(() => {
    if (!snapshot || !compareWith) return null;

    const colsOld = detectColumns(compareWith.headers);
    const colsNew = detectColumns(snapshot.headers);

    // Rows are already filtered at source (snapshot/compareWith built with excludedFamilies applied)
    const snapshotRows = snapshot.rows;
    const compareRows = compareWith.rows;

    const lookupStock = (eanKey) => ({
      stockPO2: eanKey ? (stockIndexPO2.index.get(eanKey) ?? 0) : 0,
      stockPO3: eanKey ? (stockIndexPO3.index.get(eanKey) ?? 0) : 0,
    });

    // Index OLD by EAN
    const oldByEan = new Map();
    compareRows.forEach(r => {
      const key = normalizeEAN(r[colsOld.ean]);
      if (key) oldByEan.set(key, r);
    });

    const newByEan = new Map();
    snapshotRows.forEach(r => {
      const key = normalizeEAN(r[colsNew.ean]);
      if (key) newByEan.set(key, r);
    });

    const added = [];
    const removed = [];
    const changed = [];
    const unchanged = [];

    // Walk the new file
    for (const [key, newRow] of newByEan.entries()) {
      const oldRow = oldByEan.get(key);
      const stock = lookupStock(key);
      const newProduct = {
        ean: String(newRow[colsNew.ean] ?? '').trim(),
        family: colsNew.family ? String(newRow[colsNew.family] ?? '').trim() : '',
        description: colsNew.description ? String(newRow[colsNew.description] ?? '').trim() : '',
        basePrice: parseNum(colsNew.basePrice ? newRow[colsNew.basePrice] : 0),
        campaignPrice: parseNum(colsNew.campaignPrice ? newRow[colsNew.campaignPrice] : 0),
        stockPO2: stock.stockPO2,
        stockPO3: stock.stockPO3,
      };

      if (!oldRow) {
        added.push(newProduct);
        continue;
      }

      const oldProduct = {
        basePrice: parseNum(colsOld.basePrice ? oldRow[colsOld.basePrice] : 0),
        campaignPrice: parseNum(colsOld.campaignPrice ? oldRow[colsOld.campaignPrice] : 0),
      };

      const baseChanged = Math.abs(newProduct.basePrice - oldProduct.basePrice) > 0.01;
      const campChanged = Math.abs(newProduct.campaignPrice - oldProduct.campaignPrice) > 0.01;

      if (baseChanged || campChanged) {
        changed.push({
          ...newProduct,
          oldBasePrice: oldProduct.basePrice,
          oldCampaignPrice: oldProduct.campaignPrice,
          baseChanged, campChanged,
        });
      } else {
        unchanged.push(newProduct);
      }
    }

    // Walk old to find removed
    for (const [key, oldRow] of oldByEan.entries()) {
      if (!newByEan.has(key)) {
        const stock = lookupStock(key);
        removed.push({
          ean: String(oldRow[colsOld.ean] ?? '').trim(),
          family: colsOld.family ? String(oldRow[colsOld.family] ?? '').trim() : '',
          description: colsOld.description ? String(oldRow[colsOld.description] ?? '').trim() : '',
          basePrice: parseNum(colsOld.basePrice ? oldRow[colsOld.basePrice] : 0),
          campaignPrice: parseNum(colsOld.campaignPrice ? oldRow[colsOld.campaignPrice] : 0),
          stockPO2: stock.stockPO2,
          stockPO3: stock.stockPO3,
        });
      }
    }

    return { added, removed, changed, unchanged };
  }, [snapshot, compareWith, stockIndexPO2, stockIndexPO3, excludedFamilies]);

  // Items que passam TODOS os filtros excepto o filtro de família.
  // Usado para alimentar os chips com contagens dinâmicas — quando o utilizador
  // selecciona "Aveiro" ou "Novos", os chips reflectem só esse subset.
  const itemsExcludingFamilyFilter = useMemo(() => {
    if (!diff) return [];
    let items = [];
    if (filter === 'all' || filter === 'added') items = items.concat(diff.added);
    if (filter === 'all' || filter === 'changed') items = items.concat(diff.changed);
    if (filter === 'all' || filter === 'removed') items = items.concat(diff.removed);
    if (filter === 'all' || filter === 'unchanged') items = items.concat(diff.unchanged);
    if (filterAveiro) items = items.filter(p => (p.stockPO3 || 0) > 0);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        (p.description || '').toLowerCase().includes(q) ||
        String(p.ean || '').toLowerCase().includes(q) ||
        (p.family || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [diff, filter, filterAveiro, search]);

  const allFamilies = useMemo(() => {
    const counts = new Map();
    for (const p of itemsExcludingFamilyFilter) {
      const fam = p.family || '';
      if (!fam) continue;
      counts.set(fam, (counts.get(fam) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [itemsExcludingFamilyFilter]);

  const totalDiffProducts = itemsExcludingFamilyFilter.length;

  const filteredItems = useMemo(() => {
    if (!diff) return [];
    let items = [];
    if (filter === 'all' || filter === 'added') items = items.concat(diff.added.map(p => ({ ...p, kind: 'added' })));
    if (filter === 'all' || filter === 'changed') items = items.concat(diff.changed.map(p => ({ ...p, kind: 'changed' })));
    if (filter === 'all' || filter === 'removed') items = items.concat(diff.removed.map(p => ({ ...p, kind: 'removed' })));
    if (filter === 'all' || filter === 'unchanged') items = items.concat(diff.unchanged.map(p => ({ ...p, kind: 'unchanged' })));
    if (filterAveiro) items = items.filter(p => (p.stockPO3 || 0) > 0);
    if (filterFamily && filterFamily !== 'all') items = items.filter(p => p.family === filterFamily);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        p.ean.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q)
      );
    }
    return items;
  }, [diff, filter, filterAveiro, filterFamily, search]);

  const exportDiff = () => {
    if (!diff) return;
    const lines = [['Estado', 'EAN', 'Família', 'Descrição', 'PVP Base Antigo', 'PVP Base Novo', 'PVP Campanha Antigo', 'PVP Campanha Novo', 'Stock PO2', 'Stock PO3', 'Stock Total'].join(';')];
    const fmt = (p, kind) => {
      const total = (p.stockPO2 || 0) + (p.stockPO3 || 0);
      if (kind === 'NOVO') return ['NOVO', p.ean, p.family, p.description, '', p.basePrice.toFixed(2), '', p.campaignPrice.toFixed(2), p.stockPO2 || 0, p.stockPO3 || 0, total];
      if (kind === 'ALTERADO') return ['ALTERADO', p.ean, p.family, p.description, p.oldBasePrice.toFixed(2), p.basePrice.toFixed(2), p.oldCampaignPrice.toFixed(2), p.campaignPrice.toFixed(2), p.stockPO2 || 0, p.stockPO3 || 0, total];
      return ['REMOVIDO', p.ean, p.family, p.description, p.basePrice.toFixed(2), '', p.campaignPrice.toFixed(2), '', p.stockPO2 || 0, p.stockPO3 || 0, total];
    };
    diff.added.forEach(p => lines.push(fmt(p, 'NOVO').join(';')));
    diff.changed.forEach(p => lines.push(fmt(p, 'ALTERADO').join(';')));
    diff.removed.forEach(p => lines.push(fmt(p, 'REMOVIDO').join(';')));
    diff.unchanged.forEach(p => {
      const total = (p.stockPO2 || 0) + (p.stockPO3 || 0);
      lines.push(['SEM ALTERAÇÃO', p.ean, p.family, p.description, p.basePrice?.toFixed(2) ?? '', p.basePrice?.toFixed(2) ?? '', p.campaignPrice?.toFixed(2) ?? '', p.campaignPrice?.toFixed(2) ?? '', p.stockPO2 || 0, p.stockPO3 || 0, total].join(';'));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alteracoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper: render a source picker panel (used for both sides)
  const renderSourcePanel = ({ side, source, setSource, periodId, setPeriodId, campaignId, setCampaignId }) => {
    const tabs = side === 'new'
      ? [{ id: 'period', label: 'Período' }, { id: 'campaign', label: 'Campanha' }, { id: 'upload', label: 'Carregar Excel' }]
      : [{ id: 'period', label: 'Período' }, { id: 'campaign', label: 'Campanha' }];

    return (
      <div style={{ flex: '1 1 0', minWidth: 0, padding: '14px 16px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 10 }}>
          {side === 'new' ? 'Dados novos' : 'Comparar com (antigo)'}
        </div>
        {/* Source toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSource(t.id)} style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 5,
              border: `1px solid ${source === t.id ? T.accent : T.line}`,
              background: source === t.id ? T.accentSoft : 'transparent',
              color: source === t.id ? T.accent : T.inkSoft,
              cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {source === 'period' && (
          !periods?.length ? (
            <div style={{ fontSize: 12, color: T.inkMute }}>Nenhum período criado ainda.</div>
          ) : (
            <>
              <select value={periodId || ''} onChange={e => setPeriodId(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, color: T.ink, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 5 }}>
                {periods.map(p => {
                  const cnt = campaigns.filter(c => c.periodId === p.id).reduce((s, c) => s + (c.rows?.length || 0), 0);
                  return <option key={p.id} value={p.id}>{p.name} ({cnt} produtos)</option>;
                })}
              </select>
              {periodId && (() => {
                const camps = campaigns.filter(c => c.periodId === periodId);
                return camps.length > 0 && (
                  <div style={{ marginTop: 5, fontSize: 11, color: T.inkMute }}>
                    {camps.length} {camps.length === 1 ? 'Excel' : 'Excels'}: {camps.map(c => c.name).join(', ')}
                  </div>
                );
              })()}
            </>
          )
        )}

        {source === 'campaign' && (
          campaigns.length === 0 ? (
            <div style={{ fontSize: 12, color: T.inkMute }}>Nenhuma campanha carregada ainda.</div>
          ) : (
            <select value={campaignId || ''} onChange={e => setCampaignId(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: 13, color: T.ink, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 5 }}>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.itemCount ?? c.rows?.length ?? 0} produtos)</option>
              ))}
            </select>
          )
        )}

        {source === 'upload' && (
          uploadedSnapshot ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: T.paper, border: `1px solid ${T.line}`, borderRadius: 6 }}>
              <FileSpreadsheet size={16} style={{ color: T.accent, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedSnapshot.filename}</div>
                <div style={{ fontSize: 11, color: T.inkMute }}>
                  {uploadedSnapshot.itemCount} produtos
                  {uploadedSnapshot.fromCloud && (
                    <span style={{ marginLeft: 5, padding: '1px 4px', fontSize: 9, fontWeight: 600, background: T.accentSoft, color: T.accent, borderRadius: 3 }}>CLOUD</span>
                  )}
                </div>
              </div>
              <button onClick={handleClear} title="Apagar e carregar novo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMute, padding: 2 }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <DropZone
              label="Arrasta o ficheiro da campanha"
              hint=".xlsx / .xls / .csv com EAN, descrição e preços"
              accept=".xlsx,.xls,.csv"
              onFile={handleFile}
              icon={GitCompareArrows}
              compact
            />
          )
        )}
      </div>
    );
  };

  return (
    <div className="fade-up">
      <Header
        eyebrow="Comparação"
        title="Alterações de Preços"
        subtitle="Compara dois períodos, campanhas ou ficheiros Excel para ver o que foi adicionado, removido ou alterado nos preços."
      />

      {snapshotLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
          A carregar último snapshot…
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center', background: T.bgEl,
          border: `1px dashed ${T.line}`, borderRadius: 10,
        }}>
          <GitCompareArrows size={32} strokeWidth={1.25} style={{ color: T.inkMute, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Sem campanhas para comparar</div>
          <div style={{ fontSize: 13, color: T.inkMute }}>
            Carrega primeiro uma campanha em "Campanhas". Depois volta aqui para fazer o cruzamento.
          </div>
        </div>
      ) : (
        <>
          {/* Two-panel pickers — always visible */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
            {renderSourcePanel({
              side: 'new',
              source: newSource,
              setSource: setNewSource,
              periodId: newPeriodId,
              setPeriodId: setNewPeriodId,
              campaignId: newCampaignId,
              setCampaignId: setNewCampaignId,
            })}
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 44, color: T.inkMute }}>
              <ArrowRight size={18} />
            </div>
            {renderSourcePanel({
              side: 'old',
              source: compareSource,
              setSource: setCompareSource,
              periodId: comparePeriodId,
              setPeriodId: setComparePeriodId,
              campaignId: compareWithId,
              setCampaignId: setCompareWithId,
            })}
          </div>

          {/* Diff report — shown as soon as both sides are ready */}
          {!snapshot || !compareWith ? (
            <div style={{
              padding: 32, textAlign: 'center', background: T.bgEl,
              border: `1px dashed ${T.line}`, borderRadius: 8,
              color: T.inkMute, fontSize: 13,
            }}>
              <GitCompareArrows size={24} strokeWidth={1.25} style={{ marginBottom: 10 }} />
              <div>
                {!snapshot && !compareWith
                  ? 'Seleciona os dados de ambos os lados para ver as diferenças.'
                  : !snapshot
                    ? 'Seleciona os dados novos (lado esquerdo).'
                    : 'Seleciona os dados antigos (lado direito).'}
              </div>
            </div>
          ) : (
            <ChangesReport
              snapshot={snapshot}
              compareWith={compareWith}
              diff={diff}
              filter={filter}
              setFilter={setFilter}
              filterAveiro={filterAveiro}
              setFilterAveiro={setFilterAveiro}
              filterFamily={filterFamily}
              setFilterFamily={setFilterFamily}
              allFamilies={allFamilies}
              totalDiffProducts={totalDiffProducts}
              search={search}
              setSearch={setSearch}
              filteredItems={filteredItems}
              onClear={handleClear}
              onExport={exportDiff}
              stockRowsPO3={stockRowsPO3}
            />
          )}
        </>
      )}
    </div>
  );
}

function ChangesReport({ snapshot, compareWith, diff, filter, setFilter, filterAveiro, setFilterAveiro, filterFamily, setFilterFamily, allFamilies, totalDiffProducts = 0, search, setSearch, filteredItems, onClear, onExport, stockRowsPO3 }) {
  if (!diff) return null;
  const totalChanges = diff.added.length + diff.removed.length + diff.changed.length;

  return (
    <div>
      {/* Summary cards — clickable to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Novos" value={diff.added.length} color={T.green} active={filter === 'added'} onClick={() => setFilter(filter === 'added' ? 'all' : 'added')} />
        <SummaryCard label="Alterados" value={diff.changed.length} color={T.orange} active={filter === 'changed'} onClick={() => setFilter(filter === 'changed' ? 'all' : 'changed')} />
        <SummaryCard label="Removidos" value={diff.removed.length} color={T.red} active={filter === 'removed'} onClick={() => setFilter(filter === 'removed' ? 'all' : 'removed')} />
        <SummaryCard label="Sem alterações" value={diff.unchanged.length} color={T.inkMute} active={filter === 'unchanged'} onClick={() => setFilter(filter === 'unchanged' ? 'all' : 'unchanged')} />
      </div>

      {/* Comparison summary bar */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 16, padding: '12px 16px',
        background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8,
        alignItems: 'center', flexWrap: 'wrap', fontSize: 12,
      }}>
        <div style={{ flex: '1 1 auto' }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 3 }}>Dados novos</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{snapshot.filename}</div>
          <div style={{ fontSize: 11, color: T.inkMute }}>
            {snapshot.itemCount} produtos
            {snapshot.fromCloud && (
              <span style={{ marginLeft: 5, padding: '1px 4px', fontSize: 9, fontWeight: 600, background: T.accentSoft, color: T.accent, borderRadius: 3 }}>CLOUD</span>
            )}
            {snapshot.fromSystem && (
              <span style={{ marginLeft: 5, padding: '1px 4px', fontSize: 9, fontWeight: 600, background: '#e8f5e9', color: '#2e7d32', borderRadius: 3 }}>SISTEMA</span>
            )}
          </div>
        </div>
        <ArrowRight size={16} style={{ color: T.inkMute, flexShrink: 0 }} />
        <div style={{ flex: '1 1 auto' }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 3 }}>Comparar com</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{compareWith.name || compareWith.filename || '—'}</div>
          <div style={{ fontSize: 11, color: T.inkMute }}>
            {compareWith.itemCount ?? compareWith.rows?.length ?? 0} produtos
            <span style={{ marginLeft: 5, padding: '1px 4px', fontSize: 9, fontWeight: 600, background: '#e8f5e9', color: '#2e7d32', borderRadius: 3 }}>SISTEMA</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={onExport} disabled={totalChanges === 0} style={{
            padding: '8px 12px', fontSize: 12, fontWeight: 500,
            background: totalChanges === 0 ? T.lineSoft : T.ink,
            color: totalChanges === 0 ? T.inkMute : T.bg,
            border: 'none', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: totalChanges === 0 ? 'not-allowed' : 'pointer',
          }}>
            <Download size={12} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, flex: '1 1 240px', minWidth: 200 }}>
          <Search size={14} style={{ color: T.inkMute }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar EAN, descrição, família…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: T.ink }} />
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6 }}>
          {[
            { id: 'all', l: 'Todos' },
            { id: 'added', l: 'Novos' },
            { id: 'changed', l: 'Alterados' },
            { id: 'removed', l: 'Removidos' },
            { id: 'unchanged', l: 'Sem alterações' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '4px 10px', fontSize: 11, borderRadius: 4, border: 'none',
              background: filter === f.id ? T.ink : 'transparent',
              color: filter === f.id ? T.bg : T.inkSoft,
            }}>{f.l}</button>
          ))}
        </div>
        {/* Stock Aveiro (PO3) filter — só aparece se houver dados de stock */}
        {(stockRowsPO3?.length > 0) && (
          <button
            onClick={() => setFilterAveiro(v => !v)}
            title={filterAveiro ? 'Mostrar todos (incluindo sem stock em Aveiro)' : 'Mostrar só referências com stock na loja de Aveiro (PO3)'}
            style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 500,
              borderRadius: 6, border: `1px solid ${filterAveiro ? T.green : T.line}`,
              background: filterAveiro ? T.green : T.bgEl,
              color: filterAveiro ? '#fff' : T.inkSoft,
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Store size={12} />
            Aveiro
            {filterAveiro && <X size={10} />}
          </button>
        )}
        {/* Family filter is now rendered as chips below this row (see FamilyChips) */}
        {false && (
          <select
            value={filterFamily}
            onChange={e => setFilterFamily(e.target.value)}
            style={{
              padding: '6px 10px', fontSize: 11, borderRadius: 6,
              border: `1px solid ${filterFamily ? T.accent : T.line}`,
              background: filterFamily ? T.accentSoft : T.bgEl,
              color: filterFamily ? T.accent : T.inkSoft,
              cursor: 'pointer',
            }}
          >
            <option value=''>Todas as famílias</option>
            {allFamilies.map(f => <option key={f.name || f} value={f.name || f}>{f.name || f}</option>)}
          </select>
        )}
        <div className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: T.inkMute }}>
          {filteredItems.length} resultados
        </div>
      </div>

      {/* Family chips — visual filter strip with counts */}
      {allFamilies.length > 0 && (
        <FamilyChips
          families={allFamilies}
          selected={filterFamily || 'all'}
          onSelect={(name) => setFilterFamily(name === 'all' ? '' : name)}
          totalProducts={totalDiffProducts}
        />
      )}

      {/* Results table */}
      <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
            Sem resultados para os filtros atuais.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 600 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: T.lineSoft, zIndex: 1 }}>
                <tr>
                  <th style={{ ...lhStyle, width: 100 }}>Estado</th>
                  <th style={{ ...lhStyle, width: 90 }}>Família</th>
                  <th style={{ ...lhStyle, width: 110 }}>EAN</th>
                  <th style={lhStyle}>Descrição / Título</th>
                  <th style={{ ...lhStyle, textAlign: 'right', width: 110 }}>PVP Base</th>
                  <th style={{ ...lhStyle, textAlign: 'right', width: 130 }}>PVP Campanha</th>
                  <th style={{ ...lhStyle, background: T.cyan, textAlign: 'right', width: 50 }}>PO2</th>
                  <th style={{ ...lhStyle, background: T.cyan, textAlign: 'right', width: 50 }}>PO3</th>
                  <th style={{ ...lhStyle, background: T.cyan, textAlign: 'right', width: 56 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.slice(0, 500).map((p, i) => (
                  <ChangeRow key={`${p.kind}-${p.ean}-${i}`} item={p} />
                ))}
              </tbody>
            </table>
            {filteredItems.length > 500 && (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 12, color: T.inkMute, borderTop: `1px solid ${T.line}` }}>
                A mostrar 500 de {filteredItems.length}. Exporta para CSV para ver tudo.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, active, dimmed, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        padding: '18px 20px', textAlign: 'left',
        background: active ? color : T.bgEl,
        color: active ? '#fff' : T.ink,
        border: `1px solid ${active ? color : T.line}`,
        borderRadius: 10, cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.7 : 1,
        transition: 'all 0.12s', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (onClick && !active) e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { if (onClick && !active) e.currentTarget.style.borderColor = T.line; }}
    >
      <div className="mono" style={{
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: active ? '#fff' : T.inkMute, marginBottom: 6, opacity: active ? 0.85 : 1,
      }}>{label}</div>
      <div className="display" style={{ fontSize: 36, lineHeight: 1, color: active ? '#fff' : color, fontStyle: dimmed ? 'normal' : 'italic' }}>
        {value.toLocaleString('pt-PT')}
      </div>
    </button>
  );
}

function ChangeRow({ item }) {
  const kindStyles = {
    added: { bg: T.green, label: 'NOVO', icon: Plus },
    removed: { bg: T.red, label: 'REMOVIDO', icon: Minus },
    changed: { bg: T.orange, label: 'ALTERADO', icon: ArrowRight },
    unchanged: { bg: T.inkMute, label: 'SEM ALTER.', icon: null },
  };
  const k = kindStyles[item.kind] || kindStyles.unchanged;
  const isUnchanged = item.kind === 'unchanged';

  return (
    <tr style={{ borderBottom: `1px solid ${T.lineSoft}`, opacity: isUnchanged ? 0.6 : 1 }}>
      <td style={ltdStyle}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', background: k.bg, color: '#fff',
          fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
          borderRadius: 3, fontFamily: 'Geist Mono',
        }}>
          {k.label}
        </span>
      </td>
      <td style={ltdStyle}>
        {item.family ? (
          <span style={{
            fontSize: 9, padding: '2px 5px', background: T.lineSoft,
            color: T.inkSoft, borderRadius: 3, fontWeight: 500,
            display: 'inline-block', maxWidth: '100%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={item.family}>{item.family}</span>
        ) : <span style={{ color: T.inkMute }}>—</span>}
      </td>
      <td style={{ ...ltdStyle, fontFamily: 'Geist Mono', fontSize: 11, color: T.inkSoft }}>
        {item.ean || '—'}
      </td>
      <td style={{ ...ltdStyle, fontWeight: 500 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }} title={item.description}>
          {item.description || '—'}
        </div>
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right' }}>
        {item.kind === 'changed' ? (
          item.baseChanged ? (
            <PriceDelta oldVal={item.oldBasePrice} newVal={item.basePrice} />
          ) : (
            <span className="mono" style={{ color: T.inkSoft }}>{formatPrice(item.basePrice)}</span>
          )
        ) : (
          <span className="mono" style={{ color: item.kind === 'removed' ? T.inkMute : T.ink, textDecoration: item.kind === 'removed' ? 'line-through' : 'none' }}>
            {formatPrice(item.basePrice)}
          </span>
        )}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right' }}>
        {item.kind === 'changed' ? (
          item.campChanged ? (
            <PriceDelta oldVal={item.oldCampaignPrice} newVal={item.campaignPrice} highlight />
          ) : (
            <span className="mono" style={{ color: T.inkSoft }}>{formatPrice(item.campaignPrice)}</span>
          )
        ) : (
          <span className="mono" style={{ color: item.kind === 'removed' ? T.inkMute : T.ink, textDecoration: item.kind === 'removed' ? 'line-through' : 'none', fontWeight: 500 }}>
            {formatPrice(item.campaignPrice)}
          </span>
        )}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right', fontFamily: 'Geist Mono', fontSize: 11, color: (item.stockPO2 || 0) > 0 ? T.ink : T.inkMute }}>
        {item.stockPO2 ?? 0}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right', fontFamily: 'Geist Mono', fontSize: 11, color: (item.stockPO3 || 0) > 0 ? T.ink : T.inkMute }}>
        {item.stockPO3 ?? 0}
      </td>
      <td style={{ ...ltdStyle, textAlign: 'right', fontFamily: 'Geist Mono', fontSize: 11, fontWeight: 600 }}>
        {(() => {
          const total = (item.stockPO2 || 0) + (item.stockPO3 || 0);
          return <span style={{ color: total > 0 ? T.green : T.red }}>{total}</span>;
        })()}
      </td>
    </tr>
  );
}

function PriceDelta({ oldVal, newVal, highlight }) {
  const diff = newVal - oldVal;
  const up = diff > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }} className="mono">
      <span style={{ color: T.inkMute, textDecoration: 'line-through', fontSize: 11 }}>
        {formatPrice(oldVal)}
      </span>
      <ArrowRight size={10} style={{ color: T.inkMute }} />
      <span style={{
        color: highlight ? (up ? T.red : T.green) : T.ink,
        fontWeight: 600,
        padding: highlight ? '2px 6px' : 0,
        background: highlight ? (up ? '#FEE7E5' : '#E5F4E5') : 'transparent',
        borderRadius: highlight ? 3 : 0,
      }}>
        {formatPrice(newVal)}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stock
// ─────────────────────────────────────────────────────────────────────────
function StockView({
  stockRowsPO2, setStockRowsPO2, stockRowsPO3, setStockRowsPO3,
  stockMetaPO2, stockMetaPO3,
  onUploadStock, onActivateSnapshot,
  user, isAdmin,
  campaigns, stockMapPO2, setStockMapPO2, stockMapPO3, setStockMapPO3,
  excludedFamilies = [],
}) {
  const [historyDialog, setHistoryDialog] = useState(null); // 'PO2' | 'PO3' | null
  const [uploading, setUploading] = useState(null); // 'PO2' | 'PO3'
  const [uploadStatus, setUploadStatus] = useState(null); // { kind, message, store }

  const handleUpload = async (file, store) => {
    if (!file) {
      setUploadStatus({ kind: 'error', message: 'Nenhum ficheiro recebido.', store });
      return;
    }
    console.log('[stock-upload]', store, file.name, file.size, 'bytes');
    setUploading(store);
    setUploadStatus({ kind: 'parsing', message: `A ler "${file.name}"…`, store });

    let rows;
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseExcelSmart(buf, ['EAN', 'Stock', 'Descrição']);
      rows = parsed.rows;
      if (!rows || rows.length === 0) {
        setUploadStatus({ kind: 'error', message: 'O ficheiro de stock parece vazio ou os cabeçalhos não foram reconhecidos.', store });
        setUploading(null);
        return;
      }
      console.log('[stock-upload]', store, 'parsed', rows.length, 'rows');
    } catch (e) {
      console.error('[stock-upload] parse failed', e);
      setUploadStatus({ kind: 'error', message: `Erro ao ler o Excel: ${e?.message || e}. Pode ser uma extensão do browser a interferir.`, store });
      setUploading(null);
      return;
    }

    try {
      if (onUploadStock && user) {
        const res = await onUploadStock(store, file.name, rows);
        if (!res.ok) {
          setUploadStatus({ kind: 'error', message: `Erro ao guardar na cloud: ${res.error || 'sem detalhe'}. O stock fica disponível localmente neste dispositivo.`, store });
          if (store === 'PO2') { setStockRowsPO2(rows); setStockMapPO2({}); }
          else { setStockRowsPO3(rows); setStockMapPO3({}); }
        } else {
          if (store === 'PO2') setStockMapPO2({});
          else setStockMapPO3({});
          setUploadStatus({ kind: 'success', message: `Stock ${store} guardado — ${rows.length} referências.`, store });
          setTimeout(() => setUploadStatus(s => s?.store === store && s?.kind === 'success' ? null : s), 4000);
        }
      } else {
        // No cloud — just local
        if (store === 'PO2') { setStockRowsPO2(rows); setStockMapPO2({}); }
        else { setStockRowsPO3(rows); setStockMapPO3({}); }
        setUploadStatus({ kind: 'success', message: `Stock ${store} carregado localmente — ${rows.length} referências (sem cloud).`, store });
        setTimeout(() => setUploadStatus(s => s?.store === store && s?.kind === 'success' ? null : s), 4000);
      }
    } catch (e) {
      console.error('[stock-upload] cloud save failed', e);
      setUploadStatus({ kind: 'error', message: `Erro inesperado: ${e?.message || e}`, store });
      // Still keep local data
      if (store === 'PO2') { setStockRowsPO2(rows); setStockMapPO2({}); }
      else { setStockRowsPO3(rows); setStockMapPO3({}); }
    } finally {
      setUploading(null);
    }
  };

  const totalCampaign = campaigns.reduce((s, c) => s + (c.rows?.length || 0), 0);

  // Build EAN → { family, subfamily } lookup from all campaigns (excluding filtered families)
  const eanFamilyMap = useMemo(() => {
    const map = new Map();
    const excl = new Set((excludedFamilies || []).map(f => f.toUpperCase()));
    for (const camp of campaigns) {
      const cols = detectColumns(camp.headers || []);
      if (!cols.ean) continue;
      for (const row of (camp.rows || [])) {
        const key = normalizeEAN(row[cols.ean]);
        if (!key || map.has(key)) continue;
        const fam = cols.family ? String(row[cols.family] ?? '').trim() : '';
        if (excl.has(fam.toUpperCase())) continue; // skip excluded
        map.set(key, {
          family: fam,
          subfamily: cols.subfamily ? String(row[cols.subfamily] ?? '').trim() : '',
        });
      }
    }
    return map;
  }, [campaigns, excludedFamilies]);

  // Build stock by family/subfamily breakdown
  const familyBreakdown = useMemo(() => {
    if (!stockRowsPO2.length && !stockRowsPO3.length) return [];
    const { index: idxPO2 } = buildStockIndex(stockRowsPO2, stockMapPO2);
    const { index: idxPO3 } = buildStockIndex(stockRowsPO3, stockMapPO3);
    const allEans = new Set([...idxPO2.keys(), ...idxPO3.keys()]);

    // Group: family → subfamily → { po2, po3, count }
    const grouped = new Map();
    for (const ean of allEans) {
      const info = eanFamilyMap.get(ean) || { family: '(sem família)', subfamily: '' };
      const fam = info.family || '(sem família)';
      const sub = info.subfamily || '—';
      const po2 = idxPO2.get(ean) || 0;
      const po3 = idxPO3.get(ean) || 0;

      if (!grouped.has(fam)) grouped.set(fam, new Map());
      const subMap = grouped.get(fam);
      if (!subMap.has(sub)) subMap.set(sub, { po2: 0, po3: 0, refs: 0 });
      const entry = subMap.get(sub);
      entry.po2 += po2;
      entry.po3 += po3;
      entry.refs += 1;
    }

    // Convert to sorted array
    return Array.from(grouped.entries())
      .map(([family, subMap]) => {
        const subs = Array.from(subMap.entries())
          .map(([subfamily, v]) => ({ subfamily, ...v }))
          .sort((a, b) => a.subfamily.localeCompare(b.subfamily));
        const totPO2 = subs.reduce((s, x) => s + x.po2, 0);
        const totPO3 = subs.reduce((s, x) => s + x.po3, 0);
        const totRefs = subs.reduce((s, x) => s + x.refs, 0);
        return { family, subs, totPO2, totPO3, totRefs };
      })
      .sort((a, b) => a.family.localeCompare(b.family));
  }, [stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, eanFamilyMap]);

  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const toggleFamily = (fam) => setExpandedFamilies(prev => {
    const next = new Set(prev);
    next.has(fam) ? next.delete(fam) : next.add(fam);
    return next;
  });

  return (
    <div className="fade-up">
      <Header eyebrow="Inventário" title="Stock" subtitle="Carrega os dois ficheiros — armazém (PO2) e ponto de loja (PO3). Os ficheiros são partilhados com toda a equipa: ao carregar um novo, todos os colegas passam a ter o stock atualizado. Mantém-se um histórico dos últimos 5 uploads por loja." />
      {uploadStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: uploadStatus.kind === 'error' ? '#b91c1c'
                    : uploadStatus.kind === 'success' ? T.green
                    : T.bgEl,
          color: uploadStatus.kind === 'error' || uploadStatus.kind === 'success' ? '#fff' : T.ink,
          border: uploadStatus.kind === 'parsing' ? `1px solid ${T.line}` : 'none',
          padding: '10px 14px', marginBottom: 16, borderRadius: 6, fontSize: 13,
        }}>
          {uploadStatus.kind === 'parsing' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, animation: 'pulse 1s infinite' }} />}
          {uploadStatus.kind === 'success' && <Check size={15} />}
          {uploadStatus.kind === 'error' && <AlertTriangle size={15} />}
          <span style={{ flex: 1 }}><strong>{uploadStatus.store}:</strong> {uploadStatus.message}</span>
          {(uploadStatus.kind === 'error' || uploadStatus.kind === 'success') && (
            <button onClick={() => setUploadStatus(null)} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
            }}>Dispensar</button>
          )}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <StockPanel
          icon={Warehouse} eyebrow="PO2 — Armazém"
          rows={stockRowsPO2} mapping={stockMapPO2}
          meta={stockMetaPO2} uploading={uploading === 'PO2'}
          onUpload={f => handleUpload(f, 'PO2')}
          onSetMapping={setStockMapPO2}
          onShowHistory={() => setHistoryDialog('PO2')}
        />
        <StockPanel
          icon={Store} eyebrow="PO3 — Ponto Loja"
          rows={stockRowsPO3} mapping={stockMapPO3}
          meta={stockMetaPO3} uploading={uploading === 'PO3'}
          onUpload={f => handleUpload(f, 'PO3')}
          onSetMapping={setStockMapPO3}
          onShowHistory={() => setHistoryDialog('PO3')}
        />
      </div>
      {(stockRowsPO2.length > 0 || stockRowsPO3.length > 0) && (
        <div style={{ padding: 32, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 16 }}>
            Cruzamento
          </div>
          <h3 className="display" style={{ fontSize: 26, fontStyle: 'italic', margin: '0 0 24px' }}>Cobertura vs. campanha</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            <CrossStat label="Itens em campanha" value={totalCampaign} />
            <CrossStat label="Disponíveis em armazém" value={stockRowsPO2.length} accent />
            <CrossStat label="Disponíveis em loja" value={stockRowsPO3.length} />
          </div>
          {totalCampaign > 0 && (
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 10 }}>Cobertura combinada</div>
              <div style={{ height: 6, background: T.line, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, ((stockRowsPO2.length + stockRowsPO3.length) / totalCampaign) * 100)}%`, background: T.accent, transition: 'width 0.6s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock por família / sub-família */}
      {familyBreakdown.length > 0 && (
        <div style={{ marginTop: 24, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.line}` }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 4 }}>
              Departamentos
            </div>
            <h3 className="display" style={{ fontSize: 22, fontStyle: 'italic', margin: 0 }}>Stock por família</h3>
          </div>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px', gap: 0, padding: '8px 24px', borderBottom: `1px solid ${T.line}`, background: T.bg }}>
            {['Família / Sub-família', 'Refs.', 'PO2', 'PO3', 'Total'].map((h, i) => (
              <div key={h} className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.inkMute, textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {familyBreakdown.map(({ family, subs, totPO2, totPO3, totRefs }) => {
            const isExpanded = expandedFamilies.has(family);
            const hasSubs = subs.length > 1 || (subs.length === 1 && subs[0].subfamily !== '—');
            return (
              <React.Fragment key={family}>
                {/* Family row */}
                <div
                  onClick={() => hasSubs && toggleFamily(family)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px',
                    padding: '10px 24px', borderBottom: `1px solid ${T.lineSoft}`,
                    cursor: hasSubs ? 'pointer' : 'default',
                    background: isExpanded ? T.accentSoft : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: T.ink }}>
                    {hasSubs && (
                      <span style={{ color: T.accent, fontSize: 10, transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                    )}
                    {family}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: T.inkSoft }}>{totRefs}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: totPO2 > 0 ? T.blue : T.inkMute }}>{totPO2.toLocaleString('pt-PT')}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: totPO3 > 0 ? T.green : T.inkMute }}>{totPO3.toLocaleString('pt-PT')}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: T.ink }}>{(totPO2 + totPO3).toLocaleString('pt-PT')}</div>
                </div>
                {/* Sub-family rows */}
                {isExpanded && subs.map(({ subfamily, po2, po3, refs }) => (
                  <div key={subfamily} style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px',
                    padding: '7px 24px 7px 44px', borderBottom: `1px solid ${T.lineSoft}`,
                    background: T.cellAlt,
                  }}>
                    <div style={{ fontSize: 12, color: T.inkSoft }}>{subfamily}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: T.inkMute }}>{refs}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: po2 > 0 ? T.blue : T.inkMute }}>{po2.toLocaleString('pt-PT')}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: po3 > 0 ? T.green : T.inkMute }}>{po3.toLocaleString('pt-PT')}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: T.inkSoft }}>{(po2 + po3).toLocaleString('pt-PT')}</div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
          {/* Grand total */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px', padding: '10px 24px', background: T.bg, borderTop: `2px solid ${T.line}` }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: T.inkMute, textTransform: 'uppercase' }}>Total geral</div>
            <div style={{ textAlign: 'right', fontSize: 13, color: T.inkSoft }}>{familyBreakdown.reduce((s, f) => s + f.totRefs, 0)}</div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: T.blue }}>{familyBreakdown.reduce((s, f) => s + f.totPO2, 0).toLocaleString('pt-PT')}</div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: T.green }}>{familyBreakdown.reduce((s, f) => s + f.totPO3, 0).toLocaleString('pt-PT')}</div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: T.ink }}>{familyBreakdown.reduce((s, f) => s + f.totPO2 + f.totPO3, 0).toLocaleString('pt-PT')}</div>
          </div>
        </div>
      )}

      {historyDialog && (
        <StockHistoryDialog
          store={historyDialog}
          onClose={() => setHistoryDialog(null)}
          onActivate={async (id) => {
            if (!confirm('Tornar este snapshot ativo? O stock atual será substituído por todos os utilizadores.')) return;
            const res = await onActivateSnapshot(id, historyDialog);
            if (res.ok) setHistoryDialog(null);
            else alert('Erro: ' + res.error);
          }}
        />
      )}
    </div>
  );
}

// ─── Dialog: histórico dos últimos uploads de stock por loja
function StockHistoryDialog({ store, onClose, onActivate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    cloudFetchStockHistory(store).then(data => {
      if (!cancelled) { setItems(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [store]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 24,
        width: 'min(560px, 92vw)', maxHeight: '70vh', overflowY: 'auto',
        border: `1px solid ${T.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
              Histórico
            </div>
            <h3 className="display" style={{ fontSize: 22, margin: 0, fontStyle: 'italic' }}>
              Stock {store} — últimos uploads
            </h3>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 4 }}>
              Mantemos os últimos 5 snapshots. Podes voltar a um anterior se for preciso.
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: 'transparent', color: T.inkMute, border: 'none' }}>
            <X size={16} />
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 12 }}>A carregar…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 12 }}>Sem uploads anteriores.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(it => {
              const ts = it.uploaded_at ? new Date(it.uploaded_at) : null;
              const tsLabel = ts ? ts.toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '?';
              return (
                <div key={it.id} style={{
                  padding: 12, background: it.is_active ? T.accentSoft : T.bgEl,
                  border: `1px solid ${it.is_active ? T.accent : T.line}`,
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, marginBottom: 2 }}>
                      {it.filename || '(sem nome)'}
                      {it.is_active && (
                        <span style={{ marginLeft: 8, fontSize: 9, padding: '1px 6px', background: T.accent, color: '#fff', borderRadius: 3, fontFamily: 'Geist Mono', letterSpacing: '0.08em', fontWeight: 600 }}>ATIVO</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.inkSoft }}>
                      {tsLabel} · {it.row_count || 0} linhas
                      {it.uploaded_by_email && ` · ${it.uploaded_by_email}`}
                    </div>
                  </div>
                  {!it.is_active && (
                    <button onClick={() => onActivate(it.id)} style={{
                      padding: '6px 12px', background: T.ink, color: T.bg,
                      border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Tornar ativo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StockPanel({ icon: Icon, eyebrow, rows, mapping, meta, uploading, onUpload, onSetMapping, onShowHistory }) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const auto = useMemo(() => detectStockColumns(rows), [rows]);
  const eanCol = mapping?.eanCol || auto.eanCol;
  const stockCol = mapping?.stockCol || auto.stockCol;

  const uploadedAt = meta?.uploaded_at ? new Date(meta.uploaded_at) : null;
  const uploadedLabel = uploadedAt
    ? uploadedAt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' ' + uploadedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{ padding: 24, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Icon size={18} strokeWidth={1.5} style={{ color: T.accent }} />
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase' }}>{eyebrow}</div>
        {onShowHistory && (
          <button onClick={onShowHistory} title="Ver histórico" style={{
            marginLeft: 'auto', padding: '4px 10px', fontSize: 10,
            background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 4,
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            <Clock size={10} /> Histórico
          </button>
        )}
      </div>

      {/* Metadata of active snapshot — shown above the panel content */}
      {meta && (
        <div style={{
          padding: '8px 10px', marginBottom: 14, fontSize: 11,
          background: T.bg, border: `1px solid ${T.lineSoft}`, borderRadius: 5,
          color: T.inkSoft, lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.ink, fontWeight: 500 }}>
            <FileSpreadsheet size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.filename || '(ficheiro sem nome)'}</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 10 }}>
            {uploadedLabel} {meta.uploaded_by_email && <>· por {meta.uploaded_by_email}</>}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <DropZone
          label={uploading ? 'A enviar para a cloud…' : 'Carregar ficheiro'}
          hint=".xlsx, .xls, .csv · partilhado com a equipa"
          accept=".xlsx,.xls,.csv"
          onFile={onUpload} compact
        />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <div className="display" style={{ fontSize: 48, lineHeight: 1 }}>{rows.length.toLocaleString('pt-PT')}</div>
            <div style={{ fontSize: 13, color: T.inkSoft }}>referências</div>
            <button onClick={() => { onSetMapping({}); }} style={{
              marginLeft: 'auto', padding: '4px 10px', fontSize: 11,
              background: 'transparent', color: T.inkSoft,
              border: `1px solid ${T.line}`, borderRadius: 4,
            }}>auto-detetar</button>
          </div>

          {/* Replace button */}
          <div style={{ marginBottom: 14 }}>
            <DropZone
              label={uploading ? 'A enviar para a cloud…' : 'Substituir ficheiro'}
              hint="o anterior fica no histórico"
              accept=".xlsx,.xls,.csv"
              onFile={onUpload} compact
            />
          </div>

          {/* Column mapping */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: eanCol ? T.green : T.red }} />
                <span style={{ fontSize: 11, color: T.inkSoft, fontWeight: 500 }}>Coluna EAN</span>
              </div>
              <select
                value={eanCol || ''}
                onChange={e => onSetMapping({ ...mapping, eanCol: e.target.value || undefined })}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 12,
                  border: `1px solid ${T.line}`, borderRadius: 4, background: T.paper,
                }}
              >
                <option value="">— escolher</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: stockCol ? T.green : T.red }} />
                <span style={{ fontSize: 11, color: T.inkSoft, fontWeight: 500 }}>Coluna Stock Aveiro</span>
              </div>
              <select
                value={stockCol || ''}
                onChange={e => onSetMapping({ ...mapping, stockCol: e.target.value || undefined })}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 12,
                  border: `1px solid ${T.line}`, borderRadius: 4, background: T.paper,
                }}
              >
                <option value="">— escolher</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {(!eanCol || !stockCol) && (
              <div style={{ fontSize: 11, color: T.accent, lineHeight: 1.5, padding: 8, background: T.accentSoft, borderRadius: 4 }}>
                ⚠ Sem estas colunas mapeadas, o cruzamento PO2/PO3 com a campanha não funciona.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CrossStat({ label, value, accent }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div className="display" style={{ fontSize: 40, lineHeight: 1, color: accent ? T.accent : T.ink }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Image Editor
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// FlyerEditor — structured editor for FNAC-style promotional flyers
// Formats: A3, A4, A5 (vertical & horizontal), 18×6 cm (régua), 9×8 cm (etiqueta)
// Image modes: side / background / none
// Auto-imports product info from active campaigns
// Exports: PNG (300dpi rasterized) + PDF (single page wrapping the PNG)
// ─────────────────────────────────────────────────────────────────────────

// Format catalogue — sizes in mm, rendered at 300dpi for export quality
const FLYER_FORMATS = [
  { id: 'a3v', label: 'A3 Vertical', code: 'A3', wmm: 297, hmm: 420 },
  { id: 'a3h', label: 'A3 Horizontal', code: 'A3 H', wmm: 420, hmm: 297 },
  { id: 'a4v', label: 'A4 Vertical', code: 'A4', wmm: 210, hmm: 297 },
  { id: 'a4h', label: 'A4 Horizontal', code: 'A4 H', wmm: 297, hmm: 210 },
  { id: 'a5v', label: 'A5 Vertical', code: 'A5', wmm: 148, hmm: 210 },
  { id: 'reg18x6', label: 'Régua 18×6', code: '18×6', wmm: 180, hmm: 60 },
  { id: 'eti9x8', label: 'Etiqueta 9×8', code: '9×8', wmm: 90, hmm: 80 },
];

// FNAC brand palette
const FLYER_PALETTES = [
  { id: 'fnac-red', label: 'Vermelho FNAC', bg: '#E1251B', fg: '#FFFFFF', accent: '#FFCB05' },
  { id: 'fnac-yellow', label: 'Amarelo FNAC', bg: '#FFCB05', fg: '#1A1A1A', accent: '#E1251B' },
  { id: 'fnac-black', label: 'Preto', bg: '#1A1A1A', fg: '#FFFFFF', accent: '#FFCB05' },
  { id: 'fnac-white', label: 'Branco', bg: '#FFFFFF', fg: '#1A1A1A', accent: '#E1251B' },
];

// Drag/resize-able element ids in the flyer
const FLYER_ELEMENTS = [
  { id: 'title', label: 'Título' },
  { id: 'specs', label: 'Specs' },
  { id: 'pvpBase', label: 'PVP riscado' },
  { id: 'discount', label: 'Badge desconto' },
  { id: 'price', label: 'Preço' },
  { id: 'accumulate', label: 'Acumula cartão' },
  { id: 'logo', label: 'Logo FNAC' },
  { id: 'footnote', label: 'Rodapé legal' },
];

// Default content for a fresh flyer
function defaultFlyerData() {
  return {
    title: 'PORTÁTIL ASUS\nVivoBook 17',
    specs: '17,3" | INTEL® CORE™ 7 150U | 16GB | 1TB SSD',
    pvpBaseLabel: 'PVP RECOMENDADO*',
    pvpBase: '999,99€',
    discountText: '-30%',
    discountSub: 'Sobre PVP Recomendado',
    priceMain: '699',
    priceCents: ',98€',
    accumulateLabel: 'ACUMULA AINDA',
    accumulateValue: '6,99€',
    accumulateSub: 'EM CARTÃO FNAC',
    footnote: '*PVP Recomendado é o preço sugerido pelo fornecedor/marca.',
    showLogo: true,
    showAccumulate: true,
    showDiscount: true,
  };
}

function FlyerEditor({ campaigns = [] }) {
  const [format, setFormat] = useState(FLYER_FORMATS[0]);
  const [palette, setPalette] = useState(FLYER_PALETTES[0]);
  const [imageMode, setImageMode] = useState('none'); // 'none' | 'side' | 'background'
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageOpacity, setImageOpacity] = useState(0.35);
  const [data, setData] = useState(defaultFlyerData());
  const [showImport, setShowImport] = useState(false);
  const [busy, setBusy] = useState(null); // 'png' | 'pdf' | null
  // Per-element layout overrides: { [id]: { dx, dy, scale } } — dx/dy in mm, scale 0.4..2.5
  const [layoutOverrides, setLayoutOverrides] = useState({});
  const [selectedEl, setSelectedEl] = useState(null); // selected element id for editing
  const svgRef = useRef();
  const fileInputRef = useRef();

  const setOverride = (id, patch) => setLayoutOverrides(prev => ({
    ...prev,
    [id]: { dx: 0, dy: 0, scale: 1, ...(prev[id] || {}), ...patch },
  }));
  const resetElement = (id) => setLayoutOverrides(prev => {
    const next = { ...prev }; delete next[id]; return next;
  });
  const resetAllLayout = () => setLayoutOverrides({});

  // Keyboard shortcut Esc closes import dialog
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowImport(false); };
    if (showImport) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showImport]);

  const update = (patch) => setData(d => ({ ...d, ...patch }));

  // Image upload
  const handleImage = (file) => {
    const r = new FileReader();
    r.onload = e => setImageDataUrl(e.target.result);
    r.readAsDataURL(file);
  };

  // Import product from campaign
  const importFromProduct = (product) => {
    const formatPriceParts = (val) => {
      const n = parseNum(val);
      if (n <= 0) return { main: '', cents: '€' };
      const fixed = n.toFixed(2).replace('.', ',');
      const [intPart, decPart] = fixed.split(',');
      return { main: intPart, cents: ',' + decPart + '€' };
    };
    const base = parseNum(product.basePrice);
    const camp = parseNum(product.campaignPrice);
    const disc = product.discount > 0
      ? `-${Math.round(product.discount)}%`
      : (base > 0 && camp > 0 && camp < base ? `-${Math.round((base - camp) / base * 100)}%` : '');
    const priceParts = formatPriceParts(camp || base);

    update({
      title: (product.description || '').toUpperCase(),
      specs: product.family || '',
      pvpBase: base > 0 ? base.toFixed(2).replace('.', ',') + '€' : '',
      priceMain: priceParts.main,
      priceCents: priceParts.cents,
      discountText: disc,
    });
    setShowImport(false);
  };

  // Build candidate products from all campaigns for import
  const allProducts = useMemo(() => {
    const out = [];
    campaigns.forEach(c => {
      if (!c.rows?.length) return;
      const cols = detectColumns(c.headers || []);
      c.rows.slice(0, 1000).forEach((r, i) => {
        const ean = String(r[cols.ean] ?? '').trim();
        if (!ean) return;
        const basePriceVal = parseNum(cols.basePrice ? r[cols.basePrice] : 0);
        const campPriceVal = parseNum(cols.campaignPrice ? r[cols.campaignPrice] : 0);
        const expDisc = parseNum(cols.discount ? r[cols.discount] : 0);
        const calcDisc = (basePriceVal > 0 && campPriceVal > 0 && campPriceVal < basePriceVal)
          ? ((basePriceVal - campPriceVal) / basePriceVal) * 100 : 0;
        out.push({
          id: `${c.id}-${i}`,
          campaignName: c.name,
          ean,
          family: cols.family ? String(r[cols.family] ?? '').trim() : '',
          description: cols.description ? String(r[cols.description] ?? '').trim() : '',
          basePrice: basePriceVal,
          campaignPrice: campPriceVal,
          discount: expDisc >= 0.5 ? expDisc : calcDisc,
        });
      });
    });
    return out;
  }, [campaigns]);

  // Render preview SVG and export
  const exportPNG = async () => {
    if (!svgRef.current) return;
    setBusy('png');
    try {
      const blob = await renderSVGToBlob(svgRef.current, format, 'png');
      downloadBlob(blob, `flyer-${format.code}-${Date.now()}.png`);
    } catch (e) {
      alert('Erro ao exportar PNG: ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  const exportPDF = async () => {
    if (!svgRef.current) return;
    setBusy('pdf');
    try {
      const pngBlob = await renderSVGToBlob(svgRef.current, format, 'png');
      const pdfBlob = await pngToPdf(pngBlob, format);
      downloadBlob(pdfBlob, `flyer-${format.code}-${Date.now()}.pdf`);
    } catch (e) {
      alert('Erro ao exportar PDF: ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  // Live preview dimensions — fit container while preserving aspect ratio
  const previewMaxWidth = 600;
  const previewMaxHeight = 700;
  const ratio = format.wmm / format.hmm;
  let pvW, pvH;
  if (previewMaxWidth / ratio <= previewMaxHeight) {
    pvW = previewMaxWidth; pvH = previewMaxWidth / ratio;
  } else {
    pvH = previewMaxHeight; pvW = previewMaxHeight * ratio;
  }

  return (
    <div className="fade-up">
      <Header
        eyebrow="Folhetos"
        title="Editor de folhetos"
        subtitle="Cria folhetos promocionais nos formatos da loja. Edita os textos, importa produtos da campanha, e exporta para PNG ou PDF pronto a imprimir."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportPNG} disabled={busy} style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500,
              background: T.bgEl, color: T.ink,
              border: `1px solid ${T.line}`, borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 6, cursor: busy ? 'wait' : 'pointer',
            }}>
              <Download size={14} /> {busy === 'png' ? 'A gerar…' : 'PNG'}
            </button>
            <button onClick={exportPDF} disabled={busy} style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500,
              background: T.ink, color: T.bg, border: 'none', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 6, cursor: busy ? 'wait' : 'pointer',
            }}>
              <Download size={14} /> {busy === 'pdf' ? 'A gerar…' : 'PDF'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Preview */}
        <div style={{
          padding: 24, background: T.bgEl, border: `1px solid ${T.line}`,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 600,
        }}>
          <FlyerSVG
            svgRef={svgRef}
            format={format}
            palette={palette}
            data={data}
            imageMode={imageMode}
            imageDataUrl={imageDataUrl}
            imageOpacity={imageOpacity}
            displayWidth={pvW}
            displayHeight={pvH}
            layoutOverrides={layoutOverrides}
            selectedEl={selectedEl}
            onSelectEl={setSelectedEl}
            onDragEl={(id, dxMm, dyMm) => setOverride(id, { dx: dxMm, dy: dyMm })}
          />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 }}>
          <Section title="Formato">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {FLYER_FORMATS.map(f => (
                <button key={f.id} onClick={() => setFormat(f)} style={{
                  padding: '8px 10px', textAlign: 'left',
                  background: format.id === f.id ? T.ink : T.bgEl,
                  color: format.id === f.id ? T.bg : T.ink,
                  border: `1px solid ${format.id === f.id ? T.ink : T.line}`,
                  borderRadius: 6, fontSize: 11,
                }}>
                  <div className="mono" style={{ fontSize: 9, opacity: 0.6 }}>{f.code}</div>
                  {f.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Cor">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {FLYER_PALETTES.map(p => (
                <button key={p.id} onClick={() => setPalette(p)} title={p.label} style={{
                  padding: 0, height: 38,
                  background: p.bg, color: p.fg,
                  border: `2px solid ${palette.id === p.id ? T.ink : T.line}`,
                  borderRadius: 6, fontSize: 10, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  Aa
                </button>
              ))}
            </div>
          </Section>

          {campaigns.length > 0 && (
            <button onClick={() => setShowImport(true)} style={{
              padding: '10px 12px', fontSize: 12, fontWeight: 500,
              background: T.accentSoft, color: T.ink,
              border: `1px solid ${T.accent}`, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Sparkles size={12} /> Importar produto da campanha
            </button>
          )}

          <Section title="Imagem do produto">
            <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, marginBottom: 8 }}>
              {[
                { id: 'none', l: 'Sem' },
                { id: 'side', l: 'Lateral' },
                { id: 'background', l: 'Fundo' },
              ].map(m => (
                <button key={m.id} onClick={() => setImageMode(m.id)} style={{
                  flex: 1, padding: '6px 8px', fontSize: 11, borderRadius: 4, border: 'none',
                  background: imageMode === m.id ? T.ink : 'transparent',
                  color: imageMode === m.id ? T.bg : T.inkSoft,
                }}>{m.l}</button>
              ))}
            </div>
            {imageMode !== 'none' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file" accept="image/*" hidden
                  onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])}
                />
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', padding: '8px 10px', fontSize: 11,
                  background: T.bgEl, color: T.ink,
                  border: `1px dashed ${T.line}`, borderRadius: 4,
                }}>
                  {imageDataUrl ? 'Trocar imagem' : 'Carregar imagem'}
                </button>
                {imageDataUrl && (
                  <>
                    <button onClick={() => setImageDataUrl(null)} style={{
                      width: '100%', marginTop: 4, padding: '4px 10px', fontSize: 10,
                      background: 'transparent', color: T.inkMute,
                      border: 'none', textAlign: 'center',
                    }}>remover imagem</button>
                    {imageMode === 'background' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4 }}>
                          Opacidade: {Math.round(imageOpacity * 100)}%
                        </div>
                        <input
                          type="range" min="0.1" max="1" step="0.05"
                          value={imageOpacity}
                          onChange={e => setImageOpacity(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: T.accent }}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </Section>

          <Section title={`Layout — ${selectedEl ? FLYER_ELEMENTS.find(e => e.id === selectedEl)?.label || selectedEl : 'clica num elemento'}`}>
            {selectedEl ? (() => {
              const o = layoutOverrides[selectedEl] || { dx: 0, dy: 0, scale: 1 };
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    <FlyerField label="X (mm)" small value={String(o.dx)} onChange={v => setOverride(selectedEl, { dx: parseFloat(v) || 0 })} />
                    <FlyerField label="Y (mm)" small value={String(o.dy)} onChange={v => setOverride(selectedEl, { dy: parseFloat(v) || 0 })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: T.inkMute, marginBottom: 3, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Geist Mono' }}>
                      Tamanho: {Math.round(o.scale * 100)}%
                    </div>
                    <input
                      type="range" min="0.4" max="2.5" step="0.05"
                      value={o.scale}
                      onChange={e => setOverride(selectedEl, { scale: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: T.accent }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => resetElement(selectedEl)} style={{
                      flex: 1, padding: '6px 10px', fontSize: 11,
                      background: 'transparent', color: T.accent,
                      border: `1px solid ${T.accent}40`, borderRadius: 4, cursor: 'pointer',
                    }}>Repor este</button>
                    <button onClick={() => setSelectedEl(null)} style={{
                      flex: 1, padding: '6px 10px', fontSize: 11,
                      background: 'transparent', color: T.inkSoft,
                      border: `1px solid ${T.line}`, borderRadius: 4, cursor: 'pointer',
                    }}>Desselecionar</button>
                  </div>
                </>
              );
            })() : (
              <div style={{ fontSize: 11, color: T.inkMute, lineHeight: 1.5 }}>
                Clica num elemento do preview para o seleccionar. Depois podes arrastar com o rato ou ajustar X/Y/tamanho aqui.
                <button onClick={resetAllLayout} style={{
                  marginTop: 8, padding: '5px 10px', fontSize: 10,
                  background: 'transparent', color: T.accent,
                  border: `1px solid ${T.accent}30`, borderRadius: 4, cursor: 'pointer',
                  display: Object.keys(layoutOverrides).length > 0 ? 'block' : 'none',
                }}>Repor todo o layout ({Object.keys(layoutOverrides).length})</button>
              </div>
            )}
          </Section>

          <Section title="Conteúdo">
            <FlyerField label="Título" multiline value={data.title} onChange={v => update({ title: v })} />
            <FlyerField label="Specs" value={data.specs} onChange={v => update({ specs: v })} />
            <FlyerField label="PVP Recomendado (riscado)" value={data.pvpBase} onChange={v => update({ pvpBase: v })} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr', gap: 6 }}>
              <FlyerField label="Preço (inteiro)" value={data.priceMain} onChange={v => update({ priceMain: v })} />
              <FlyerField label="Cêntimos" value={data.priceCents} onChange={v => update({ priceCents: v })} />
            </div>

            <FlyerToggle label="Mostrar desconto" checked={data.showDiscount} onChange={v => update({ showDiscount: v })} />
            {data.showDiscount && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6 }}>
                <FlyerField label="Desconto" value={data.discountText} onChange={v => update({ discountText: v })} />
                <FlyerField label="Subtítulo" value={data.discountSub} onChange={v => update({ discountSub: v })} />
              </div>
            )}

            <FlyerToggle label="Mostrar acumula em cartão" checked={data.showAccumulate} onChange={v => update({ showAccumulate: v })} />
            {data.showAccumulate && (
              <>
                <FlyerField label="Texto cartão" value={data.accumulateLabel} onChange={v => update({ accumulateLabel: v })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 6 }}>
                  <FlyerField label="Valor" value={data.accumulateValue} onChange={v => update({ accumulateValue: v })} />
                  <FlyerField label="Subtexto" value={data.accumulateSub} onChange={v => update({ accumulateSub: v })} />
                </div>
              </>
            )}

            <FlyerToggle label="Mostrar logo FNAC" checked={data.showLogo} onChange={v => update({ showLogo: v })} />

            <FlyerField label="Rodapé legal" multiline value={data.footnote} onChange={v => update({ footnote: v })} small />
          </Section>
        </div>
      </div>

      {/* Import dialog */}
      {showImport && (
        <ProductImportDialog
          products={allProducts}
          onPick={importFromProduct}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

function FlyerField({ label, value, onChange, multiline, small }) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: T.inkMute, marginBottom: 3, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Geist Mono' }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={small ? 2 : 3}
          style={{
            width: '100%', padding: '6px 8px', fontSize: small ? 10 : 12,
            background: T.paper, color: T.ink,
            border: `1px solid ${T.line}`, borderRadius: 4,
            outline: 'none', fontFamily: 'inherit', resize: 'vertical',
          }}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', fontSize: 12,
            background: T.paper, color: T.ink,
            border: `1px solid ${T.line}`, borderRadius: 4,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      )}
    </label>
  );
}

function FlyerToggle({ label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
      background: T.bgEl, marginBottom: 6, fontSize: 11, color: T.ink,
    }}>
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: T.accent }}
      />
      {label}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FlyerSVG — adaptive layout that re-arranges blocks based on aspect ratio
// ─────────────────────────────────────────────────────────────────────────
function FlyerSVG({ svgRef, format, palette, data, imageMode, imageDataUrl, imageOpacity, displayWidth, displayHeight, layoutOverrides = {}, selectedEl = null, onSelectEl, onDragEl }) {
  // Helper: returns a <g transform> wrapper for an element + click/drag handlers
  const ov = (id) => layoutOverrides[id] || { dx: 0, dy: 0, scale: 1 };
  // Drag tracking per session — uses screen pixels → mm conversion via viewBox
  const dragStateRef = useRef(null);
  const elProps = (id) => {
    const o = ov(id);
    const isSel = selectedEl === id;
    return {
      transform: `translate(${o.dx} ${o.dy}) scale(${o.scale})`,
      'data-el': id,
      style: { cursor: isSel ? 'grabbing' : 'grab', outline: 'none' },
      onMouseDown: (e) => {
        e.stopPropagation();
        if (onSelectEl) onSelectEl(id);
        const svg = svgRef.current;
        if (!svg || !onDragEl) return;
        const rect = svg.getBoundingClientRect();
        // mm per pixel
        const mmPerPxX = format.wmm / rect.width;
        const mmPerPxY = format.hmm / rect.height;
        const startX = e.clientX, startY = e.clientY;
        const startDx = o.dx, startDy = o.dy;
        dragStateRef.current = { id, mmPerPxX, mmPerPxY, startX, startY, startDx, startDy };
        const onMove = (ev) => {
          const st = dragStateRef.current;
          if (!st) return;
          const dxMm = +(st.startDx + (ev.clientX - st.startX) * st.mmPerPxX).toFixed(2);
          const dyMm = +(st.startDy + (ev.clientY - st.startY) * st.mmPerPxY).toFixed(2);
          onDragEl(st.id, dxMm, dyMm);
        };
        const onUp = () => {
          dragStateRef.current = null;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      },
    };
  };
  // Selection ring for the currently-selected element
  const selRing = (id, x, y, w, h) => {
    if (selectedEl !== id) return null;
    return (
      <rect
        x={x - 1} y={y - 1} width={w + 2} height={h + 2}
        fill="none" stroke="#1F8FE8" strokeWidth="0.4" strokeDasharray="1.5 1"
        pointerEvents="none"
      />
    );
  };
  // SVG viewBox uses mm directly so layout reasons in real units
  const W = format.wmm;
  const H = format.hmm;
  const isWide = W / H > 1.6; // very wide formats (régua)
  const isSmall = W * H < 10000; // small etiqueta
  const isLandscape = W > H && !isWide;

  // Layout tuning based on shape
  const padding = isSmall ? 4 : (isWide ? 6 : 14);

  // Image positioning
  const hasImage = imageMode !== 'none' && imageDataUrl;
  let textX = padding;
  let textW = W - padding * 2;
  let imgRect = null;
  if (hasImage && imageMode === 'side' && !isSmall) {
    const imgW = isWide ? H * 0.9 : W * 0.42;
    imgRect = { x: padding, y: padding, w: imgW, h: H - padding * 2 };
    textX = padding + imgW + padding;
    textW = W - textX - padding;
  }

  // Title sizing
  const titleLines = (data.title || '').split('\n');
  const titleSize = isSmall ? 7 : (isWide ? 10 : Math.min(textW / 8, H / 16));

  // Price big number sizing
  const priceSize = isSmall ? 18 : (isWide ? 28 : Math.min(textW / 4, H / 6));

  // ─── Anchored layout positions (fixed % of canvas — match FNAC mockups) ───
  // Title is anchored to top-padding; everything else uses fixed Y anchors so
  // the layout stays consistent regardless of how many lines the title has.
  const titleY = padding + (isSmall ? 2 : 4);
  const titleBlockH = titleLines.length * titleSize * 0.95;
  // For small/wide flyers, keep the cursor-style layout below title.
  // For normal portrait/landscape, anchor to fixed % of H.
  const specsY  = isSmall ? titleY + titleBlockH + 2
                : isWide  ? titleY + titleBlockH + 3
                          : H * 0.55;
  const pvpY    = isSmall ? specsY + 5
                : isWide  ? specsY + 5
                          : H * 0.62;
  const priceY  = isSmall ? H - padding - 6
                : isWide  ? H - padding - 8
                          : H * 0.74;
  // Layout cursor kept for any leftover code paths
  let cursorY = titleY;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={displayWidth} height={displayHeight}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block', borderRadius: 4,
        boxShadow: '0 20px 40px -20px rgba(0,0,0,0.25)',
      }}
    >
      <defs>
        <style>{`
          .ft-display { font-family: 'Arial Black', Impact, 'Helvetica Neue', sans-serif; font-weight: 900; }
          .ft-sans { font-family: 'Arial', 'Helvetica Neue', sans-serif; }
          .ft-bold { font-weight: 700; }
        `}</style>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width={W} height={H} fill={palette.bg} />

      {/* Background image (mode = background) */}
      {hasImage && imageMode === 'background' && (
        <image
          href={imageDataUrl}
          x="0" y="0" width={W} height={H}
          preserveAspectRatio="xMidYMid slice"
          opacity={imageOpacity}
        />
      )}

      {/* Side image */}
      {imgRect && (
        <image
          href={imageDataUrl}
          x={imgRect.x} y={imgRect.y} width={imgRect.w} height={imgRect.h}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {/* Title */}
      {data.title && (
        <g {...elProps('title')}>
          {titleLines.map((line, i) => {
            const y = cursorY + (i + 1) * titleSize * 0.95;
            return (
              <text
                key={i}
                x={textX} y={y}
                className="ft-display"
                fontSize={titleSize}
                fill={palette.fg}
              >
                {line}
              </text>
            );
          })}
          {selRing('title', textX - 1, cursorY, textW + 2, titleLines.length * titleSize * 0.95)}
        </g>
      )}
      {(() => {
        cursorY += titleLines.length * titleSize * 0.95 + (isSmall ? 1 : 4);
        return null;
      })()}

      {/* Specs — anchored at fixed Y */}
      {data.specs && !isSmall && (
        <g {...elProps('specs')}>
          <text
            x={textX} y={specsY}
            className="ft-sans"
            fontSize={isWide ? 3.2 : 4}
            fill={palette.fg}
            opacity="0.95"
          >
            {data.specs}
          </text>
          {selRing('specs', textX - 1, specsY - 4, textW, isWide ? 5 : 7)}
        </g>
      )}

      {/* PVP base (riscado) — anchored at fixed Y */}
      {data.pvpBase && !isSmall && (
        <g {...elProps('pvpBase')}>
          <text
            x={textX} y={pvpY}
            className="ft-sans"
            fontSize={isWide ? 2.5 : 3.5}
            fill={palette.fg}
            opacity="0.85"
          >
            {data.pvpBaseLabel}
          </text>
          <text
            x={textX} y={pvpY + (isWide ? 7 : 10)}
            className="ft-display"
            fontSize={isWide ? 7 : 11}
            fill={palette.fg}
            opacity="0.85"
            textDecoration="line-through"
          >
            {data.pvpBase}
          </text>
          {selRing('pvpBase', textX - 1, pvpY - 3, 60, isWide ? 12 : 16)}
        </g>
      )}

      {/* Discount badge — positioned next to the PVP riscado, like FNAC mockups */}
      {data.showDiscount && data.discountText && (() => {
        const baseX = W - padding - (isSmall ? 22 : 50);
        // Anchor near PVP base (~60% Y) for portrait/landscape; top for small/wide
        const baseY = isSmall ? padding + 4 : (isWide ? padding + 8 : pvpY - 4);
        const o = ov('discount');
        return (
        <g
          transform={`translate(${baseX + o.dx} ${baseY + o.dy}) scale(${o.scale})`}
          data-el="discount"
          style={{ cursor: selectedEl === 'discount' ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onSelectEl) onSelectEl('discount');
            const svg = svgRef.current;
            if (!svg || !onDragEl) return;
            const rect = svg.getBoundingClientRect();
            const mmPerPxX = format.wmm / rect.width;
            const mmPerPxY = format.hmm / rect.height;
            const startX = e.clientX, startY = e.clientY;
            const startDx = o.dx, startDy = o.dy;
            const onMove = (ev) => {
              onDragEl('discount',
                +(startDx + (ev.clientX - startX) * mmPerPxX).toFixed(2),
                +(startDy + (ev.clientY - startY) * mmPerPxY).toFixed(2));
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        >
          <rect
            x="0" y="0"
            width={isSmall ? 22 : 50}
            height={isSmall ? 13 : 24}
            fill={palette.fg === '#FFFFFF' ? '#1A1A1A' : palette.fg}
            rx="2"
          />
          <text
            x={isSmall ? 11 : 25}
            y={isSmall ? 8.5 : 13}
            className="ft-display"
            fontSize={isSmall ? 6 : 11}
            fill={palette.bg === '#1A1A1A' ? '#FFFFFF' : palette.bg}
            textAnchor="middle"
          >
            {data.discountText}
          </text>
          {!isSmall && data.discountSub && (
            <text
              x="25" y="20.5"
              className="ft-sans"
              fontSize="2.2"
              fill={palette.bg === '#1A1A1A' ? '#FFFFFF' : palette.bg}
              textAnchor="middle"
            >
              {data.discountSub}
            </text>
          )}
          {selRing('discount', 0, 0, isSmall ? 22 : 50, isSmall ? 13 : 24)}
        </g>
        );
      })()}

      {/* Main price — biggest element. Anchored at priceY computed above. */}
      {data.priceMain && (() => {
        // Arial Black numerals are ~0.62 em wide each; safer than 0.55
        const integerW = (data.priceMain || '').length * priceSize * 0.62;
        const centsSize = priceSize * 0.42;
        const integerBaselineY = priceY + priceSize * 0.85;
        // Cents baseline aligns with top of the integer (cap-height area)
        const centsBaselineY = priceY + priceSize * 0.40;
        return (
          <g {...elProps('price')}>
            <text
              x={textX} y={integerBaselineY}
              className="ft-display"
              fontSize={priceSize}
              fill={palette.fg}
            >
              {data.priceMain}
            </text>
            {data.priceCents && (
              <text
                x={textX + integerW + 1}
                y={centsBaselineY}
                className="ft-display"
                fontSize={centsSize}
                fill={palette.fg}
              >
                {data.priceCents}
              </text>
            )}
            {selRing('price', textX - 1, priceY + priceSize * 0.05, integerW + centsSize * 4, priceSize * 0.95)}
          </g>
        );
      })()}

      {/* Acumula em cartão FNAC strip */}
      {data.showAccumulate && !isSmall && (() => {
        const stripY = H - padding - (isWide ? 10 : 22);
        const o = ov('accumulate');
        return (
          <g
            transform={`translate(${textX + o.dx} ${stripY + o.dy}) scale(${o.scale})`}
            data-el="accumulate"
            style={{ cursor: selectedEl === 'accumulate' ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (onSelectEl) onSelectEl('accumulate');
              const svg = svgRef.current;
              if (!svg || !onDragEl) return;
              const rect = svg.getBoundingClientRect();
              const mmPerPxX = format.wmm / rect.width;
              const mmPerPxY = format.hmm / rect.height;
              const startX = e.clientX, startY = e.clientY, startDx = o.dx, startDy = o.dy;
              const onMove = (ev) => onDragEl('accumulate',
                +(startDx + (ev.clientX - startX) * mmPerPxX).toFixed(2),
                +(startDy + (ev.clientY - startY) * mmPerPxY).toFixed(2));
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            {/* Two stacked card icons */}
            <rect x="0" y="2" width={isWide ? 5 : 8} height={isWide ? 4 : 6} rx="1" fill={palette.accent} />
            <rect x={isWide ? 2 : 3} y="0" width={isWide ? 5 : 8} height={isWide ? 4 : 6} rx="1" fill={palette.fg === '#FFFFFF' ? '#1A1A1A' : palette.fg} />
            <text
              x={isWide ? 10 : 14} y={isWide ? 4 : 5}
              className="ft-sans ft-bold"
              fontSize={isWide ? 2.4 : 3}
              fill={palette.fg}
            >
              {data.accumulateLabel}
            </text>
            <text
              x={isWide ? 10 : 14} y={isWide ? 8 : 11}
              className="ft-display"
              fontSize={isWide ? 4 : 5.5}
              fill={palette.fg}
            >
              {data.accumulateValue}
            </text>
            {!isWide && (
              <text
                x="14" y="15"
                className="ft-sans"
                fontSize="2.5"
                fill={palette.fg}
              >
                {data.accumulateSub}
              </text>
            )}
            {selRing('accumulate', -1, -1, 50, isWide ? 11 : 18)}
          </g>
        );
      })()}

      {/* Logo FNAC — bottom-right */}
      {data.showLogo && !isSmall && (() => {
        const baseX = W - padding - (isWide ? 14 : 18);
        const baseY = H - padding - (isWide ? 10 : 14);
        const o = ov('logo');
        return (
          <g
            transform={`translate(${baseX + o.dx} ${baseY + o.dy}) scale(${o.scale})`}
            data-el="logo"
            style={{ cursor: selectedEl === 'logo' ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (onSelectEl) onSelectEl('logo');
              const svg = svgRef.current;
              if (!svg || !onDragEl) return;
              const rect = svg.getBoundingClientRect();
              const mmPerPxX = format.wmm / rect.width;
              const mmPerPxY = format.hmm / rect.height;
              const startX = e.clientX, startY = e.clientY, startDx = o.dx, startDy = o.dy;
              const onMove = (ev) => onDragEl('logo',
                +(startDx + (ev.clientX - startX) * mmPerPxX).toFixed(2),
                +(startDy + (ev.clientY - startY) * mmPerPxY).toFixed(2));
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <rect x="0" y="0" width={isWide ? 14 : 18} height={isWide ? 10 : 14} fill="#FFCB05" rx="1" />
            <text
              x={isWide ? 7 : 9}
              y={isWide ? 7 : 10}
              className="ft-display"
              fontSize={isWide ? 5 : 7}
              fill="#1A1A1A"
              textAnchor="middle"
            >
              fnac
            </text>
            {selRing('logo', 0, 0, isWide ? 14 : 18, isWide ? 10 : 14)}
          </g>
        );
      })()}

      {/* Footnote */}
      {data.footnote && !isSmall && (
        <g {...elProps('footnote')}>
          <text
            x={padding} y={H - 1.5}
            className="ft-sans"
            fontSize={isWide ? 1.5 : 1.8}
            fill={palette.fg}
            opacity="0.6"
          >
            {data.footnote}
          </text>
          {selRing('footnote', padding - 1, H - 4, W - padding * 2, 3)}
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Product import dialog — pick a product from any active campaign
// ─────────────────────────────────────────────────────────────────────────
function ProductImportDialog({ products, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 100);
    const q = search.toLowerCase();
    return products.filter(p =>
      p.description.toLowerCase().includes(q) ||
      p.ean.toLowerCase().includes(q) ||
      p.family.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [products, search]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, animation: 'fadeUp 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 24,
        width: 'min(720px, 92vw)', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        border: `1px solid ${T.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 4 }}>
              Importar produto
            </div>
            <h3 className="display" style={{ fontSize: 22, margin: 0, fontStyle: 'italic' }}>Escolhe um produto da campanha</h3>
          </div>
          <button onClick={onClose} style={{
            padding: 6, background: 'transparent', border: 'none', color: T.inkMute, borderRadius: 4,
          }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, marginBottom: 12 }}>
          <Search size={14} style={{ color: T.inkMute }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            autoFocus
            placeholder="Pesquisar EAN, descrição, família…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: T.ink }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${T.line}`, borderRadius: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
              Sem resultados.
            </div>
          ) : filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center',
                background: T.bgEl, border: 'none',
                borderBottom: `1px solid ${T.lineSoft}`,
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.lineSoft}
              onMouseLeave={e => e.currentTarget.style.background = T.bgEl}
            >
              <span className="mono" style={{ fontSize: 9, padding: '2px 5px', background: T.bg, borderRadius: 2, color: T.inkSoft, flexShrink: 0 }}>
                {p.ean}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.description}
              </span>
              {p.discount > 0 && (
                <span className="mono" style={{ fontSize: 10, padding: '1px 5px', background: T.accent, color: '#fff', borderRadius: 2, flexShrink: 0 }}>
                  −{Math.round(p.discount)}%
                </span>
              )}
              <span className="mono" style={{ fontSize: 11, color: T.ink, fontWeight: 600, flexShrink: 0 }}>
                {p.campaignPrice > 0 ? `€${p.campaignPrice.toFixed(2).replace('.', ',')}` : '—'}
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: T.inkMute }}>
          {products.length} produtos em todas as campanhas. A mostrar primeiros 100 resultados.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SVG → PNG/PDF utilities
// ─────────────────────────────────────────────────────────────────────────
async function renderSVGToBlob(svgEl, format, type = 'png') {
  // Serialize the SVG with inline xmlns
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Force absolute width/height in mm units for the export
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Render to canvas at 300 DPI equivalent (mm × 300 / 25.4)
  const dpi = 300;
  const mmToPx = dpi / 25.4;
  const wPx = Math.round(format.wmm * mmToPx);
  const hPx = Math.round(format.hmm * mmToPx);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, wPx, hPx);
  ctx.drawImage(img, 0, 0, wPx, hPx);
  URL.revokeObjectURL(url);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png', 0.95);
  });
}

// Minimal PDF generator: single-page wrapping a PNG image.
// Produces a valid PDF 1.4 file from scratch (no external libs needed).
async function pngToPdf(pngBlob, format) {
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  // PDF page size in points (1pt = 1/72 inch, 1mm = 2.834645669 pt)
  const mmToPt = 72 / 25.4;
  const pageW = format.wmm * mmToPt;
  const pageH = format.hmm * mmToPt;

  // Read PNG width/height
  const view = new DataView(pngBytes.buffer);
  // PNG signature (8 bytes) + IHDR length (4) + 'IHDR' (4) → width at offset 16
  const imgW = view.getUint32(16, false);
  const imgH = view.getUint32(20, false);

  // Build PDF objects
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let pos = 0;
  const write = (data) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    parts.push(bytes);
    pos += bytes.length;
  };
  const startObj = (n) => { offsets[n] = pos; write(`${n} 0 obj\n`); };
  const endObj = () => write('endobj\n');

  // Header
  write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // 1: Catalog
  startObj(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();

  // 2: Pages
  startObj(2);
  write('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  endObj();

  // 3: Page
  startObj(3);
  write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\n`);
  endObj();

  // 4: Image XObject
  startObj(4);
  write(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${imgW} >> /Length ${pngIDATLength(pngBytes)} >>\nstream\n`);
  // Embed only IDAT data (raw deflate stream). The PNG's IDAT chunks contain the zlib-compressed pixel data, which PDF can use directly.
  const idat = extractPngIDAT(pngBytes);
  write(idat);
  write('\nendstream\n');
  endObj();

  // 5: Page content stream — draw image filling the page
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im1 Do\nQ\n`;
  startObj(5);
  write(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\n`);
  endObj();

  // xref
  const xrefPos = pos;
  write(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i++) {
    write(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  }
  // trailer
  write(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  // Concatenate parts
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return new Blob([out], { type: 'application/pdf' });
}

// Extract concatenated IDAT bytes from a PNG (their zlib stream is what PDF needs)
function extractPngIDAT(pngBytes) {
  const dv = new DataView(pngBytes.buffer);
  let i = 8; // skip signature
  const chunks = [];
  while (i < pngBytes.length) {
    const len = dv.getUint32(i, false);
    const type = String.fromCharCode(pngBytes[i + 4], pngBytes[i + 5], pngBytes[i + 6], pngBytes[i + 7]);
    if (type === 'IDAT') {
      chunks.push(pngBytes.slice(i + 8, i + 8 + len));
    }
    if (type === 'IEND') break;
    i += 8 + len + 4; // header + data + CRC
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function pngIDATLength(pngBytes) {
  return extractPngIDAT(pngBytes).length;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PDF Editor
// ─────────────────────────────────────────────────────────────────────────
function PdfEditor() {
  const [overlays, setOverlays] = useState([
    { id: 1, type: 'price', x: 12, y: 24, original: '€19,99', current: '€19,99' },
    { id: 2, type: 'name', x: 60, y: 14, original: 'Camisola Algodão', current: 'Camisola Algodão' },
    { id: 3, type: 'price', x: 70, y: 60, original: '€34,90', current: '€34,90' },
  ]);
  const [selected, setSelected] = useState(null);
  const update = (id, value) => setOverlays(o => o.map(item => item.id === id ? { ...item, current: value } : item));

  return (
    <div className="fade-up">
      <Header eyebrow="Materiais" title="Editor de PDFs" subtitle="Corrige preços e nomes diretamente sobre o folheto. Carrega o original e edita as zonas detetadas." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10, padding: 32, position: 'relative', minHeight: 600 }}>
          <div style={{ background: T.paper, aspectRatio: '0.707', border: `1px solid ${T.line}`, position: 'relative', boxShadow: '0 30px 60px -30px rgba(20,18,16,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '8% 10%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="display" style={{ fontSize: '3vw', fontStyle: 'italic', color: T.ink }}>Outono '26</div>
              <div className="mono" style={{ fontSize: '0.9vw', letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase', marginTop: 8 }}>Coleção Nova · Edição Limitada</div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%', marginTop: '6%' }}>
                {[1, 2].map(i => <div key={i} style={{ background: T.bg, borderRadius: 4 }} />)}
              </div>
            </div>
            {overlays.map(o => {
              const changed = o.current !== o.original;
              return (
                <button key={o.id} onClick={() => setSelected(o.id)} style={{
                  position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, padding: '4px 8px',
                  background: changed ? T.accent : (selected === o.id ? T.ink : 'rgba(255,255,255,0.9)'),
                  color: changed || selected === o.id ? '#fff' : T.ink,
                  border: `1px solid ${changed ? T.accent : T.ink}`, borderRadius: 4,
                  fontSize: 12, fontFamily: o.type === 'price' ? "'Geist Mono'" : 'inherit',
                  fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>{o.current}</button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="Zonas detetadas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overlays.map(o => {
                const changed = o.current !== o.original;
                const isSel = selected === o.id;
                return (
                  <div key={o.id} onClick={() => setSelected(o.id)} style={{
                    padding: 14, borderRadius: 8, cursor: 'pointer',
                    background: isSel ? T.bgEl : 'transparent',
                    border: `1px solid ${isSel ? T.ink : T.line}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {o.type === 'price' ? <DollarSign size={12} /> : <Type size={12} />}
                      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: T.inkMute, textTransform: 'uppercase' }}>
                        {o.type === 'price' ? 'Preço' : 'Nome'}
                      </span>
                      {changed && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.accent, fontWeight: 500 }}>EDITADO</span>}
                    </div>
                    <input value={o.current} onChange={e => update(o.id, e.target.value)} onClick={e => e.stopPropagation()} style={{
                      width: '100%', padding: '6px 8px', border: `1px solid ${T.line}`, borderRadius: 4,
                      fontSize: 13, fontFamily: o.type === 'price' ? "'Geist Mono'" : 'inherit', background: T.paper,
                    }} />
                    {changed && <div style={{ fontSize: 11, color: T.inkMute, marginTop: 6 }}>original: <span style={{ textDecoration: 'line-through' }}>{o.original}</span></div>}
                  </div>
                );
              })}
            </div>
          </Section>
          <button style={{ padding: '12px 16px', background: T.ink, color: T.bg, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download size={16} /> Exportar PDF
          </button>
          <div style={{ padding: 14, background: T.accentSoft, borderRadius: 8, fontSize: 12, color: T.ink, lineHeight: 1.6 }}>
            <strong>Nota técnica:</strong> em produção, esta vista usaria <span className="mono">pdf-lib</span> ou <span className="mono">pdfjs-dist</span> para detetar e substituir texto preservando fontes e layout.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Notes — single global notebook with auto-save, accessible via:
// 1. Sidebar item "Notas" (full-screen view)
// 2. Floating button + side panel (quick capture, available on any page)
// ─────────────────────────────────────────────────────────────────────────

// Format the saved-status indicator
function useSavedIndicator(text) {
  const [savedAt, setSavedAt] = useState(Date.now());
  const [label, setLabel] = useState('guardado');
  useEffect(() => {
    setSavedAt(Date.now());
    setLabel('a guardar…');
    const t1 = setTimeout(() => setLabel('guardado'), 350);
    return () => clearTimeout(t1);
  }, [text]);
  // Tick for "guardado há X" relative time
  useEffect(() => {
    const i = setInterval(() => {
      const sec = Math.floor((Date.now() - savedAt) / 1000);
      if (sec < 5) setLabel('guardado');
      else if (sec < 60) setLabel(`guardado há ${sec}s`);
      else setLabel(`guardado há ${Math.floor(sec / 60)} min`);
    }, 1000);
    return () => clearInterval(i);
  }, [savedAt]);
  return label;
}

// Shared toolbar pieces for both views
function NotesToolbar({ notes, setNotes, compact = false }) {
  const status = useSavedIndicator(notes);
  const charCount = notes.length;
  const overLimit = charCount > 500000;

  const downloadTxt = () => {
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (!notes.trim()) return;
    if (confirm('Apagar TODAS as notas? Esta ação não pode ser desfeita.\n\nDica: usa "Descarregar" antes para guardar uma cópia.')) {
      setNotes('');
    }
  };

  const insertTimestamp = () => {
    const now = new Date();
    const stamp = `\n\n— ${now.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} —\n`;
    setNotes(prev => (prev || '') + stamp);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      padding: '8px 12px', background: T.bgEl,
      borderBottom: `1px solid ${T.line}`, borderRadius: compact ? 0 : '8px 8px 0 0',
    }}>
      <button onClick={insertTimestamp} title="Inserir data e hora" style={toolBtn()}>
        <Plus size={11} /> Data/Hora
      </button>
      <button onClick={downloadTxt} disabled={!notes} title="Descarregar como .txt" style={toolBtn(!notes)}>
        <Download size={11} /> {compact ? '' : 'Descarregar'}
      </button>
      <button onClick={clearAll} disabled={!notes} title="Apagar tudo" style={toolBtn(!notes, true)}>
        <Trash2 size={11} /> {compact ? '' : 'Limpar'}
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: T.inkMute, fontFamily: 'Geist Mono' }}>
        <span style={{ color: overLimit ? T.red : T.inkMute }}>
          {charCount.toLocaleString('pt-PT')} {overLimit ? '⚠' : ''}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: status === 'a guardar…' ? T.orange : T.green,
            display: 'inline-block',
          }} />
          {status}
        </span>
      </div>
    </div>
  );
}

function toolBtn(disabled = false, danger = false) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 9px', fontSize: 11, fontWeight: 500,
    background: 'transparent', color: disabled ? T.inkMute : (danger ? T.red : T.ink),
    border: `1px solid ${T.line}`, borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Inventory Scanner View
// ─────────────────────────────────────────────────────────────────────────
function InventoryView({ stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, campaigns, setCampaigns, excludedFamilies = [] }) {
  const videoRef = useRef(null);
  const inputRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const lastEanRef = useRef(null);
  const lastEanTimeRef = useRef(0);

  // Hydrate campaigns that still need rows — so productIndex has descriptions
  useEffect(() => {
    if (!setCampaigns || !supabase) return;
    const needRows = campaigns.filter(c => c.id && (c._needsRows || !c.rows?.length));
    if (needRows.length === 0) return;
    cloudFetchCampaignRows(needRows.map(c => c.id)).then(hydrated => {
      if (!hydrated.length) return;
      const rowsById = new Map(hydrated.map(h => [h.id, h]));
      setCampaigns(prev => prev.map(c => {
        const r = rowsById.get(c.id);
        return r ? { ...c, rows: r.rows, itemCount: r.itemCount, _needsRows: false } : c;
      }));
    }).catch(err => console.warn('[inventory-hydrate]', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [scanning, setScanning] = useState(false);
  const [manualEan, setManualEan] = useState('');
  // Persisted scan history — survives menu changes, page reloads, crashes.
  // ts is stored as ISO string in localStorage and deserialised back to Date here.
  const [scannedRaw, setScannedRaw] = useStoredState('inventory.scanned', []);
  const scanned = useMemo(
    () => (scannedRaw || []).map(s => ({ ...s, ts: s.ts instanceof Date ? s.ts : new Date(s.ts) })),
    [scannedRaw]
  );
  const setScanned = useCallback((updater) => {
    setScannedRaw(prev => {
      const list = (prev || []).map(s => ({ ...s, ts: s.ts instanceof Date ? s.ts : new Date(s.ts) }));
      const next = typeof updater === 'function' ? updater(list) : updater;
      // Serialise ts to ISO string before storing
      return next.map(s => ({ ...s, ts: s.ts instanceof Date ? s.ts.toISOString() : s.ts }));
    });
  }, [setScannedRaw]);
  const [cameraError, setCameraError] = useState(null);
  const [mode, setMode] = useState('manual'); // 'camera' | 'manual'
  const [compareWith, setCompareWith] = useStoredState('inventory.compareWith', 'both'); // 'po2' | 'po3' | 'both'
  const [listView, setListView] = useStoredState('inventory.listView', 'detail'); // 'detail' | 'summary'
  const [filterFamily, setFilterFamily] = useStoredState('inventory.filterFamily', '');
  const [filterSubfamily, setFilterSubfamily] = useStoredState('inventory.filterSubfamily', '');

  // Build lookup indexes
  const { index: stockIdxPO2 } = useMemo(() => buildStockIndex(stockRowsPO2, stockMapPO2), [stockRowsPO2, stockMapPO2]);
  const { index: stockIdxPO3 } = useMemo(() => buildStockIndex(stockRowsPO3, stockMapPO3), [stockRowsPO3, stockMapPO3]);

  // Build EAN → product info from campaigns
  const productIndex = useMemo(() => {
    const map = new Map();
    const excl = new Set((excludedFamilies || []).map(f => f.toUpperCase()));
    for (const camp of campaigns) {
      const cols = detectColumns(camp.headers || []);
      if (!cols.ean) continue;
      for (const row of (camp.rows || [])) {
        const key = normalizeEAN(row[cols.ean]);
        if (!key || map.has(key)) continue;
        const fam = cols.family ? String(row[cols.family] ?? '').trim() : '';
        if (fam && excl.has(fam.toUpperCase())) continue;
        map.set(key, {
          descr: cols.description ? String(row[cols.description] ?? '').trim() : '',
          family: fam,
          subfamily: cols.subfamily ? String(row[cols.subfamily] ?? '').trim() : '',
          price: cols.campaignPrice ? parseNum(row[cols.campaignPrice]) : (cols.basePrice ? parseNum(row[cols.basePrice]) : 0),
          discount: cols.discount ? parseNum(row[cols.discount]) : 0,
        });
      }
    }
    return map;
  }, [campaigns, excludedFamilies]);

  // Extract available families and subfamilies from productIndex
  const { availableFamilies, subfamiliesFor } = useMemo(() => {
    const famSet = new Set();
    const subMap = new Map(); // family → Set<subfamily>
    for (const info of productIndex.values()) {
      if (info.family) {
        famSet.add(info.family);
        if (info.subfamily) {
          if (!subMap.has(info.family)) subMap.set(info.family, new Set());
          subMap.get(info.family).add(info.subfamily);
        }
      }
    }
    return {
      availableFamilies: [...famSet].sort(),
      subfamiliesFor: Object.fromEntries([...subMap.entries()].map(([f, s]) => [f, [...s].sort()])),
    };
  }, [productIndex]);

  // Reset subfamily filter when family changes
  const handleFamilyChange = (fam) => {
    setFilterFamily(fam);
    setFilterSubfamily('');
  };

  const processEan = useCallback((rawEan) => {
    const ean = normalizeEAN(rawEan);
    if (!ean) return;
    // Debounce: ignore same EAN within 2 seconds (camera fires multiple times)
    if (ean === lastEanRef.current && Date.now() - lastEanTimeRef.current < 2000) return;
    lastEanRef.current = ean;
    lastEanTimeRef.current = Date.now();

    const product = productIndex.get(ean);
    const po2 = stockIdxPO2.get(ean) ?? null;
    const po3 = stockIdxPO3.get(ean) ?? null;

    setScanned(prev => [{
      ean,
      descr: product?.descr || '',
      family: product?.family || '',
      subfamily: product?.subfamily || '',
      price: product?.price || 0,
      discount: product?.discount || 0,
      po2,
      po3,
      ts: new Date(),
      found: !!product,
    }, ...prev]);

    // Beep feedback
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = product ? 1200 : 600;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}

    // Haptic feedback on mobile (Android Chrome / Samsung Internet support
    // navigator.vibrate; iOS Safari does NOT support it. iOS uses Web Vibration
    // API only inside Web App, not Safari. Best-effort.)
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(product ? [60] : [40, 60, 40]);
      }
    } catch {}
  }, [productIndex, stockIdxPO2, stockIdxPO3]);

  // Start camera scanner
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!('BarcodeDetector' in window)) {
        setCameraError('O teu browser não suporta o leitor de câmara nativo. Usa o modo manual ou actualiza para iOS 17+ / Chrome 83+.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      detectorRef.current = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
      setScanning(true);

      const detect = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          for (const b of barcodes) processEan(b.rawValue);
        } catch {}
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    } catch (err) {
      setCameraError('Erro ao aceder à câmara: ' + err.message);
    }
  }, [processEan]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    detectorRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualEan.trim()) return;
    processEan(manualEan.trim());
    setManualEan('');
    inputRef.current?.focus();
  };

  // Export to Excel (.xlsx) — one row per scan = 1 unit counted.
  // Sheet 1: Histórico (every scan as its own line, 1 unit each — for audit trail)
  // Sheet 2: Resumo (aggregated by EAN with total units counted — for inventory balance)
  const exportXLSX = () => {
    if (scanned.length === 0) return;
    // Sheet 1: full history, oldest first, 1 unit per line
    const histRows = [...scanned].reverse().map(s => ({
      EAN: s.ean,
      'Descrição': s.descr || '',
      'Família': s.family || '',
      'Sub-família': s.subfamily || '',
      'Unidade': 1,
      'Stock PO2': s.po2 ?? '',
      'Stock PO3': s.po3 ?? '',
      'Hora': s.ts.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      'Encontrado': s.found ? 'sim' : 'não',
    }));
    // Sheet 2: aggregated by EAN
    const aggMap = new Map();
    for (const s of scanned) {
      if (!aggMap.has(s.ean)) {
        aggMap.set(s.ean, {
          EAN: s.ean,
          'Descrição': s.descr || '',
          'Família': s.family || '',
          'Sub-família': s.subfamily || '',
          'Unidades contadas': 0,
          'Stock PO2': s.po2 ?? '',
          'Stock PO3': s.po3 ?? '',
        });
      }
      aggMap.get(s.ean)['Unidades contadas']++;
    }
    const summaryRows = [...aggMap.values()];
    // Add diff columns for comparison
    summaryRows.forEach(r => {
      const cnt = r['Unidades contadas'];
      const po2 = typeof r['Stock PO2'] === 'number' ? r['Stock PO2'] : (parseInt(r['Stock PO2']) || 0);
      const po3 = typeof r['Stock PO3'] === 'number' ? r['Stock PO3'] : (parseInt(r['Stock PO3']) || 0);
      r['Diferença vs PO2'] = cnt - po2;
      r['Diferença vs PO3'] = cnt - po3;
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(histRows);
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Histórico');
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por EAN');
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
    XLSX.writeFile(wb, `inventario_${stamp}.xlsx`);
  };

  const totalFound = scanned.filter(s => s.found).length;
  const totalNotFound = scanned.filter(s => !s.found).length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ScanLine size={22} style={{ color: T.accent }} /> Scanner de Inventário
        </h2>
        <p style={{ fontSize: 13, color: T.inkMute, marginTop: 6 }}>
          Lê códigos de barras com a câmara ou digita manualmente. Cada EAN é cruzado com o stock PO2/PO3. A sessão é <strong>guardada automaticamente</strong> neste dispositivo — podes mudar de menu, fechar e reabrir o browser, que as leituras ficam.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ v: 'camera', label: 'Câmara', icon: Camera }, { v: 'manual', label: 'Manual / Pistola', icon: ScanLine }].map(({ v, label, icon: Icon }) => (
          <button key={v} onClick={() => { if (v !== mode) { stopCamera(); setMode(v); } }} style={{
            padding: '7px 16px', borderRadius: 6, border: `1px solid ${mode === v ? T.accent : T.line}`,
            background: mode === v ? T.accent : 'transparent', color: mode === v ? '#fff' : T.ink,
            fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Compare-with toggle (PO2 / PO3 / both) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: T.inkMute, fontFamily: 'Geist Mono, monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Comparar com:</span>
        {[
          { v: 'po2', label: 'PO2 (Armazém)' },
          { v: 'po3', label: 'PO3 (Loja Aveiro)' },
          { v: 'both', label: 'Ambos' },
        ].map(({ v, label }) => (
          <button key={v} onClick={() => setCompareWith(v)} style={{
            padding: '5px 12px', borderRadius: 4,
            border: `1px solid ${compareWith === v ? T.cyan : T.line}`,
            background: compareWith === v ? T.cyan : 'transparent',
            color: compareWith === v ? T.ink : T.inkSoft,
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* Camera mode */}
      {mode === 'camera' && (
        <div style={{ marginBottom: 20 }}>
          {!scanning ? (
            <button onClick={startCamera} style={{
              padding: '10px 20px', background: T.ink, color: T.bg, border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Camera size={16} /> Iniciar Câmara
            </button>
          ) : (
            <button onClick={stopCamera} style={{
              padding: '10px 20px', background: T.accent, color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <X size={16} /> Parar Câmara
            </button>
          )}
          {cameraError && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: T.bgEl, border: `1px solid ${T.accent}`, borderRadius: 6, color: T.accent, fontSize: 13 }}>
              {cameraError}
            </div>
          )}
          <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', background: '#000', display: scanning ? 'block' : 'none', maxWidth: 500 }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
      )}

      {/* Manual / pistola mode */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 400 }}>
          <input
            ref={inputRef}
            autoFocus
            value={manualEan}
            onChange={e => setManualEan(e.target.value)}
            placeholder="EAN (pistola ou teclado)…"
            style={{
              flex: 1, padding: '9px 12px', fontSize: 15, fontFamily: 'Geist Mono, monospace',
              background: T.paper, border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink,
              outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '9px 16px', background: T.ink, color: T.bg, border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Ler</button>
        </form>
      )}

      {/* Stats row */}
      {scanned.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: T.inkMute }}>
            <strong style={{ color: T.ink }}>{scanned.length}</strong> leituras ·{' '}
            <strong style={{ color: T.green }}>{totalFound}</strong> encontrados ·{' '}
            <strong style={{ color: T.accent }}>{totalNotFound}</strong> não encontrados
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.green, fontFamily: 'Geist Mono, monospace' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
            sessão guardada
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={exportXLSX} title="Exporta um Excel com 2 folhas: Histórico (1 linha por leitura) e Resumo por EAN com diferença vs PO2/PO3" style={{
              padding: '6px 12px', background: T.green, color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Download size={12} /> Exportar Excel
            </button>
            <button
              onClick={() => {
                if (!confirm(`Iniciar nova sessão de inventário?\n\nIsto apaga as ${scanned.length} leituras actuais. Considera exportar para Excel primeiro.`)) return;
                setScanned([]);
              }}
              style={{
                padding: '6px 12px', background: 'transparent', color: T.accent,
                border: `1px solid ${T.accent}30`, borderRadius: 6, fontSize: 12, cursor: 'pointer',
              }}
            >
              Nova sessão
            </button>
          </div>
        </div>
      )}

      {/* Scanned list */}
      {scanned.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
          <ScanLine size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div>Nenhum artigo lido ainda.</div>
        </div>
      ) : (
        (() => {
          const showPO2 = compareWith === 'po2' || compareWith === 'both';
          const showPO3 = compareWith === 'po3' || compareWith === 'both';
          // Build column template: EAN | Descrição | Unidade | [PO2] | [PO3] | Hora
          const cols = ['140px', '1fr', '60px'];
          if (showPO2) cols.push('70px');
          if (showPO3) cols.push('70px');
          cols.push('100px');
          const gridTemplate = cols.join(' ');
          return (
            <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: gridTemplate,
                gap: 8, padding: '8px 12px', background: T.bgEl,
                borderBottom: `1px solid ${T.line}`, fontSize: 11, fontWeight: 600,
                color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                <div>EAN</div>
                <div>Descrição</div>
                <div style={{ textAlign: 'center' }}>Unidade</div>
                {showPO2 && <div style={{ textAlign: 'right', color: T.cyan }}>PO2</div>}
                {showPO3 && <div style={{ textAlign: 'right', color: T.cyan }}>PO3</div>}
                <div style={{ textAlign: 'right' }}>Hora</div>
              </div>
              {scanned.map((s, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: gridTemplate,
                  gap: 8, padding: '9px 12px', alignItems: 'center',
                  borderBottom: i < scanned.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
                  background: !s.found ? `${T.accent}08` : i === 0 ? `${T.green}08` : 'transparent',
                  borderLeft: `3px solid ${!s.found ? T.accent : T.green}`,
                }}>
                  <div style={{ fontSize: 12, fontFamily: 'Geist Mono, monospace', color: T.ink }}>{s.ean}</div>
                  <div>
                    {s.descr ? (
                      <>
                        <div style={{ fontSize: 12, color: T.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.descr}</div>
                        <div style={{ fontSize: 10, color: T.inkMute, marginTop: 1 }}>{[s.family, s.subfamily].filter(Boolean).join(' › ')}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: T.accent, fontStyle: 'italic' }}>Não encontrado</div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'center', fontSize: 14, fontWeight: 700,
                    color: T.green, fontFamily: 'Geist Mono, monospace',
                  }}>+1</div>
                  {showPO2 && <div style={{ textAlign: 'right', fontSize: 13, fontWeight: s.po2 ? 700 : 400, color: s.po2 ? T.ink : T.inkMute, fontFamily: 'Geist Mono, monospace' }}>{s.po2 ?? '—'}</div>}
                  {showPO3 && <div style={{ textAlign: 'right', fontSize: 13, fontWeight: s.po3 ? 700 : 400, color: s.po3 ? T.ink : T.inkMute, fontFamily: 'Geist Mono, monospace' }}>{s.po3 ?? '—'}</div>}
                  <div style={{ textAlign: 'right', fontSize: 11, color: T.inkMute, fontFamily: 'Geist Mono, monospace' }}>{s.ts.toLocaleTimeString('pt-PT')}</div>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CalendarView — month-grid view of all campaign periods over time
// ─────────────────────────────────────────────────────────────────────────
function CalendarView({ periods = [], campaigns = [], onEnterPeriod }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthLabel = cursor.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Monday=0 .. Sunday=6
  const startWeekday = (firstDay.getDay() + 6) % 7;

  // Filter periods that overlap with current month
  const monthStart = firstDay.getTime();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).getTime();
  const visiblePeriods = useMemo(() => {
    return (periods || []).filter(p => {
      if (!p.startDate || !p.endDate) return false;
      const ps = new Date(p.startDate).getTime();
      const pe = new Date(p.endDate).getTime();
      return pe >= monthStart && ps <= monthEnd;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [periods, monthStart, monthEnd]);

  const STATUS_COLOR = { planned: T.blue, active: T.green, finished: T.inkMute };
  const STATUS_LABEL = { planned: 'Planeado', active: 'Em curso', finished: 'Terminado' };

  // Build cells array: 6 weeks x 7 days = 42 cells
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const isToday = (d) => {
    if (!d) return false;
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  const periodsForDay = (day) => {
    if (!day) return [];
    const t = day.getTime();
    return visiblePeriods.filter(p => {
      const ps = new Date(p.startDate).setHours(0, 0, 0, 0);
      const pe = new Date(p.endDate).setHours(23, 59, 59, 999);
      return t >= ps && t <= pe;
    });
  };

  const navMonth = (delta) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="fade-up">
      <Header eyebrow="Linha do tempo" title="Calendário" subtitle="Vista mensal de todos os períodos de campanha. Clica num bloco para entrar nessa campanha." />

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navMonth(-1)} style={navBtnStyle}><ArrowLeft size={14} /></button>
        <div className="display" style={{ fontSize: 22, fontStyle: 'italic', textTransform: 'capitalize', minWidth: 220 }}>{monthLabel}</div>
        <button onClick={() => navMonth(1)} style={navBtnStyle}><ArrowRight size={14} /></button>
        <button onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} style={{ ...navBtnStyle, fontSize: 11, padding: '6px 12px' }}>Hoje</button>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: T.inkMute }}>
          {visiblePeriods.length} período{visiblePeriods.length === 1 ? '' : 's'} neste mês
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: T.bgEl, borderBottom: `1px solid ${T.line}` }}>
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
            <div key={d} style={{ padding: '10px 8px', fontSize: 10, fontWeight: 600, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, i) => {
            const periodsHere = periodsForDay(day);
            const today = isToday(day);
            return (
              <div key={i} style={{
                minHeight: 110, padding: 6,
                borderRight: (i + 1) % 7 !== 0 ? `1px solid ${T.lineSoft}` : 'none',
                borderBottom: i < 35 ? `1px solid ${T.lineSoft}` : 'none',
                background: today ? `${T.accent}08` : (day ? T.paper : T.bgEl),
              }}>
                {day && (
                  <>
                    <div style={{
                      fontSize: 11, fontWeight: today ? 700 : 500,
                      color: today ? T.accent : T.inkSoft,
                      marginBottom: 4,
                    }}>
                      {day.getDate()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {periodsHere.slice(0, 3).map(p => {
                        const status = periodStatus(p);
                        const color = STATUS_COLOR[status];
                        const campCount = (campaigns || []).filter(c => c.periodId === p.id).length;
                        return (
                          <button
                            key={p.id}
                            onClick={() => onEnterPeriod && onEnterPeriod(p.id)}
                            title={`${p.name} · ${STATUS_LABEL[status]} · ${campCount} ficheiro${campCount === 1 ? '' : 's'}`}
                            style={{
                              padding: '3px 6px', fontSize: 10,
                              background: color, color: '#fff', borderRadius: 3,
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontWeight: 500,
                            }}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                      {periodsHere.length > 3 && (
                        <div style={{ fontSize: 9, color: T.inkMute, fontStyle: 'italic', paddingLeft: 4 }}>
                          +{periodsHere.length - 3} mais
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 11, color: T.inkSoft, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>Estado:</span>
        {[['planned', 'Planeado'], ['active', 'Em curso'], ['finished', 'Terminado']].map(([k, l]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: STATUS_COLOR[k], borderRadius: 2 }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

const navBtnStyle = {
  padding: '7px 10px', background: 'transparent', color: T.ink,
  border: `1px solid ${T.line}`, borderRadius: 6, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
};

// Full-page notes view (accessible via sidebar)
function NotesView({ notes, setNotes }) {
  const textareaRef = useRef();

  // Insert tab character on Tab key (instead of changing focus)
  const handleKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const t = e.target;
      const start = t.selectionStart;
      const end = t.selectionEnd;
      const newValue = notes.substring(0, start) + '  ' + notes.substring(end);
      setNotes(newValue);
      // Restore cursor position after React updates
      setTimeout(() => {
        t.selectionStart = t.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="fade-up">
      <Header
        eyebrow="Caderno de Notas"
        title="Notas"
        subtitle="Apontamentos, lembretes, observações por campanha. Guardado automaticamente neste dispositivo. Inclui-se no backup quando exportas a sessão."
      />

      <div style={{
        background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        minHeight: '70vh',
      }}>
        <NotesToolbar notes={notes} setNotes={setNotes} />
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Começa a escrever… as tuas notas são guardadas automaticamente neste dispositivo.&#10;&#10;Usa o botão 'Data/Hora' para marcar entradas no tempo, e 'Descarregar' para guardar uma cópia em ficheiro."
          style={{
            flex: 1, width: '100%', minHeight: '60vh',
            padding: '20px 24px', fontSize: 14, lineHeight: 1.7,
            background: T.paper, color: T.ink,
            border: 'none', outline: 'none',
            resize: 'none', fontFamily: "'Geist Mono', monospace",
          }}
        />
      </div>
    </div>
  );
}

// Quick side panel (accessible from any page via floating button)
function NotesPanel({ notes, setNotes, onClose, onOpenFull }) {
  const textareaRef = useRef();
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Subtle backdrop click-to-close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.15)',
          zIndex: 95, animation: 'fadeUp 0.15s ease-out',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 88, right: 24, zIndex: 96,
        width: 'min(420px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 120px)',
        background: T.bg, borderRadius: 10,
        border: `1px solid ${T.line}`,
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.18s ease-out',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: T.bgEl, borderBottom: `1px solid ${T.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotebookPen size={14} style={{ color: T.accent }} />
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase' }}>
              Notas rápidas
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={onOpenFull}
              title="Abrir em ecrã inteiro"
              style={{
                padding: '4px 8px', fontSize: 10, fontWeight: 500,
                background: 'transparent', color: T.inkSoft,
                border: `1px solid ${T.line}`, borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Eye size={11} /> Expandir
            </button>
            <button
              onClick={onClose}
              style={{
                padding: 5, background: 'transparent', color: T.inkMute,
                border: 'none', borderRadius: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <NotesToolbar notes={notes} setNotes={setNotes} compact />
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Aponta aqui…"
          style={{
            flex: 1, width: '100%', minHeight: 280,
            padding: '14px 16px', fontSize: 13, lineHeight: 1.6,
            background: T.paper, color: T.ink,
            border: 'none', outline: 'none',
            resize: 'none', fontFamily: "'Geist Mono', monospace",
          }}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Blueprint — visual overview of store mobiliário with assignment status
// Shows: floors, zones grouped by floor, fill state per zone (color-coded),
// and miniature cards for assigned products inside each zone.
// Pulls data from currently loaded campaigns (combines all of them).
// ─────────────────────────────────────────────────────────────────────────

// Generate a deterministic color from a string (for product placeholder accent)
function hashColor(str) {
  if (!str) return '#999';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  const hues = [10, 25, 40, 60, 90, 130, 170, 200, 230, 260, 290, 320, 350];
  const hue = hues[Math.abs(h) % hues.length];
  return `hsl(${hue}, 55%, 50%)`;
}

// Try to find an image URL column in campaign rows (heuristic; usually absent)
function findImageColumn(headers) {
  if (!headers) return null;
  return headers.find(h => /^(imagem|image|foto|photo|url.?img|picture|thumb)/i.test(h)) || null;
}

// Compute combined floors with all assigned slots from all campaigns
// Returns: [{ floor, zones: [{ zone, slots, productInfo: [...] }] }]
function buildBlueprint(campaigns, defaultLayout) {
  // Start with defaultLayout structure (zones)
  const base = (defaultLayout || []).map(f => ({
    ...f,
    zones: f.zones.map(z => ({ ...z, slots: [] })),
  }));

  // Build EAN → product details lookup from all campaigns
  const productsByEan = new Map();
  campaigns.forEach(camp => {
    if (!camp.rows) return;
    const cols = detectColumns(camp.headers || []);
    const imgCol = findImageColumn(camp.headers || []);
    camp.rows.forEach(r => {
      const ean = String(r[cols.ean] ?? '').trim();
      const key = normalizeEAN(ean);
      if (!key || productsByEan.has(key)) return;
      const basePriceVal = parseNum(cols.basePrice ? r[cols.basePrice] : 0);
      const campPriceVal = parseNum(cols.campaignPrice ? r[cols.campaignPrice] : 0);
      productsByEan.set(key, {
        ean,
        eanKey: key,
        family: cols.family ? String(r[cols.family] ?? '').trim() : '',
        description: cols.description ? String(r[cols.description] ?? '').trim() : '',
        basePrice: basePriceVal,
        campaignPrice: campPriceVal,
        imageUrl: imgCol ? String(r[imgCol] ?? '').trim() : '',
        campaignName: camp.name,
        isStar: cols.star ? isStarValue(r[cols.star]) : false,
      });
    });
  });

  // Aggregate slots from all campaigns into the base layout (using campaigns' floors)
  campaigns.forEach(camp => {
    if (!camp.floors) return;
    camp.floors.forEach(f => {
      const baseFloor = base.find(bf => bf.id === f.id);
      if (!baseFloor) return;
      f.zones.forEach(z => {
        const baseZone = baseFloor.zones.find(bz => bz.id === z.id);
        if (!baseZone) return;
        z.slots.forEach(s => {
          const refKey = normalizeEAN(s.ref);
          if (!refKey) return;
          if (baseZone.slots.some(bs => normalizeEAN(bs.ref) === refKey)) return;
          const product = productsByEan.get(refKey);
          baseZone.slots.push({
            ...s,
            product,
            sourceCampaign: camp.name,
          });
        });
      });
    });
  });

  return base;
}

function BlueprintPanel({ campaigns, defaultLayout, onClose }) {
  const [expandedZone, setExpandedZone] = useState(null); // zoneId of detail open
  const [filterFloor, setFilterFloor] = useStoredState('blueprint.filterFloor', 'all');
  const [filterStatus, setFilterStatus] = useStoredState('blueprint.filterStatus', 'all'); // all | filled | empty | partial

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const blueprint = useMemo(
    () => buildBlueprint(campaigns, defaultLayout),
    [campaigns, defaultLayout]
  );

  // Compute global stats
  const stats = useMemo(() => {
    let totalZones = 0;
    let filledZones = 0;
    let emptyZones = 0;
    let totalSlots = 0;
    const conflictsByEan = new Map();
    blueprint.forEach(f => {
      f.zones.forEach(z => {
        totalZones++;
        if (z.slots.length === 0) emptyZones++;
        else filledZones++;
        totalSlots += z.slots.length;
        z.slots.forEach(s => {
          const k = normalizeEAN(s.ref);
          if (!k) return;
          conflictsByEan.set(k, (conflictsByEan.get(k) || 0) + 1);
        });
      });
    });
    const conflicts = [...conflictsByEan.entries()].filter(([_, n]) => n > 1).length;
    return { totalZones, filledZones, emptyZones, totalSlots, conflicts };
  }, [blueprint]);

  // Apply filters
  const filteredBlueprint = useMemo(() => {
    return blueprint
      .filter(f => filterFloor === 'all' || f.id === filterFloor)
      .map(f => ({
        ...f,
        zones: f.zones.filter(z => {
          if (filterStatus === 'filled' && z.slots.length === 0) return false;
          if (filterStatus === 'empty' && z.slots.length > 0) return false;
          return true;
        }),
      }));
  }, [blueprint, filterFloor, filterStatus]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)',
        zIndex: 95, animation: 'fadeUp 0.15s ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 24, right: 24, bottom: 24, zIndex: 96,
        width: 'min(880px, calc(100vw - 48px))',
        background: T.bg, borderRadius: 12,
        border: `1px solid ${T.line}`,
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.18s ease-out',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', background: T.bgEl, borderBottom: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
              Vista da loja
            </div>
            <h3 className="display" style={{ fontSize: 24, margin: 0, fontStyle: 'italic' }}>Blueprint</h3>
          </div>
          <button onClick={onClose} style={{
            padding: 6, background: 'transparent', border: 'none', color: T.inkMute, borderRadius: 4,
          }}><X size={18} /></button>
        </div>

        {/* Stats bar */}
        <div style={{
          padding: '14px 24px', background: T.bg, borderBottom: `1px solid ${T.lineSoft}`,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        }}>
          <BPStat label="Móveis" value={stats.totalZones} />
          <BPStat label="Em uso" value={stats.filledZones} accent={T.green} />
          <BPStat label="Vazios" value={stats.emptyZones} accent={stats.emptyZones > 0 ? T.orange : T.inkMute} />
          <BPStat label="Produtos" value={stats.totalSlots} accent={T.accent} />
        </div>

        {/* Filters */}
        <div style={{
          padding: '10px 20px', borderBottom: `1px solid ${T.line}`,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span className="mono" style={{ fontSize: 9, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Piso:</span>
          <button onClick={() => setFilterFloor('all')} style={chipBtn(filterFloor === 'all')}>Todos</button>
          {blueprint.map(f => (
            <button key={f.id} onClick={() => setFilterFloor(f.id)} style={chipBtn(filterFloor === f.id, f.color)}>
              {f.name}
            </button>
          ))}
          <span style={{ width: 1, height: 16, background: T.line, margin: '0 4px' }} />
          <span className="mono" style={{ fontSize: 9, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estado:</span>
          {[
            { id: 'all', l: 'Todos' },
            { id: 'filled', l: 'Com produtos' },
            { id: 'empty', l: 'Vazios' },
          ].map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)} style={chipBtn(filterStatus === s.id)}>
              {s.l}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {campaigns.length === 0 ? (
            <div style={{
              padding: 60, textAlign: 'center', color: T.inkMute,
            }}>
              <MapPin size={32} strokeWidth={1.25} style={{ opacity: 0.5, marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, marginBottom: 4 }}>Sem campanhas carregadas</div>
              <div style={{ fontSize: 12 }}>
                Carrega campanhas em "Campanhas" para ver os móveis com produtos atribuídos.
              </div>
            </div>
          ) : filteredBlueprint.every(f => f.zones.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
              Sem móveis para os filtros atuais.
            </div>
          ) : filteredBlueprint.map(floor => floor.zones.length > 0 && (
            <BPFloor
              key={floor.id}
              floor={floor}
              expandedZone={expandedZone}
              setExpandedZone={setExpandedZone}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function BPStat({ label, value, accent }) {
  return (
    <div style={{
      padding: '8px 12px', background: T.bgEl, borderRadius: 6,
      border: `1px solid ${T.line}`,
    }}>
      <div className="mono" style={{ fontSize: 8, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>{label}</div>
      <div className="display" style={{
        fontSize: 22, lineHeight: 1, fontStyle: 'italic',
        color: accent || T.ink, marginTop: 3,
      }}>
        {value.toLocaleString('pt-PT')}
      </div>
    </div>
  );
}

function chipBtn(active, accentColor) {
  return {
    padding: '4px 10px', fontSize: 10, fontWeight: 500,
    background: active ? (accentColor || T.ink) : 'transparent',
    color: active ? '#fff' : T.inkSoft,
    border: `1px solid ${active ? (accentColor || T.ink) : T.line}`,
    borderRadius: 4, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

function BPFloor({ floor, expandedZone, setExpandedZone }) {
  const filledCount = floor.zones.filter(z => z.slots.length > 0).length;
  const totalCount = floor.zones.length;
  const slotCount = floor.zones.reduce((s, z) => s + z.slots.length, 0);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Floor header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        paddingBottom: 8, borderBottom: `2px solid ${floor.color}`,
      }}>
        <div style={{
          width: 6, height: 24, background: floor.color, borderRadius: 1,
        }} />
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase' }}>Piso</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{floor.name}</div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: T.inkSoft, textAlign: 'right' }}>
          {filledCount}/{totalCount} móveis · {slotCount} produtos
        </div>
      </div>

      {/* Zone grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10,
      }}>
        {floor.zones.map(zone => (
          <BPZone
            key={zone.id}
            zone={zone}
            floorColor={floor.color}
            expanded={expandedZone === zone.id}
            onToggleExpand={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BPZone({ zone, floorColor, expanded, onToggleExpand }) {
  const count = zone.slots.length;
  // Visual fill state — pure cosmetic (we don't know "expected" capacity)
  const isEmpty = count === 0;
  const isPartial = count > 0 && count < 4;
  const isFilled = count >= 4;

  const stateColor = isEmpty ? T.inkMute : (isPartial ? T.orange : T.green);
  const stateBg = isEmpty ? T.bgEl : (isPartial ? '#FFF5E6' : '#E8F4E5');
  const stateLabel = isEmpty ? 'Vazio' : (isPartial ? `${count} ${count === 1 ? 'produto' : 'produtos'}` : `${count} produtos`);

  return (
    <div style={{
      background: T.paper,
      border: `1px solid ${expanded ? T.accent : T.line}`,
      borderLeft: `3px solid ${floorColor}`,
      borderRadius: 6,
      overflow: 'hidden',
      transition: 'all 0.15s',
    }}>
      <button
        onClick={onToggleExpand}
        style={{
          width: '100%', textAlign: 'left',
          padding: '10px 12px',
          background: 'transparent', border: 'none',
          cursor: count > 0 ? 'pointer' : 'default',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: T.ink,
            flex: 1, lineHeight: 1.3,
          }}>
            {zone.name}
          </div>
          {count > 0 && (
            <ChevronRight
              size={14}
              style={{
                color: T.inkMute, flexShrink: 0,
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}
            />
          )}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 6px', background: stateBg, color: stateColor,
          borderRadius: 3, fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
          fontFamily: 'Geist Mono', textTransform: 'uppercase',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: stateColor,
          }} />
          {stateLabel}
        </div>
      </button>

      {/* Mini preview — first 4 products always visible (now showing EAN + name) */}
      {count > 0 && !expanded && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {zone.slots.slice(0, 4).map((s, i) => (
            <BPSlotMini key={i} slot={s} />
          ))}
          {count > 4 && (
            <div style={{
              padding: '3px 8px', fontSize: 10, fontFamily: 'Geist Mono',
              color: T.inkMute, fontStyle: 'italic',
            }}>
              + {count - 4} {count - 4 === 1 ? 'artigo' : 'artigos'}…
            </div>
          )}
        </div>
      )}

      {/* Expanded — full list */}
      {expanded && count > 0 && (
        <div style={{
          padding: '4px 8px 10px',
          borderTop: `1px solid ${T.lineSoft}`,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {zone.slots.map((s, i) => (
            <BPSlotFull key={i} slot={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny inline product card — used for the always-visible preview
function BPSlotMini({ slot }) {
  const p = slot.product;
  const color = hashColor(p?.eanKey || slot.ref);
  const ean = String(slot.ref || '').trim();
  const eanShort = ean.length > 13 ? ean.slice(-13) : ean;
  const name = p?.description || '';
  const nameShort = name.length > 30 ? name.slice(0, 30) + '…' : name;
  return (
    <div
      title={`${name || 'Sem descrição'} · ${ean}`}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '4px 8px', borderRadius: 4,
        background: T.paper,
        border: `1px solid ${T.lineSoft}`,
        borderLeft: `3px solid ${color}`,
        fontFamily: 'Geist Mono, monospace',
        fontSize: 10, lineHeight: 1.3,
        minWidth: 0, maxWidth: 240,
        gap: 1,
      }}
    >
      <span style={{
        color: T.ink, fontWeight: 500, fontFamily: 'Geist, sans-serif',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontSize: 11,
      }}>
        {nameShort || <span style={{ color: T.inkMute, fontStyle: 'italic' }}>sem dados</span>}
      </span>
      <span style={{
        color: T.inkMute, fontSize: 9,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {eanShort || '—'}
        {p?.isStar && <Star size={8} fill={T.yellow} stroke="none" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
      </span>
    </div>
  );
}

// Larger product row — used in expanded view
function BPSlotFull({ slot }) {
  const p = slot.product;
  const letter = (p?.description || slot.ref || '?').charAt(0).toUpperCase();
  const color = hashColor(p?.eanKey || slot.ref);
  const hasImage = p?.imageUrl && /^https?:\/\//.test(p.imageUrl);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 6px', borderRadius: 4,
      background: T.bg,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 4,
        background: hasImage ? T.lineSoft : color,
        color: '#fff', fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Geist Mono', flexShrink: 0,
        backgroundImage: hasImage ? `url(${p.imageUrl})` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {!hasImage && letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 500, color: T.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {p?.description || <span style={{ color: T.inkMute, fontStyle: 'italic' }}>Sem dados</span>}
        </div>
        <div className="mono" style={{
          fontSize: 9, color: T.inkMute, marginTop: 1,
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <span>{slot.ref || '—'}</span>
          {p?.campaignPrice > 0 && (
            <>
              <span>·</span>
              <span style={{ color: T.accent, fontWeight: 600 }}>
                €{p.campaignPrice.toFixed(2).replace('.', ',')}
              </span>
            </>
          )}
          {p?.isStar && <Star size={9} fill={T.yellow} stroke="none" />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AdminView — administration panel (only visible to admins)
// Tabs: Utilizadores | Atividade | Configuração | Estatísticas
// ─────────────────────────────────────────────────────────────────────────
function AdminView({ user, uiConfig, setUIConfig }) {
  const [tab, setTab] = useStoredState('admin.tab', 'users');

  return (
    <div className="fade-up">
      <Header
        eyebrow={<><Shield size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Admin</>}
        title="Administração"
        subtitle="Gestão de utilizadores, configuração da interface e histórico de atividades. Só visível para administradores."
      />

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, marginBottom: 24,
        background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8,
        width: 'fit-content',
      }}>
        {[
          { id: 'users', label: 'Utilizadores', icon: Users },
          { id: 'activity', label: 'Atividade', icon: Activity },
          { id: 'zones', label: 'Zonas Cartazes', icon: MapPin },
          { id: 'emails', label: 'Emails', icon: Inbox },
          { id: 'config', label: 'Configuração', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6,
              background: active ? T.ink : 'transparent',
              color: active ? T.bg : T.inkSoft,
              border: 'none', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'users' && <AdminUsersTab currentUserId={user?.id} currentUserEmail={user?.email} />}
      {tab === 'activity' && <AdminActivityTab currentUserId={user?.id} />}
      {tab === 'zones' && <AdminPosterZonesTab currentUserId={user?.id} />}
      {tab === 'emails' && <AdminEmailsTab currentUserId={user?.id} />}
      {tab === 'config' && <AdminConfigTab uiConfig={uiConfig} setUIConfig={setUIConfig} currentUserId={user?.id} />}
    </div>
  );
}

// ─── Users tab — list with online status, suspend/admin actions ──────────
function AdminUsersTab({ currentUserId, currentUserEmail }) {
  const [profiles, setProfiles] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | online | offline | admin | suspended
  const [now, setNow] = useState(Date.now());

  // Tick the clock every 15s for real-time online indicator
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(i);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, a] = await Promise.all([fetchAllProfiles(), fetchAllAdmins()]);
    setProfiles(p);
    setAdmins(a);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  // Auto-refresh every 60s
  useEffect(() => {
    const i = setInterval(() => refresh(), 60000);
    return () => clearInterval(i);
  }, [refresh]);

  const adminIds = useMemo(() => new Set(admins.map(a => a.user_id)), [admins]);

  const isUserOnline = (lastSeen) => {
    if (!lastSeen) return false;
    return now - new Date(lastSeen).getTime() < 2 * 60 * 1000; // 2 min
  };

  const enriched = useMemo(() => profiles.map(p => ({
    ...p,
    isAdmin: adminIds.has(p.user_id),
    online: isUserOnline(p.last_seen_at),
  })), [profiles, adminIds, now]);

  const filtered = useMemo(() => enriched.filter(u => {
    if (filter === 'online') return u.online;
    if (filter === 'offline') return !u.online;
    if (filter === 'admin') return u.isAdmin;
    if (filter === 'suspended') return u.suspended;
    return true;
  }), [enriched, filter]);

  const onlineCount = enriched.filter(u => u.online).length;

  const handleToggleAdmin = async (u) => {
    if (u.user_id === currentUserId) {
      alert('Não podes remover-te a ti próprio dos admins.');
      return;
    }
    if (u.isAdmin) {
      if (!confirm(`Revogar admin de ${u.email}?`)) return;
      const res = await revokeAdmin(u.user_id);
      if (res.ok) {
        await logActivity({
          userId: currentUserId, userEmail: currentUserEmail,
          action: 'update', resourceType: 'admin',
          resourceId: u.user_id, resourceName: u.email,
          metadata: { revoked: true },
        });
        refresh();
      } else alert('Erro: ' + res.error);
    } else {
      if (!confirm(`Conceder admin a ${u.email}?\n\nEste utilizador passará a ter acesso total à aplicação.`)) return;
      const res = await grantAdmin(u.user_id, u.email, currentUserId);
      if (res.ok) {
        await logActivity({
          userId: currentUserId, userEmail: currentUserEmail,
          action: 'update', resourceType: 'admin',
          resourceId: u.user_id, resourceName: u.email,
          metadata: { granted: true },
        });
        refresh();
      } else alert('Erro: ' + res.error);
    }
  };

  const handleToggleSuspend = async (u) => {
    if (u.user_id === currentUserId) {
      alert('Não podes suspender-te a ti próprio.');
      return;
    }
    const next = !u.suspended;
    if (!confirm(next ? `Suspender ${u.email}?` : `Reativar ${u.email}?`)) return;
    const res = await setUserSuspended(u.user_id, next);
    if (res.ok) {
      await logActivity({
        userId: currentUserId, userEmail: currentUserEmail,
        action: 'update', resourceType: 'user',
        resourceId: u.user_id, resourceName: u.email,
        metadata: { suspended: next },
      });
      refresh();
    } else alert('Erro: ' + res.error);
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <AdminStatCard label="Total" value={enriched.length} />
        <AdminStatCard label="Online agora" value={onlineCount} accent={T.green} />
        <AdminStatCard label="Admins" value={admins.length} accent={T.accent} />
        <AdminStatCard label="Suspensos" value={enriched.filter(u => u.suspended).length} accent={enriched.filter(u => u.suspended).length > 0 ? T.red : T.inkMute} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, padding: 4, marginBottom: 16, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, width: 'fit-content' }}>
        {[
          { id: 'all', l: 'Todos' },
          { id: 'online', l: 'Online agora' },
          { id: 'offline', l: 'Offline' },
          { id: 'admin', l: 'Admins' },
          { id: 'suspended', l: 'Suspensos' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 12px', fontSize: 11, borderRadius: 4, border: 'none',
            background: filter === f.id ? T.ink : 'transparent',
            color: filter === f.id ? T.bg : T.inkSoft, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{f.l}</button>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>A carregar utilizadores…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>Sem utilizadores para este filtro.</div>
      ) : (
        <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {filtered.map((u, idx) => (
            <UserRow
              key={u.user_id}
              user={u}
              isCurrent={u.user_id === currentUserId}
              isLast={idx === filtered.length - 1}
              onToggleAdmin={() => handleToggleAdmin(u)}
              onToggleSuspend={() => handleToggleSuspend(u)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, isCurrent, isLast, onToggleAdmin, onToggleSuspend }) {
  const lastSeen = user.last_seen_at ? new Date(user.last_seen_at) : null;
  const lastSeenText = !lastSeen ? 'nunca'
    : user.online ? 'online agora'
    : (Date.now() - lastSeen.getTime() < 60 * 60 * 1000)
      ? `há ${Math.round((Date.now() - lastSeen.getTime()) / 60000)} min`
      : lastSeen.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : `1px solid ${T.lineSoft}`,
      background: user.suspended ? '#FFF5F5' : 'transparent',
    }}>
      {/* Online indicator */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: user.online ? T.green : T.lineSoft,
        flexShrink: 0,
      }} title={user.online ? 'Online agora' : 'Offline'} />

      {/* User info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: T.ink,
          }}>
            {user.email}
          </span>
          {isCurrent && (
            <span style={{
              fontSize: 9, padding: '1px 5px', background: T.lineSoft,
              color: T.inkSoft, borderRadius: 2, fontWeight: 600, letterSpacing: '0.05em',
              fontFamily: 'Geist Mono', textTransform: 'uppercase',
            }}>tu</span>
          )}
          {user.isAdmin && (
            <span style={{
              fontSize: 9, padding: '1px 5px', background: T.accent,
              color: '#fff', borderRadius: 2, fontWeight: 600, letterSpacing: '0.05em',
              fontFamily: 'Geist Mono', textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Shield size={8} /> ADMIN
            </span>
          )}
          {user.suspended && (
            <span style={{
              fontSize: 9, padding: '1px 5px', background: T.red,
              color: '#fff', borderRadius: 2, fontWeight: 600, letterSpacing: '0.05em',
              fontFamily: 'Geist Mono', textTransform: 'uppercase',
            }}>SUSPENSO</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 2, display: 'flex', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} /> {lastSeenText}
          </span>
          {user.role && user.role !== 'user' && (
            <span className="mono" style={{ textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.1em' }}>
              {user.role}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isCurrent && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onToggleSuspend}
            title={user.suspended ? 'Reativar' : 'Suspender'}
            style={adminActionBtn(user.suspended ? T.green : T.red)}
          >
            {user.suspended ? <Check size={11} /> : <ShieldOff size={11} />}
            {user.suspended ? 'Reativar' : 'Suspender'}
          </button>
          <button
            onClick={onToggleAdmin}
            title={user.isAdmin ? 'Revogar admin' : 'Conceder admin'}
            style={adminActionBtn(user.isAdmin ? T.inkMute : T.accent)}
          >
            {user.isAdmin ? <ShieldOff size={11} /> : <ShieldCheck size={11} />}
            {user.isAdmin ? 'Revogar' : 'Promover'}
          </button>
        </div>
      )}
    </div>
  );
}

function adminActionBtn(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 9px', fontSize: 10, fontWeight: 500,
    background: 'transparent', color: color || T.ink,
    border: `1px solid ${T.line}`, borderRadius: 4,
    cursor: 'pointer', fontFamily: 'inherit',
  };
}

function AdminStatCard({ label, value, accent }) {
  return (
    <div style={{ padding: 14, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase' }}>{label}</div>
      <div className="display" style={{ fontSize: 28, fontStyle: 'italic', lineHeight: 1, marginTop: 6, color: accent || T.ink }}>
        {value.toLocaleString('pt-PT')}
      </div>
    </div>
  );
}

// ─── Activity tab — chronological log of all actions ─────────────────────
function AdminActivityTab({ currentUserId }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | period | campaign | user | session
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchActivityLog({ limit: 500, sinceDays: 60 });
    setLog(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  // Auto-refresh every 30s
  useEffect(() => {
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, [refresh]);

  const filtered = useMemo(() => log.filter(e => {
    if (filter !== 'all' && e.resource_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(e.user_email || '').toLowerCase().includes(q) &&
          !(e.resource_name || '').toLowerCase().includes(q) &&
          !(e.action || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [log, filter, search]);

  const handleRevert = async (entry) => {
    if (!confirm(`Marcar esta ação como revertida?\n\n${entry.user_email}: ${entry.action} ${entry.resource_type} "${entry.resource_name || ''}"\n\nNota: isto apenas marca o registo como revertido — não desfaz automaticamente a alteração nos dados.`)) return;
    const res = await markActivityReverted(entry.id, currentUserId);
    if (res.ok) refresh();
    else alert('Erro: ' + res.error);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, flex: '1 1 240px', minWidth: 200 }}>
          <Search size={13} style={{ color: T.inkMute }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar utilizador, recurso, ação…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: T.ink }} />
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6 }}>
          {[
            { id: 'all', l: 'Todas' },
            { id: 'period', l: 'Campanhas' },
            { id: 'campaign', l: 'Excels' },
            { id: 'session', l: 'Sessões' },
            { id: 'admin', l: 'Admin' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '4px 10px', fontSize: 10, borderRadius: 4, border: 'none',
              background: filter === f.id ? T.ink : 'transparent',
              color: filter === f.id ? T.bg : T.inkSoft, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>{f.l}</button>
          ))}
        </div>
        <button onClick={refresh} style={adminActionBtn()}>
          <RotateCcw size={11} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>A carregar atividade…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>Sem atividade para mostrar.</div>
      ) : (
        <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {filtered.map((e, idx) => (
            <ActivityRow
              key={e.id}
              entry={e}
              isLast={idx === filtered.length - 1}
              onRevert={handleRevert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry, isLast, onRevert }) {
  const ts = new Date(entry.created_at);
  const timeText = ts.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const actionLabels = {
    create: { label: 'criou', color: T.green },
    update: { label: 'atualizou', color: T.accent },
    delete: { label: 'eliminou', color: T.red },
    upload: { label: 'carregou', color: T.green },
    assign: { label: 'atribuiu', color: T.accent },
    login: { label: 'entrou', color: T.inkMute },
    logout: { label: 'saiu', color: T.inkMute },
  };
  const meta = actionLabels[entry.action] || { label: entry.action, color: T.inkSoft };

  const resourceLabels = {
    period: 'campanha',
    campaign: 'Excel',
    slot: 'produto',
    zone: 'zona',
    session: 'sessão',
    admin: 'permissões',
    user: 'utilizador',
  };
  const resourceLabel = resourceLabels[entry.resource_type] || entry.resource_type;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      borderBottom: isLast ? 'none' : `1px solid ${T.lineSoft}`,
      opacity: entry.reverted ? 0.6 : 1,
      textDecoration: entry.reverted ? 'line-through' : 'none',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: meta.color, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
        <div style={{ color: T.ink }}>
          <strong>{entry.user_email || 'sistema'}</strong>{' '}
          <span style={{ color: meta.color, fontWeight: 500 }}>{meta.label}</span>{' '}
          {resourceLabel}
          {entry.resource_name && (
            <span style={{ color: T.ink, fontWeight: 500 }}> "{entry.resource_name}"</span>
          )}
          {entry.metadata?.alsoDeleteCampaigns && (
            <span style={{ fontSize: 10, color: T.red, marginLeft: 4 }}> (com Excels)</span>
          )}
          {entry.metadata?.granted && <span style={{ color: T.accent }}> ↑</span>}
          {entry.metadata?.revoked && <span style={{ color: T.inkMute }}> ↓</span>}
          {entry.metadata?.suspended === true && <span style={{ color: T.red }}> ✕</span>}
          {entry.metadata?.suspended === false && <span style={{ color: T.green }}> ✓</span>}
        </div>
        <div className="mono" style={{ fontSize: 9, color: T.inkMute, marginTop: 2, letterSpacing: '0.05em' }}>
          {timeText}
          {entry.reverted && <span style={{ color: T.red, marginLeft: 8 }}>· REVERTIDO</span>}
        </div>
      </div>
      {!entry.reverted && entry.action !== 'login' && entry.action !== 'logout' && (
        <button onClick={() => onRevert(entry)} title="Marcar como revertido" style={adminActionBtn()}>
          <RotateCcw size={10} /> Reverter
        </button>
      )}
    </div>
  );
}

// ─── Config tab — menu visibility per role ──────────────────────────────
function AdminConfigTab({ uiConfig, setUIConfig, currentUserId }) {
  const [draft, setDraft] = useState(() => {
    const cfg = uiConfig?.menu_visibility || {};
    const merged = {};
    Object.entries(DEFAULT_MENU_VISIBILITY).forEach(([id, def]) => {
      merged[id] = cfg[id] || { ...def };
    });
    return merged;
  });
  const [warnDays, setWarnDays] = useState(() => {
    const cfg = uiConfig?.global_settings?.warn_days_before_end;
    return Array.isArray(cfg) ? cfg.join(',') : '2,0';
  });
  const [emailsEnabled, setEmailsEnabled] = useState(() => {
    return uiConfig?.global_settings?.emails_enabled || false;
  });
  // Excluded families: start from uiConfig or the app default
  const [excludedFamsDraft, setExcludedFamsDraft] = useState(() => {
    const cfg = uiConfig?.global_settings?.excluded_families;
    return Array.isArray(cfg) ? cfg : [...DEFAULT_EXCLUDED_FAMILIES];
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // All known families = DEFAULT list (admin can add/remove from it)
  const ALL_KNOWN_FAMILIES = [
    ...DEFAULT_EXCLUDED_FAMILIES,
    // add any extra families found in the uiConfig that aren't in the default
    ...((uiConfig?.global_settings?.excluded_families || []).filter(f => !DEFAULT_EXCLUDED_FAMILIES.includes(f))),
  ];

  const ROLES = [
    { id: 'user', label: 'Utilizador' },
    { id: 'manager', label: 'Gestor' },
    { id: 'viewer', label: 'Visualizador' },
  ];

  const MENU_LABELS = {
    dashboard: { label: 'Visão Geral', icon: LayoutDashboard },
    sales: { label: 'Análise de Vendas', icon: BarChart3 },
    campaigns: { label: 'Campanhas', icon: Layers },
    calendar: { label: 'Calendário', icon: Calendar },
    changes: { label: 'Alterações', icon: GitCompareArrows },
    stock: { label: 'Stock', icon: Package },
    inventory: { label: 'Inventário', icon: ScanLine },
    images: { label: 'Folhetos', icon: ImageIcon },
    pdfs: { label: 'PDFs', icon: FileText },
    notes: { label: 'Notas', icon: NotebookPen },
  };

  const toggleVisible = (menuId) => {
    setDraft(d => ({
      ...d,
      [menuId]: { ...d[menuId], visible: !d[menuId].visible },
    }));
  };

  const toggleRole = (menuId, role) => {
    setDraft(d => {
      const cur = d[menuId].roles || [];
      const next = cur.includes(role) ? cur.filter(r => r !== role) : [...cur, role];
      return { ...d, [menuId]: { ...d[menuId], roles: next } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // Parse warn-days input: comma-separated integers
    const parsedWarnDays = warnDays
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 0);
    const globalSettings = {
      ...(uiConfig?.global_settings || {}),
      warn_days_before_end: parsedWarnDays.length > 0 ? parsedWarnDays : DEFAULT_WARN_DAYS,
      emails_enabled: emailsEnabled,
      excluded_families: excludedFamsDraft,
    };
    const res = await saveUIConfig(draft, currentUserId, globalSettings);
    if (res.ok) {
      setUIConfig(prev => ({ ...prev, menu_visibility: draft, global_settings: globalSettings }));
      setSavedAt(new Date());
      await logActivity({
        userId: currentUserId,
        action: 'update', resourceType: 'ui_config',
        resourceName: 'Configuração geral',
      });
    } else {
      alert('Erro a guardar: ' + res.error);
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Notifications config */}
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 10 }}>
          Notificações de fim de campanha
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 14, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
            <label>
              <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 6, fontWeight: 500 }}>
                Dias de antecedência para alertas
              </div>
              <input
                value={warnDays}
                onChange={e => setWarnDays(e.target.value)}
                placeholder="Ex: 2,0"
                style={dialogInput()}
              />
              <div style={{ fontSize: 10, color: T.inkMute, marginTop: 4, lineHeight: 1.4 }}>
                Lista separada por vírgulas. Por exemplo "2,0" envia aviso 2 dias antes e no próprio dia. "3,1,0" envia 3 dias antes, 1 dia antes e no dia. Apenas 0 envia só no dia.
              </div>
            </label>
          </div>
          <div style={{ padding: 14, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailsEnabled}
                onChange={e => setEmailsEnabled(e.target.checked)}
                style={{ accentColor: T.accent, marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, marginBottom: 4 }}>
                  Gerar emails automaticamente
                </div>
                <div style={{ fontSize: 10, color: T.inkMute, lineHeight: 1.4 }}>
                  Quando ativo, é gerado um email para cada utilizador FNAC Aveiro registado quando uma campanha está prestes a terminar e tem cartazes afixados. Os emails ficam na fila ("Emails" no admin) — vês o conteúdo e marcas como enviados manualmente, ou no futuro liga-se a um serviço de envio.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Excluded families */}
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 6 }}>
          Famílias excluídas da webapp
        </div>
        <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 10, lineHeight: 1.5 }}>
          Produtos destas famílias são ocultados em toda a app (campanhas, alterações, stock, auto-preenchimento). Por defeito excluem-se os <strong>Produtos Editoriais</strong> e <strong>Serviços</strong>. Desativa uma família para a tornar visível novamente.
        </div>
        <div style={{ padding: 14, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_KNOWN_FAMILIES.map(fam => {
              const isExcluded = excludedFamsDraft.includes(fam);
              return (
                <button
                  key={fam}
                  onClick={() => setExcludedFamsDraft(prev =>
                    isExcluded ? prev.filter(f => f !== fam) : [...prev, fam]
                  )}
                  style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 500, borderRadius: 6,
                    border: `1px solid ${isExcluded ? T.red : T.green}`,
                    background: isExcluded ? '#FEE7E5' : '#E5F4E5',
                    color: isExcluded ? T.red : '#2e7d32',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {isExcluded ? <X size={10} /> : <Check size={10} />}
                  {fam}
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{isExcluded ? 'excluída' : 'ativa'}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: T.inkMute }}>
            Clica numa família para alternar entre excluída (vermelho) e ativa (verde). Guarda para aplicar.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14, padding: '12px 16px', background: T.accentSoft, borderRadius: 6, fontSize: 12, color: T.ink, lineHeight: 1.5 }}>
        <strong>Visibilidade de menus por papel.</strong> Os administradores veem sempre tudo. Para cada menu, escolhe se está visível e que papéis têm acesso. As alterações aplicam-se imediatamente no próximo carregamento da app dos utilizadores.
      </div>

      <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
          padding: '10px 14px', background: T.lineSoft,
          fontSize: 9, fontWeight: 600, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: 'Geist Mono',
        }}>
          <div>Menu</div>
          <div style={{ width: 80, textAlign: 'center' }}>Visível</div>
          {ROLES.map(r => <div key={r.id} style={{ width: 90, textAlign: 'center' }}>{r.label}</div>)}
        </div>
        {Object.entries(MENU_LABELS).map(([id, info]) => {
          const Icon = info.icon;
          const cfg = draft[id] || { visible: true, roles: ['user'] };
          return (
            <div key={id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
              padding: '12px 14px', alignItems: 'center',
              borderTop: `1px solid ${T.lineSoft}`,
              background: !cfg.visible ? '#FFF8F5' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={14} style={{ color: cfg.visible ? T.ink : T.inkMute }} />
                <span style={{ fontSize: 13, color: cfg.visible ? T.ink : T.inkMute }}>{info.label}</span>
              </div>
              <div style={{ width: 80, textAlign: 'center' }}>
                <input type="checkbox" checked={cfg.visible} onChange={() => toggleVisible(id)} style={{ accentColor: T.accent, cursor: 'pointer' }} />
              </div>
              {ROLES.map(r => (
                <div key={r.id} style={{ width: 90, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={cfg.roles?.includes(r.id) || false}
                    onChange={() => toggleRole(id, r.id)}
                    disabled={!cfg.visible}
                    style={{ accentColor: T.accent, cursor: cfg.visible ? 'pointer' : 'not-allowed', opacity: cfg.visible ? 1 : 0.4 }}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '10px 18px', background: T.ink, color: T.bg,
          border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: saving ? 'wait' : 'pointer',
        }}>
          <Check size={14} /> {saving ? 'A guardar…' : 'Guardar configuração'}
        </button>
        {savedAt && (
          <span className="mono" style={{ fontSize: 10, color: T.green, letterSpacing: '0.05em' }}>
            Guardado em {savedAt.toLocaleTimeString('pt-PT')}
          </span>
        )}
      </div>

      <div style={{ marginTop: 32, padding: 20, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 10 }}>
          Sobre os papéis
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}><strong>Utilizador</strong> — papel padrão. Acesso normal à app.</p>
          <p style={{ margin: '0 0 8px' }}><strong>Gestor</strong> — papel intermédio (configurável).</p>
          <p style={{ margin: '0 0 8px' }}><strong>Visualizador</strong> — apenas consulta (configurável).</p>
          <p style={{ margin: '0 0 8px' }}><strong>Admin</strong> — acesso total a tudo, incluindo este painel. Atribui-se na aba Utilizadores.</p>
          <p style={{ margin: 0, fontSize: 11, color: T.inkMute, fontStyle: 'italic' }}>
            Para alterar o papel de um utilizador, vai à aba Utilizadores. Por agora, todos os utilizadores são "Utilizador" — os papéis Gestor/Visualizador são uma estrutura preparada para uso futuro.
          </p>
        </div>
      </div>

      {/* ── Reset local data ── */}
      <div style={{ marginTop: 24, padding: 20, background: `${T.accent}10`, border: `1px solid ${T.accent}40`, borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.accent, textTransform: 'uppercase', marginBottom: 8 }}>
          Zona de perigo
        </div>
        <p style={{ fontSize: 12, color: T.inkSoft, margin: '0 0 12px', lineHeight: 1.5 }}>
          <strong>Limpar dados locais</strong> — apaga o IndexedDB e as preferências do browser neste dispositivo.
          Os dados na cloud (campanhas, stock, períodos) mantêm-se intactos e são recarregados automaticamente após o reset.
          Útil quando a app fica bloqueada ou mostra dados corrompidos.
        </p>
        <button
          onClick={async () => {
            if (!confirm('Apagar todos os dados locais deste dispositivo? Os dados na cloud mantêm-se.')) return;
            await idbClear();
            ['stockMap.PO2', 'stockMap.PO3', 'importadas_period_id', 'default_layout', 'floors',
             'campaigns.selectedPeriodId', 'campaigns.activeIds', 'campaigns.mode',
             'listing.filterStock', 'listing.filterFamily', 'listing.search',
             'changes.newPeriodId', 'changes.comparePeriodId',
            ].forEach(k => storeDelete(k));
            window.location.reload();
          }}
          style={{
            padding: '8px 16px', background: T.accent, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RotateCcw size={13} /> Limpar dados locais e recarregar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// NotificationBanner — slim banner shown at top of main content area
// ─────────────────────────────────────────────────────────────────────────
function NotificationBanner({ notifications, onOpenPanel, onDismiss, onJumpToPeriod }) {
  if (!notifications || notifications.length === 0) return null;

  // Show only the most urgent notification in the banner; rest in the panel
  const top = notifications[0];
  const others = notifications.length - 1;

  const message = (() => {
    if (top.kind === 'period_overdue') {
      return `Campanha "${top.periodName}" terminou há ${Math.abs(top.daysLeft)} ${Math.abs(top.daysLeft) === 1 ? 'dia' : 'dias'}${top.postersToRemove > 0 ? ` — ${top.postersToRemove} ${top.postersToRemove === 1 ? 'cartaz por retirar' : 'cartazes por retirar'}` : ''}.`;
    }
    if (top.daysLeft === 0) {
      return `Campanha "${top.periodName}" termina HOJE${top.postersToRemove > 0 ? ` — ${top.postersToRemove} ${top.postersToRemove === 1 ? 'cartaz' : 'cartazes'} para retirar` : ''}.`;
    }
    return `Campanha "${top.periodName}" termina em ${top.daysLeft} ${top.daysLeft === 1 ? 'dia' : 'dias'}${top.postersToRemove > 0 ? ` — ${top.postersToRemove} ${top.postersToRemove === 1 ? 'cartaz para retirar' : 'cartazes para retirar'}` : ''}.`;
  })();

  const bg = top.severity === 'high' ? '#FDECEA' : '#FFF5E6';
  const fg = top.severity === 'high' ? '#A03028' : '#8C5A00';
  const icon = top.severity === 'high' ? AlertTriangle : Bell;
  const Icon = icon;

  return (
    <div className="no-print" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      background: bg, color: fg,
      border: `1px solid ${top.severity === 'high' ? '#F5C5BD' : '#F2D89F'}`,
      borderRadius: 8, marginBottom: 20, fontSize: 13,
      animation: 'fadeUp 0.25s ease-out',
    }}>
      <Icon size={16} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {message}
        {others > 0 && (
          <span style={{ marginLeft: 8, opacity: 0.75, fontSize: 12 }}>
            +{others} {others === 1 ? 'aviso' : 'avisos'}
          </span>
        )}
      </div>
      <button onClick={() => onJumpToPeriod(top.periodId)} style={{
        padding: '5px 10px', fontSize: 11, fontWeight: 600,
        background: fg, color: '#fff',
        border: 'none', borderRadius: 4, cursor: 'pointer',
      }}>Ver campanha</button>
      <button onClick={onOpenPanel} style={{
        padding: '5px 10px', fontSize: 11,
        background: 'transparent', color: fg,
        border: `1px solid ${fg}`, borderRadius: 4, cursor: 'pointer',
      }}>Ver todos</button>
      <button onClick={() => onDismiss(top.key)} title="Dispensar" style={{
        padding: 4, background: 'transparent', color: fg, border: 'none',
        borderRadius: 4, cursor: 'pointer',
      }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// NotificationPanel — slide-in panel with full list of alerts
// ─────────────────────────────────────────────────────────────────────────
function NotificationPanel({ notifications, periods, posters, onClose, onDismiss, onJumpToPeriod }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.35)',
        zIndex: 95, animation: 'fadeUp 0.15s ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 24, right: 24, bottom: 24, zIndex: 96,
        width: 'min(480px, calc(100vw - 48px))',
        background: T.bg, borderRadius: 12, border: `1px solid ${T.line}`,
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.18s ease-out',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', background: T.bgEl, borderBottom: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.red, textTransform: 'uppercase', marginBottom: 2 }}>
              Notificações
            </div>
            <h3 className="display" style={{ fontSize: 20, margin: 0, fontStyle: 'italic' }}>
              {notifications.length} {notifications.length === 1 ? 'aviso' : 'avisos'}
            </h3>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: 'transparent', color: T.inkMute, border: 'none', borderRadius: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
              Sem notificações.
            </div>
          ) : notifications.map(n => (
            <NotificationCard
              key={n.key}
              notif={n}
              onJump={() => onJumpToPeriod(n.periodId)}
              onDismiss={() => onDismiss(n.key)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function NotificationCard({ notif, onJump, onDismiss }) {
  const high = notif.severity === 'high';
  const overdue = notif.kind === 'period_overdue';

  const title = overdue
    ? `Terminou há ${Math.abs(notif.daysLeft)} ${Math.abs(notif.daysLeft) === 1 ? 'dia' : 'dias'}`
    : (notif.daysLeft === 0 ? 'Termina HOJE' : `Termina em ${notif.daysLeft} ${notif.daysLeft === 1 ? 'dia' : 'dias'}`);

  return (
    <div style={{
      padding: 14, background: high ? '#FDECEA' : '#FFF5E6',
      border: `1px solid ${high ? '#F5C5BD' : '#F2D89F'}`,
      borderRadius: 8, position: 'relative',
    }}>
      <button onClick={onDismiss} title="Dispensar" style={{
        position: 'absolute', top: 8, right: 8, padding: 4,
        background: 'transparent', color: T.inkMute, border: 'none', borderRadius: 4,
      }}><X size={12} /></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {high ? <AlertTriangle size={12} style={{ color: '#A03028' }} /> : <Bell size={12} style={{ color: '#8C5A00' }} />}
        <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: high ? '#A03028' : '#8C5A00', fontWeight: 600 }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, marginBottom: 6 }}>
        {notif.periodName}
      </div>
      {notif.postersToRemove > 0 ? (
        <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ClipboardList size={11} />
          {notif.postersToRemove} {notif.postersToRemove === 1 ? 'cartaz' : 'cartazes'} para retirar
        </div>
      ) : (
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 10 }}>
          Sem cartazes registados
        </div>
      )}
      <button onClick={onJump} style={{
        padding: '6px 12px', fontSize: 11, fontWeight: 500,
        background: T.ink, color: T.bg, border: 'none', borderRadius: 4,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <ArrowRight size={11} /> Abrir campanha
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PostersSection — UI to register and manage campaign posters
// ─────────────────────────────────────────────────────────────────────────
const POSTER_FORMATS = [
  { id: 'A3', label: 'A3' },
  { id: 'A4', label: 'A4' },
  { id: 'A5', label: 'A5' },
  { id: 'régua', label: 'Régua 18×6' },
  { id: 'etiqueta', label: 'Etiqueta 9×8' },
  { id: 'outro', label: 'Outro' },
];

const POSTER_STATUS = [
  { id: 'pending', label: 'A imprimir', color: '#888' },
  { id: 'printed', label: 'Impresso', color: '#5BAF66' },
  { id: 'posted', label: 'Afixado', color: '#E68A00' },
  { id: 'removed', label: 'Removido', color: '#999' },
];

function PostersSection({ period, posters, posterZones, user, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(null); // poster id being processed

  const totalActive = posters.filter(p => p.status !== 'removed').reduce((s, p) => s + (p.quantity || 1), 0);
  const totalRemoved = posters.filter(p => p.status === 'removed').reduce((s, p) => s + (p.quantity || 1), 0);

  const handleStatusChange = async (poster, newStatus) => {
    setBusy(poster.id);
    const res = await updatePosterStatus(poster.id, newStatus, user?.id);
    if (res.ok) {
      await logActivity({
        userId: user?.id, userEmail: user?.email,
        action: 'update', resourceType: 'poster',
        resourceId: poster.id, resourceName: `${poster.format} × ${poster.quantity}`,
        metadata: { status: newStatus, period: period.name },
      });
      onRefresh && await onRefresh();
    } else {
      alert('Erro: ' + res.error);
    }
    setBusy(null);
  };

  const handleDelete = async (poster) => {
    if (!confirm(`Eliminar este registo de cartaz?\n${poster.quantity} × ${poster.format}`)) return;
    setBusy(poster.id);
    const res = await deletePoster(poster.id);
    if (res.ok) {
      await logActivity({
        userId: user?.id, userEmail: user?.email,
        action: 'delete', resourceType: 'poster',
        resourceId: poster.id,
        metadata: { period: period.name },
      });
      onRefresh && await onRefresh();
    }
    setBusy(null);
  };

  return (
    <div className="no-print" style={{
      marginBottom: 20, padding: 16,
      background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <ClipboardList size={14} style={{ color: T.accent }} />
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase' }}>
          Cartazes
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.inkSoft }}>
          {totalActive} {totalActive === 1 ? 'cartaz afixado' : 'cartazes afixados'}
          {totalRemoved > 0 && <span style={{ color: T.inkMute, marginLeft: 6 }}>· {totalRemoved} retirados</span>}
        </span>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '6px 12px', fontSize: 11, fontWeight: 500,
          background: T.ink, color: T.bg, border: 'none', borderRadius: 5,
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
        }}>
          <Plus size={11} /> Adicionar cartaz
        </button>
      </div>

      {posters.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: T.inkMute, fontSize: 12, background: T.bg, borderRadius: 6 }}>
          Sem cartazes registados. Clica em "Adicionar cartaz" para começar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {posters.map(p => (
            <PosterRow
              key={p.id}
              poster={p}
              busy={busy === p.id}
              onStatusChange={(s) => handleStatusChange(p, s)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <PosterAddDialog
          period={period}
          posterZones={posterZones}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            const zone = posterZones.find(z => z.id === data.zoneId);
            const res = await createPoster({
              periodId: period.id,
              format: data.format,
              quantity: data.quantity,
              zoneId: data.zoneId || null,
              zoneLabel: zone?.name || null,
              status: data.status,
              notes: data.notes,
              createdBy: user?.id,
            });
            if (res.ok) {
              await logActivity({
                userId: user?.id, userEmail: user?.email,
                action: 'create', resourceType: 'poster',
                resourceId: res.data?.id, resourceName: `${data.quantity} × ${data.format}`,
                metadata: { period: period.name, zone: zone?.name },
              });
              setShowAdd(false);
              onRefresh && await onRefresh();
            } else {
              alert('Erro: ' + res.error);
            }
          }}
        />
      )}
    </div>
  );
}

function PosterRow({ poster, busy, onStatusChange, onDelete }) {
  const status = POSTER_STATUS.find(s => s.id === poster.status) || POSTER_STATUS[0];
  const formatLabel = POSTER_FORMATS.find(f => f.id === poster.format)?.label || poster.format;

  // Next status suggestion
  const nextStatus = poster.status === 'pending' ? 'printed'
    : poster.status === 'printed' ? 'posted'
    : poster.status === 'posted' ? 'removed' : null;
  const nextStatusLabel = POSTER_STATUS.find(s => s.id === nextStatus)?.label;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', background: T.bg,
      border: `1px solid ${T.lineSoft}`, borderRadius: 5,
      opacity: poster.status === 'removed' ? 0.6 : 1,
    }}>
      <div style={{ width: 4, height: 30, background: status.color, borderRadius: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: T.ink }}>{poster.quantity} ×</span>
          <span style={{ color: T.ink }}>{formatLabel}</span>
          {poster.zone_label && (
            <>
              <span style={{ color: T.inkMute }}>·</span>
              <span style={{ color: T.inkSoft }}>{poster.zone_label}</span>
            </>
          )}
        </div>
        <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2 }}>
          {poster.notes && <span style={{ marginRight: 6, fontStyle: 'italic' }}>{poster.notes}</span>}
        </div>
      </div>
      <span style={{
        padding: '3px 8px', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
        background: status.color, color: '#fff', borderRadius: 3,
        fontFamily: 'Geist Mono', textTransform: 'uppercase', flexShrink: 0,
      }}>
        {status.label}
      </span>
      {nextStatus && (
        <button
          onClick={() => onStatusChange(nextStatus)}
          disabled={busy}
          style={{
            padding: '4px 8px', fontSize: 10, fontWeight: 500,
            background: 'transparent', color: T.ink,
            border: `1px solid ${T.line}`, borderRadius: 4,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          → {nextStatusLabel}
        </button>
      )}
      <button onClick={onDelete} title="Eliminar" style={{
        padding: 4, background: 'transparent', color: T.inkMute, border: 'none', borderRadius: 4,
      }}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function PosterAddDialog({ period, posterZones, onClose, onSave }) {
  const [format, setFormat] = useState('A4');
  const [quantity, setQuantity] = useState(1);
  const [zoneId, setZoneId] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!format) return;
    if (quantity < 1) return;
    setBusy(true);
    await onSave({ format, quantity: Number(quantity), zoneId, status, notes });
    setBusy(false);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeUp 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 26,
        width: 'min(440px, 92vw)', border: `1px solid ${T.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
              Novo cartaz
            </div>
            <h3 className="display" style={{ fontSize: 20, margin: 0, fontStyle: 'italic' }}>
              Adicionar a "{period.name}"
            </h3>
          </div>
          <button onClick={onClose} style={{ padding: 4, background: 'transparent', color: T.inkMute, border: 'none' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, marginBottom: 12 }}>
          <label>
            <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Formato</div>
            <select value={format} onChange={e => setFormat(e.target.value)} style={dialogInput()}>
              {POSTER_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Quantidade</div>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} style={dialogInput()} />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Zona (opcional)
          </div>
          <select value={zoneId} onChange={e => setZoneId(e.target.value)} style={dialogInput()}>
            <option value="">— sem zona —</option>
            {(posterZones || []).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          {posterZones?.length === 0 && (
            <div style={{ fontSize: 10, color: T.inkMute, marginTop: 4 }}>
              Nenhuma zona configurada. Vai a Administração → Configuração para adicionar.
            </div>
          )}
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Estado inicial
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} style={dialogInput()}>
            {POSTER_STATUS.filter(s => s.id !== 'removed').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Notas (opcional)
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: produtos lidos, observações…" style={dialogInput()} />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{
            padding: '8px 14px', background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12,
          }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={busy} style={{
            padding: '8px 16px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
            cursor: busy ? 'wait' : 'pointer',
          }}>
            {busy ? 'A guardar…' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ActiveCampaignsSummary — minimalist card on dashboard with active periods
// ─────────────────────────────────────────────────────────────────────────
function ActiveCampaignsSummary({ periods, posters, setView }) {
  // Compute per-period stats and filter to active + upcoming-soon
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = 24 * 60 * 60 * 1000;

  const postersByPeriod = useMemo(() => {
    const m = new Map();
    (posters || []).forEach(p => {
      if (p.status === 'removed') return;
      const list = m.get(p.period_id) || [];
      list.push(p);
      m.set(p.period_id, list);
    });
    return m;
  }, [posters]);

  const enriched = useMemo(() => {
    return (periods || [])
      .map(p => {
        const status = periodStatus(p);
        const end = p.endDate ? new Date(p.endDate) : null;
        const daysLeft = end ? Math.round((end.getTime() - today.getTime()) / ms) : null;
        const periodPosters = postersByPeriod.get(p.id) || [];
        const postersCount = periodPosters.reduce((s, x) => s + (x.quantity || 1), 0);
        return { ...p, calcStatus: status, daysLeft, postersCount };
      })
      .filter(p => p.calcStatus === 'active' || p.calcStatus === 'planned')
      .sort((a, b) => {
        // active first, then by daysLeft asc
        if (a.calcStatus !== b.calcStatus) return a.calcStatus === 'active' ? -1 : 1;
        if (a.daysLeft == null) return 1;
        if (b.daysLeft == null) return -1;
        return a.daysLeft - b.daysLeft;
      })
      .slice(0, 6); // max 6 cards
  }, [periods, postersByPeriod]);

  if (enriched.length === 0) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Calendar size={14} style={{ color: T.accent }} />
        <h3 className="mono" style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', color: T.inkSoft, textTransform: 'uppercase' }}>
          Campanhas Ativas
        </h3>
        <div style={{ flex: 1 }} />
        <button onClick={() => setView('campaigns')} style={{
          background: 'transparent', border: 'none', color: T.inkSoft,
          fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Ver todas <ArrowRight size={11} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {enriched.map(p => (
          <SummaryCampaignCard key={p.id} period={p} setView={setView} />
        ))}
      </div>
    </div>
  );
}

function SummaryCampaignCard({ period, setView }) {
  const isActive = period.calcStatus === 'active';
  const accent = isActive ? T.green : T.accent;

  let timeLabel;
  if (isActive) {
    if (period.daysLeft != null) {
      if (period.daysLeft === 0) timeLabel = 'Termina HOJE';
      else if (period.daysLeft === 1) timeLabel = 'Termina amanhã';
      else timeLabel = `Termina em ${period.daysLeft} dias`;
    } else {
      timeLabel = 'Em curso';
    }
  } else {
    if (period.startDate) {
      const start = new Date(period.startDate);
      const today = new Date(); today.setHours(0,0,0,0);
      const days = Math.round((start - today) / (24*60*60*1000));
      timeLabel = days === 0 ? 'Começa HOJE' : days === 1 ? 'Começa amanhã' : `Começa em ${days} dias`;
    } else {
      timeLabel = 'Planeada';
    }
  }

  return (
    <button
      onClick={() => setView('campaigns')}
      style={{
        padding: 14, background: T.paper,
        border: `1px solid ${T.line}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        fontFamily: 'inherit', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.ink}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
    >
      <div className="mono" style={{
        fontSize: 9, letterSpacing: '0.12em',
        color: accent, textTransform: 'uppercase', marginBottom: 4, fontWeight: 600,
      }}>
        {timeLabel}
      </div>
      <div className="display" style={{
        fontSize: 16, fontStyle: 'italic', lineHeight: 1.2, marginBottom: 6,
        color: T.ink,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {period.name}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: T.inkSoft, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Calendar size={10} /> {formatPeriodDates(period)}
        </span>
        {period.has_posters && period.postersCount > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            color: isActive && period.daysLeft != null && period.daysLeft <= 2 ? T.red : T.accent,
            fontWeight: 600,
          }} title="Cartazes afixados">
            <ClipboardList size={10} /> {period.postersCount}
          </span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AdminPosterZonesTab — manage zones where posters are placed
// ─────────────────────────────────────────────────────────────────────────
function AdminPosterZonesTab({ currentUserId }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | { id?, name, description, displayOrder }

  const refresh = useCallback(async () => {
    setLoading(true);
    setZones(await fetchPosterZones());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async (data) => {
    if (data.id) {
      await updatePosterZone(data.id, {
        name: data.name, description: data.description, display_order: data.displayOrder,
      });
    } else {
      await createPosterZone({
        name: data.name, description: data.description, displayOrder: data.displayOrder,
        createdBy: currentUserId,
      });
    }
    setEditing(null);
    refresh();
  };

  const handleDelete = async (zone) => {
    if (!confirm(`Eliminar zona "${zone.name}"?\n\nOs cartazes registados nesta zona ficam sem zona associada.`)) return;
    await deletePosterZone(zone.id);
    refresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5, maxWidth: 560 }}>
          Define as zonas físicas da loja onde podem ser afixados cartazes (entrada, montra, caixas, etc.). Estas zonas aparecem no diálogo de registo de cartazes em cada campanha.
        </div>
        <button onClick={() => setEditing({})} style={{
          padding: '8px 14px', background: T.ink, color: T.bg,
          border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Plus size={12} /> Nova zona
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 12 }}>A carregar…</div>
      ) : zones.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 12, background: T.bgEl, borderRadius: 6 }}>
          Sem zonas configuradas. Cria a primeira.
        </div>
      ) : (
        <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {zones.map((z, idx) => (
            <div key={z.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: idx === zones.length - 1 ? 'none' : `1px solid ${T.lineSoft}`,
            }}>
              <span className="mono" style={{ fontSize: 10, color: T.inkMute, width: 28 }}>#{z.display_order || 0}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{z.name}</div>
                {z.description && <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 2 }}>{z.description}</div>}
              </div>
              <button onClick={() => setEditing({ id: z.id, name: z.name, description: z.description || '', displayOrder: z.display_order })} style={adminActionBtn()}>
                <Pencil size={11} /> Editar
              </button>
              <button onClick={() => handleDelete(z)} style={adminActionBtn(T.red)}>
                <Trash2 size={11} /> Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PosterZoneDialog
          zone={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function PosterZoneDialog({ zone, onClose, onSave }) {
  const [name, setName] = useState(zone?.name || '');
  const [description, setDescription] = useState(zone?.description || '');
  const [displayOrder, setDisplayOrder] = useState(zone?.displayOrder ?? 0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    if (!name.trim()) { alert('Indica um nome.'); return; }
    onSave({ id: zone.id, name: name.trim(), description: description.trim(), displayOrder: Number(displayOrder) || 0 });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 24,
        width: 'min(440px, 92vw)', border: `1px solid ${T.line}`,
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 4 }}>
          Zona de cartazes
        </div>
        <h3 className="display" style={{ fontSize: 20, margin: '0 0 18px', fontStyle: 'italic' }}>
          {zone.id ? 'Editar zona' : 'Nova zona'}
        </h3>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Nome *</div>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Ex: Entrada, Montra…" style={dialogInput()} />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Descrição</div>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Localização exata, observações…" style={dialogInput()} />
        </label>

        <label style={{ display: 'block', marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 3, fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ordem</div>
          <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} style={dialogInput()} />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12,
          }}>Cancelar</button>
          <button onClick={submit} style={{
            padding: '8px 16px', background: T.ink, color: T.bg,
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
          }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AdminEmailsTab — view email queue, manually mark as sent
// ─────────────────────────────────────────────────────────────────────────
function AdminEmailsTab({ currentUserId }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const refresh = useCallback(async () => {
    setLoading(true);
    setEmails(await fetchEmailQueue({ status: filter, limit: 200 }));
    setLoading(false);
  }, [filter]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleMarkSent = async (id) => {
    await markEmailSent(id);
    refresh();
  };
  const handleSkip = async (id) => {
    await markEmailSkipped(id);
    refresh();
  };

  return (
    <div>
      <div style={{ marginBottom: 16, padding: '12px 14px', background: T.accentSoft, borderRadius: 6, fontSize: 12, color: T.ink, lineHeight: 1.5 }}>
        <strong>Fila de emails.</strong> Os emails são gerados automaticamente quando uma campanha está a 2 dias do fim e tem cartazes registados (configurável). Atualmente esta fila é manual — para enviar realmente, podes copiar o conteúdo abaixo para um cliente de email, ou no futuro ligar à integração Resend/SendGrid (Edge Function).
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 6, width: 'fit-content', marginBottom: 14 }}>
        {[
          { id: 'pending', l: 'Pendentes' },
          { id: 'sent', l: 'Enviados' },
          { id: 'skipped', l: 'Ignorados' },
          { id: 'all', l: 'Todos' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '5px 11px', fontSize: 11, borderRadius: 4, border: 'none',
            background: filter === f.id ? T.ink : 'transparent',
            color: filter === f.id ? T.bg : T.inkSoft, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 12 }}>A carregar…</div>
      ) : emails.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 12, background: T.bgEl, borderRadius: 6 }}>
          Sem emails {filter === 'pending' ? 'pendentes' : filter === 'sent' ? 'enviados' : ''}.
        </div>
      ) : (
        <div style={{ background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {emails.map((e, idx) => (
            <EmailRow key={e.id} email={e} isLast={idx === emails.length - 1} onMarkSent={handleMarkSent} onSkip={handleSkip} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmailRow({ email, isLast, onMarkSent, onSkip }) {
  const [expanded, setExpanded] = useState(false);
  const ts = new Date(email.created_at);

  return (
    <div style={{
      borderBottom: isLast ? 'none' : `1px solid ${T.lineSoft}`,
      background: email.status === 'pending' ? '#FFF8F0' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
        <Mail size={14} style={{ color: email.status === 'pending' ? T.accent : T.inkMute, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email.subject}
          </div>
          <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2 }}>
            para <strong>{email.to_email}</strong> · {ts.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {email.status === 'sent' && <span style={{ color: T.green, marginLeft: 6 }}>✓ enviado</span>}
            {email.status === 'skipped' && <span style={{ color: T.inkMute, marginLeft: 6 }}>ignorado</span>}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} style={adminActionBtn()}>
          <Eye size={11} /> {expanded ? 'Fechar' : 'Ver'}
        </button>
        {email.status === 'pending' && (
          <>
            <button onClick={() => onMarkSent(email.id)} style={adminActionBtn(T.green)}>
              <Check size={11} /> Enviado
            </button>
            <button onClick={() => onSkip(email.id)} style={adminActionBtn()}>
              Ignorar
            </button>
          </>
        )}
      </div>
      {expanded && (
        <div style={{
          padding: 14, background: T.bg, fontSize: 11, color: T.inkSoft,
          borderTop: `1px solid ${T.lineSoft}`, fontFamily: 'Geist Mono',
          whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto',
        }}>
          {email.body_text}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// AutoFillWizard — 3-step modal for auto-filling
// Step 1: Strategy (presets)
// Step 2: Rules (capacity, families, filters; per-zone optional)
// Step 3: Preview (PO2 + PO3 separate, accept/reject)
// ─────────────────────────────────────────────────────────────────────────

const STRATEGY_PRESETS = [
  {
    id: 'discount',
    icon: 'Tag',
    label: 'Maiores descontos',
    description: 'Produtos com mais % de desconto primeiro. Ideal para campanhas promocionais e Black Friday.',
    weights: { discount: 0.65, stock: 0.15, sales: 0.10, price: 0.10 },
    pricePreference: 'low',
  },
  {
    id: 'destock',
    icon: 'Warehouse',
    label: 'Escoar stock',
    description: 'Produtos com mais stock disponível primeiro. Útil para libertar armazém.',
    weights: { discount: 0.20, stock: 0.55, sales: 0.15, price: 0.10 },
    pricePreference: 'high',
  },
  {
    id: 'bestsellers',
    icon: 'TrendingUp',
    label: 'Best-sellers',
    description: 'Produtos com mais vendas recentes. Ideal para destacar produtos comprovadamente populares.',
    weights: { discount: 0.15, stock: 0.20, sales: 0.55, price: 0.10 },
    pricePreference: 'high',
  },
  {
    id: 'premium',
    icon: 'Star',
    label: 'Produtos premium',
    description: 'Produtos de gama alta. Para campanhas de imagem e produtos estrela.',
    weights: { discount: 0.15, stock: 0.15, sales: 0.20, price: 0.50 },
    pricePreference: 'high',
  },
  {
    id: 'balanced',
    icon: 'Sparkles',
    label: 'Equilibrado',
    description: 'Pondera todos os critérios de forma equilibrada. Boa opção quando não há um objectivo específico.',
    weights: { discount: 0.30, stock: 0.30, sales: 0.25, price: 0.15 },
    pricePreference: 'high',
  },
  {
    id: 'custom',
    icon: 'Settings',
    label: 'Personalizado',
    description: 'Define os pesos manualmente.',
    weights: { discount: 0.40, stock: 0.30, sales: 0.20, price: 0.10 },
    pricePreference: 'high',
    custom: true,
  },
];

const STRATEGY_ICONS = { Tag, Warehouse, TrendingUp, Star, Sparkles, Settings };

function AutoFillWizard({ state, floors, campaign, stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, onClose, onUpdate, onGenerate, onApply }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { step, mode, floorId, zoneId } = state;
  const targetZone = mode === 'zone' && floorId && zoneId
    ? floors.find(f => f.id === floorId)?.zones.find(z => z.id === zoneId)
    : null;

  // Compute scope label
  const scopeLabel = mode === 'zone'
    ? `Móvel "${targetZone?.name || '?'}"`
    : `Toda a campanha (${floors.reduce((s, f) => s + f.zones.filter(z => z.slots.length === 0).length, 0)} móveis vazios)`;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.5)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeUp 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, borderRadius: 12, padding: 0,
        width: 'min(900px, 95vw)', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        border: `1px solid ${T.line}`,
      }}>
        {/* Header with step indicator */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <Sparkles size={18} style={{ color: T.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: 2 }}>
              Auto-preenchimento — passo {step} de 3
            </div>
            <h3 className="display" style={{ fontSize: 18, margin: 0, fontStyle: 'italic' }}>
              {step === 1 ? 'Escolhe a estratégia' : step === 2 ? 'Define as regras' : 'Revê e aplica'}
            </h3>
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: 'Geist Mono', letterSpacing: '0.05em' }}>
            {scopeLabel}
          </div>
          <button onClick={onClose} style={{ padding: 6, background: 'transparent', color: T.inkMute, border: 'none', borderRadius: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', height: 3, background: T.lineSoft }}>
          <div style={{ width: `${(step / 3) * 100}%`, background: T.accent, transition: 'width 0.25s' }} />
        </div>

        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && <StrategyStep state={state} onPick={(strategy) => onUpdate({ strategy, step: 2 })} />}
          {step === 2 && <RulesStep
            state={state}
            campaign={campaign}
            floors={floors}
            onBack={() => onUpdate({ step: 1 })}
            onContinue={(rules) => onGenerate(rules)}
          />}
          {step === 3 && <PreviewStep
            state={state}
            floors={floors}
            campaign={campaign}
            stockRowsPO2={stockRowsPO2}
            stockRowsPO3={stockRowsPO3}
            stockMapPO2={stockMapPO2}
            stockMapPO3={stockMapPO3}
            onBack={() => onUpdate({ step: 2, suggestions: null })}
            onApply={onApply}
          />}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Strategy ────────────────────────────────────────────────────
function StrategyStep({ state, onPick }) {
  const [customWeights, setCustomWeights] = useState(STRATEGY_PRESETS.find(p => p.custom).weights);
  const [customPricePref, setCustomPricePref] = useState('high');

  return (
    <div>
      <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5, marginBottom: 18 }}>
        Escolhe como o sistema vai pontuar e ordenar os produtos. Cada estratégia é uma combinação diferente de pesos para desconto, stock, vendas e preço.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {STRATEGY_PRESETS.filter(p => !p.custom).map(p => {
          const Icon = STRATEGY_ICONS[p.icon];
          return (
            <button key={p.id} onClick={() => onPick({
              id: p.id, weights: p.weights, pricePreference: p.pricePreference,
              defaultMin: 1, defaultMax: 8,
            })} style={{
              padding: 18, textAlign: 'left',
              background: T.bgEl, border: `1px solid ${T.line}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentSoft; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bgEl; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {Icon && <Icon size={16} style={{ color: T.accent }} />}
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{p.label}</span>
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.4 }}>{p.description}</div>
              {/* Mini weight bars */}
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[
                  { k: 'discount', l: 'D' },
                  { k: 'stock', l: 'S' },
                  { k: 'sales', l: 'V' },
                  { k: 'price', l: 'P' },
                ].map(b => (
                  <div key={b.k} style={{ flex: 1 }}>
                    <div className="mono" style={{ fontSize: 8, color: T.inkMute, textAlign: 'center' }}>{b.l}</div>
                    <div style={{ height: 3, background: T.line, borderRadius: 1.5, marginTop: 2 }}>
                      <div style={{ height: '100%', width: `${p.weights[b.k] * 100}%`, background: T.accent, borderRadius: 1.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom strategy at bottom */}
      <div style={{ marginTop: 20, padding: 18, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Settings size={14} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Personalizado</span>
          <span style={{ fontSize: 11, color: T.inkSoft }}>· define os pesos manualmente</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { k: 'discount', l: 'Desconto' },
            { k: 'stock', l: 'Stock' },
            { k: 'sales', l: 'Vendas' },
            { k: 'price', l: 'Preço' },
          ].map(b => (
            <div key={b.k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: T.ink, fontWeight: 500 }}>{b.l}</span>
                <span className="mono" style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>{Math.round(customWeights[b.k] * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05}
                value={customWeights[b.k]}
                onChange={e => setCustomWeights({ ...customWeights, [b.k]: Number(e.target.value) })}
                style={{ width: '100%', accentColor: T.accent }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: T.inkSoft }}>Preferência de preço:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ v: 'high', l: 'Premium' }, { v: 'low', l: 'Mais barato' }].map(opt => (
              <button key={opt.v} onClick={() => setCustomPricePref(opt.v)} style={{
                padding: '4px 10px', fontSize: 10,
                background: customPricePref === opt.v ? T.ink : 'transparent',
                color: customPricePref === opt.v ? T.bg : T.inkSoft,
                border: `1px solid ${customPricePref === opt.v ? T.ink : T.line}`,
                borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              }}>{opt.l}</button>
            ))}
          </div>
        </div>
        <button onClick={() => onPick({
          id: 'custom', weights: customWeights, pricePreference: customPricePref,
          defaultMin: 1, defaultMax: 8,
        })} style={{
          padding: '8px 16px', background: T.ink, color: T.bg,
          border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          Usar personalizado <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Rules ────────────────────────────────────────────────────────
function RulesStep({ state, campaign, floors, onBack, onContinue }) {
  const [capacityMin, setCapacityMin] = useState(1);
  const [capacityMax, setCapacityMax] = useState(8);
  const [minDiscount, setMinDiscount] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [preferredFamilies, setPreferredFamilies] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [perZone, setPerZone] = useState({}); // { zoneId: { capacityMin, capacityMax, ... } }

  const availableFamilies = useMemo(() => {
    const cols = detectColumns(campaign.headers);
    if (!cols.family) return [];
    const set = new Set();
    campaign.rows.forEach(r => {
      const f = String(r[cols.family] || '').trim();
      if (f) set.add(f);
    });
    return Array.from(set).sort();
  }, [campaign]);

  const availableSubfamilies = useMemo(() => {
    const cols = detectColumns(campaign.headers);
    if (!cols.subfamily) return [];
    const set = new Set();
    campaign.rows.forEach(r => {
      const f = String(r[cols.subfamily] || '').trim();
      if (f) set.add(f);
    });
    return Array.from(set).sort();
  }, [campaign]);

  const targetZones = useMemo(() => {
    if (state.mode === 'zone') {
      const f = floors.find(x => x.id === state.floorId);
      const z = f?.zones.find(x => x.id === state.zoneId);
      return z ? [{ floor: f, zone: z }] : [];
    }
    // global: all empty zones
    const out = [];
    floors.forEach(f => f.zones.forEach(z => { if (z.slots.length === 0) out.push({ floor: f, zone: z }); }));
    return out;
  }, [state, floors]);

  const toggleFamily = (fam) => {
    setPreferredFamilies(p => p.includes(fam) ? p.filter(x => x !== fam) : [...p, fam]);
  };

  const setZoneCapacity = (zid, key, val) => {
    setPerZone(p => ({ ...p, [zid]: { ...p[zid], [key]: Number(val) || 0 } }));
  };

  const toggleZoneFamily = (zid, listKey, fam) => {
    setPerZone(p => {
      const cur = p[zid]?.[listKey] || [];
      const next = cur.includes(fam) ? cur.filter(x => x !== fam) : [...cur, fam];
      return { ...p, [zid]: { ...p[zid], [listKey]: next } };
    });
  };

  const submit = () => {
    onContinue({
      capacityMin: Number(capacityMin) || 1,
      capacityMax: Number(capacityMax) || 8,
      minDiscount: Number(minDiscount) || 0,
      minStock: Number(minStock) || 0,
      maxPrice: Number(maxPrice) || 0,
      preferredFamilies,
      perZone,
    });
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5, marginBottom: 18 }}>
        Define quantos produtos cabem em cada móvel e que filtros aplicar. Estas regras valem para todos os móveis em análise. Podes afinar zona-a-zona em "Configuração avançada".
      </div>

      {/* Capacity */}
      <div style={{ marginBottom: 18, padding: 16, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 8 }}>
          Capacidade {state.mode === 'global' && '(aplica a todos os móveis)'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>Mínimo</div>
            <input type="number" min={0} value={capacityMin} onChange={e => setCapacityMin(e.target.value)} style={dialogInput()} />
          </label>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>Máximo</div>
            <input type="number" min={1} value={capacityMax} onChange={e => setCapacityMax(e.target.value)} style={dialogInput()} />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 18, padding: 16, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 8 }}>
          Filtros (0 = sem limite)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>Desconto mín. (%)</div>
            <input type="number" min={0} max={100} value={minDiscount} onChange={e => setMinDiscount(e.target.value)} style={dialogInput()} />
          </label>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>Stock mín. (PO2+PO3)</div>
            <input type="number" min={0} value={minStock} onChange={e => setMinStock(e.target.value)} style={dialogInput()} />
          </label>
          <label>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>Preço máx. (€)</div>
            <input type="number" min={0} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={dialogInput()} />
          </label>
        </div>
      </div>

      {/* Families */}
      {availableFamilies.length > 0 && (
        <div style={{ marginBottom: 18, padding: 16, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 8 }}>
            Famílias preferidas {preferredFamilies.length > 0 && `(${preferredFamilies.length})`} · vazio = todas
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            maxHeight: 140, overflowY: 'auto',
          }}>
            {availableFamilies.map(fam => {
              const active = preferredFamilies.includes(fam);
              return (
                <button key={fam} onClick={() => toggleFamily(fam)} style={{
                  padding: '4px 10px', fontSize: 10,
                  background: active ? T.ink : 'transparent',
                  color: active ? T.bg : T.inkSoft,
                  border: `1px solid ${active ? T.ink : T.line}`,
                  borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                }}>{fam}</button>
              );
            })}
          </div>
          {preferredFamilies.length > 0 && (
            <button onClick={() => setPreferredFamilies([])} style={{
              marginTop: 8, padding: '3px 8px', fontSize: 10,
              background: 'transparent', color: T.inkMute,
              border: `1px solid ${T.line}`, borderRadius: 3,
            }}>Limpar todas</button>
          )}
        </div>
      )}

      {/* Advanced — per-zone overrides */}
      {targetZones.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <button onClick={() => setShowAdvanced(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 0', background: 'transparent',
            color: T.inkSoft, border: 'none', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Settings size={12} /> {showAdvanced ? 'Ocultar' : 'Configuração avançada por móvel (famílias, capacidade)'}
            <ChevronRight size={12} style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {showAdvanced && (
            <div style={{ marginTop: 8, padding: 14, background: T.bgEl, border: `1px solid ${T.line}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 12 }}>
                Configura por móvel: capacidade, famílias alocadas (boost) e famílias/subfamílias restritas (filtro duro).
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 440, overflowY: 'auto' }}>
                {targetZones.map(({ floor, zone }) => {
                  const ov = perZone[zone.id] || {};
                  const allocFams = ov.allocatedFamilies || [];
                  const restFams = ov.restrictedFamilies || [];
                  const restSubs = ov.restrictedSubfamilies || [];
                  const hasFamilyConfig = allocFams.length > 0 || restFams.length > 0 || restSubs.length > 0;
                  return (
                    <div key={zone.id} style={{
                      padding: '10px 12px',
                      background: T.bg, border: `1px solid ${hasFamilyConfig ? T.accent : T.lineSoft}`, borderRadius: 6,
                    }}>
                      {/* Zone header + capacity */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: T.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone.name}</div>
                          <div className="mono" style={{ fontSize: 9, color: T.inkMute }}>{floor.name}</div>
                        </div>
                        <input type="number" placeholder={`min ${capacityMin}`} value={ov.capacityMin ?? ''}
                          onChange={e => setZoneCapacity(zone.id, 'capacityMin', e.target.value)}
                          style={{ ...dialogInput(), padding: '4px 6px', fontSize: 11 }}
                        />
                        <input type="number" placeholder={`max ${capacityMax}`} value={ov.capacityMax ?? ''}
                          onChange={e => setZoneCapacity(zone.id, 'capacityMax', e.target.value)}
                          style={{ ...dialogInput(), padding: '4px 6px', fontSize: 11 }}
                        />
                      </div>

                      {/* Family allocation (soft boost) */}
                      {availableFamilies.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div className="mono" style={{ fontSize: 9, color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            Famílias alocadas <span style={{ color: T.green, fontSize: 8 }}>▲ boost</span>
                            {allocFams.length > 0 && <button onClick={() => setPerZone(p => ({ ...p, [zone.id]: { ...p[zone.id], allocatedFamilies: [] } }))} style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', background: 'transparent', color: T.inkMute, border: `1px solid ${T.line}`, borderRadius: 2, cursor: 'pointer' }}>×</button>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {availableFamilies.map(fam => {
                              const active = allocFams.includes(fam);
                              return (
                                <button key={fam} onClick={() => toggleZoneFamily(zone.id, 'allocatedFamilies', fam)} style={{
                                  padding: '2px 7px', fontSize: 9, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                                  background: active ? T.green : 'transparent',
                                  color: active ? '#fff' : T.inkSoft,
                                  border: `1px solid ${active ? T.green : T.line}`,
                                }}>{fam}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Family restriction (hard filter) */}
                      {availableFamilies.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div className="mono" style={{ fontSize: 9, color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            Famílias restritas <span style={{ color: T.red, fontSize: 8 }}>✕ exclusivo</span>
                            {restFams.length > 0 && <button onClick={() => setPerZone(p => ({ ...p, [zone.id]: { ...p[zone.id], restrictedFamilies: [] } }))} style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', background: 'transparent', color: T.inkMute, border: `1px solid ${T.line}`, borderRadius: 2, cursor: 'pointer' }}>×</button>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {availableFamilies.map(fam => {
                              const active = restFams.includes(fam);
                              return (
                                <button key={fam} onClick={() => toggleZoneFamily(zone.id, 'restrictedFamilies', fam)} style={{
                                  padding: '2px 7px', fontSize: 9, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                                  background: active ? T.red : 'transparent',
                                  color: active ? '#fff' : T.inkSoft,
                                  border: `1px solid ${active ? T.red : T.line}`,
                                }}>{fam}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Subfamily restriction (hard filter) */}
                      {availableSubfamilies.length > 0 && (
                        <div>
                          <div className="mono" style={{ fontSize: 9, color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            Sub-famílias restritas <span style={{ color: T.red, fontSize: 8 }}>✕ exclusivo</span>
                            {restSubs.length > 0 && <button onClick={() => setPerZone(p => ({ ...p, [zone.id]: { ...p[zone.id], restrictedSubfamilies: [] } }))} style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', background: 'transparent', color: T.inkMute, border: `1px solid ${T.line}`, borderRadius: 2, cursor: 'pointer' }}>×</button>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {availableSubfamilies.map(sub => {
                              const active = restSubs.includes(sub);
                              return (
                                <button key={sub} onClick={() => toggleZoneFamily(zone.id, 'restrictedSubfamilies', sub)} style={{
                                  padding: '2px 7px', fontSize: 9, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                                  background: active ? T.orange : 'transparent',
                                  color: active ? '#fff' : T.inkSoft,
                                  border: `1px solid ${active ? T.orange : T.line}`,
                                }}>{sub}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 24 }}>
        <button onClick={onBack} style={{
          padding: '8px 14px', background: 'transparent', color: T.inkSoft,
          border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
        }}>
          <ArrowLeft size={12} /> Voltar
        </button>
        <button onClick={submit} style={{
          padding: '8px 18px', background: T.ink, color: T.bg,
          border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Sparkles size={12} /> Gerar sugestões
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Preview with PO2 + PO3 separate columns ──────────────────────
function PreviewStep({ state, floors, campaign, stockRowsPO2, stockRowsPO3, stockMapPO2, stockMapPO3, onBack, onApply }) {
  const [rejected, setRejected] = useState(new Map()); // zoneKey → Set<ean>

  const columns = useMemo(() => detectColumns(campaign.headers), [campaign]);
  const stockIdxPO2 = useMemo(() => buildStockIndex(stockRowsPO2, stockMapPO2).index, [stockRowsPO2, stockMapPO2]);
  const stockIdxPO3 = useMemo(() => buildStockIndex(stockRowsPO3, stockMapPO3).index, [stockRowsPO3, stockMapPO3]);

  const zoneNames = useMemo(() => {
    const map = new Map();
    floors.forEach(f => f.zones.forEach(z => map.set(`${f.id}:${z.id}`, { floor: f.name, zone: z.name, color: f.color })));
    return map;
  }, [floors]);

  const suggestions = state.suggestions || new Map();

  const toggle = (zoneKey, ean) => {
    setRejected(m => {
      const next = new Map(m);
      const set = new Set(next.get(zoneKey) || []);
      if (set.has(ean)) set.delete(ean); else set.add(ean);
      next.set(zoneKey, set);
      return next;
    });
  };

  const rejectZone = (zoneKey) => {
    const list = suggestions.get(zoneKey) || [];
    setRejected(m => { const next = new Map(m); next.set(zoneKey, new Set(list.map(s => s.ean))); return next; });
  };
  const acceptZone = (zoneKey) => {
    setRejected(m => { const next = new Map(m); next.set(zoneKey, new Set()); return next; });
  };
  const rejectAll = () => {
    setRejected(new Map(Array.from(suggestions.entries()).map(([k, list]) => [k, new Set(list.map(s => s.ean))])));
  };
  const acceptAll = () => setRejected(new Map());

  const acceptedMap = useMemo(() => {
    const map = new Map();
    for (const [zoneKey, list] of suggestions) {
      const rejSet = rejected.get(zoneKey) || new Set();
      const accepted = list.filter(s => !rejSet.has(s.ean));
      if (accepted.length > 0) map.set(zoneKey, accepted);
    }
    return map;
  }, [suggestions, rejected]);

  const totalSuggested = Array.from(suggestions.values()).reduce((s, arr) => s + arr.length, 0);
  const totalAccepted = Array.from(acceptedMap.values()).reduce((s, arr) => s + arr.length, 0);

  if (suggestions.size === 0) {
    return (
      <div>
        <div style={{ padding: 30, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
          <AlertTriangle size={24} style={{ marginBottom: 10, color: T.accent }} />
          <div style={{ marginBottom: 6, color: T.ink, fontWeight: 500 }}>Sem sugestões</div>
          <div>Não foram encontrados produtos que cumpram as regras definidas. Volta atrás e relaxa os filtros.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button onClick={onBack} style={{
            padding: '8px 14px', background: 'transparent', color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          }}><ArrowLeft size={12} /> Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5, flex: 1 }}>
          <strong style={{ color: T.ink }}>{totalAccepted} de {totalSuggested}</strong> sugestões em {suggestions.size} {suggestions.size === 1 ? 'móvel' : 'móveis'}.
        </div>
        <button onClick={acceptAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 4, border: `1px solid ${T.green}`, background: 'transparent', color: T.green, cursor: 'pointer' }}>
          ✓ Aceitar todas
        </button>
        <button onClick={rejectAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 4, border: `1px solid ${T.red}`, background: 'transparent', color: T.red, cursor: 'pointer' }}>
          ✕ Rejeitar todas
        </button>
      </div>

      {Array.from(suggestions.entries()).map(([zoneKey, list]) => {
        const info = zoneNames.get(zoneKey) || { floor: '?', zone: '?', color: T.accent };
        const rejSet = rejected.get(zoneKey) || new Set();
        const acceptedCount = list.length - rejSet.size;
        return (
          <div key={zoneKey} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              paddingBottom: 6, borderBottom: `1.5px solid ${info.color}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: info.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{info.zone}</span>
              <span className="mono" style={{ fontSize: 10, color: T.inkMute }}>· {info.floor}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: T.inkSoft }}>
                {acceptedCount} / {list.length}
              </span>
              <button onClick={() => acceptZone(zoneKey)} title="Aceitar todas neste móvel" style={{ padding: '2px 7px', fontSize: 10, borderRadius: 3, border: `1px solid ${T.green}`, background: 'transparent', color: T.green, cursor: 'pointer' }}>✓</button>
              <button onClick={() => rejectZone(zoneKey)} title="Rejeitar todas neste móvel" style={{ padding: '2px 7px', fontSize: 10, borderRadius: 3, border: `1px solid ${T.red}`, background: 'transparent', color: T.red, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px 60px 36px',
              gap: 8, padding: '6px 12px', fontSize: 9, fontWeight: 600,
              fontFamily: 'Geist Mono', letterSpacing: '0.08em', color: T.inkMute,
              textTransform: 'uppercase', borderBottom: `1px solid ${T.lineSoft}`,
            }}>
              <div>Produto</div>
              <div style={{ textAlign: 'right' }}>Desc.%</div>
              <div style={{ textAlign: 'right', color: T.cyan }}>PO2</div>
              <div style={{ textAlign: 'right', color: T.cyan }}>PO3</div>
              <div style={{ textAlign: 'right' }}>Score</div>
              <div></div>
            </div>

            {list.map(s => {
              const isRej = rejSet.has(s.ean);
              const product = s.product;
              const desc = columns.description ? String(product[columns.description] || '').slice(0, 60) : s.ean;
              const fam = columns.family ? String(product[columns.family] || '') : '';
              const disc = columns.discount ? parseNum(product[columns.discount]) : 0;
              const price = columns.campaignPrice ? parseNum(product[columns.campaignPrice]) : (columns.basePrice ? parseNum(product[columns.basePrice]) : 0);
              const stockP2 = stockIdxPO2.get(s.ean) || 0;
              const stockP3 = stockIdxPO3.get(s.ean) || 0;
              const goodScore = s.score > 0.4;
              return (
                <button key={s.ean} onClick={() => toggle(zoneKey, s.ean)} style={{
                  display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px 60px 36px',
                  gap: 8, alignItems: 'center', padding: '8px 12px',
                  background: isRej ? T.bgEl : T.paper,
                  border: `1px solid ${isRej ? T.line : T.lineSoft}`,
                  borderLeft: `3px solid ${isRej ? T.line : (goodScore ? T.green : T.accent)}`,
                  borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                  opacity: isRej ? 0.45 : 1,
                  textDecoration: isRej ? 'line-through' : 'none',
                  fontFamily: 'inherit', width: '100%', marginBottom: 4,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: T.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {desc}
                    </div>
                    <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2, display: 'flex', gap: 8 }}>
                      <span className="mono">{s.ean}</span>
                      {fam && <span>· {fam}</span>}
                      {price > 0 && <span>· {price.toFixed(2)}€</span>}
                    </div>
                    {s.reasons.length > 0 && !isRej && (
                      <div style={{ fontSize: 9, color: T.accent, marginTop: 2, fontStyle: 'italic' }}>
                        {s.reasons.join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: disc > 0 ? 600 : 400, color: disc >= 30 ? T.green : (disc > 0 ? T.ink : T.inkMute), fontFamily: 'Geist Mono' }}>
                    {disc > 0 ? `-${Math.round(disc)}%` : '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: stockP2 > 0 ? 600 : 400, color: stockP2 > 0 ? T.ink : T.inkMute, fontFamily: 'Geist Mono' }}>
                    {stockP2 || '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: stockP3 > 0 ? 600 : 400, color: stockP3 > 0 ? T.ink : T.inkMute, fontFamily: 'Geist Mono' }}>
                    {stockP3 || '—'}
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', justifySelf: 'end',
                    background: isRej ? T.line : (goodScore ? T.green : T.accent),
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono',
                  }}>
                    {Math.round(s.score * 100)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', color: T.inkMute }}>
                    {isRej ? <X size={14} /> : <Check size={14} style={{ color: T.green }} />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
        <button onClick={onBack} style={{
          padding: '8px 14px', background: 'transparent', color: T.inkSoft,
          border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
        }}>
          <ArrowLeft size={12} /> Voltar (refazer)
        </button>
        <div style={{ fontSize: 11, color: T.inkSoft, marginLeft: 'auto', marginRight: 12 }}>
          Os produtos aplicados ficam com estado <strong style={{ color: T.accent }}>"sugerido"</strong>.
        </div>
        <button
          onClick={() => onApply(acceptedMap)}
          disabled={totalAccepted === 0}
          style={{
            padding: '8px 18px', background: totalAccepted > 0 ? T.ink : T.line,
            color: T.bg, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: totalAccepted > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          <Check size={12} /> Aplicar {totalAccepted} {totalAccepted === 1 ? 'sugestão' : 'sugestões'}
        </button>
      </div>
    </div>
  );
}
