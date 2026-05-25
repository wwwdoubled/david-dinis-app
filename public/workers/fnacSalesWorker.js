// v3.20.17: Web Worker para parsing do Excel FNAC "Vendas detalhadas com margem".
// Antes: parsing acontecia na main thread → UI congelava 3-5s em ficheiros 86k linhas.
// Agora: tudo num worker, posta progress via postMessage → barra de progresso real.

// Carregar XLSX do CDN (cached pelo browser; sem necessidade de bundling)
self.importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

function toIsoDate(ddmmyyyy) {
  const m = ddmmyyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  if (type !== 'parse') return;

  const { arrayBuffer, filename } = payload;

  try {
    self.postMessage({ type: 'progress', stage: 'read', message: 'A ler o ficheiro Excel…' });
    const wb = self.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames.find(n => /vendas/i.test(n)) || wb.SheetNames[0];
    if (!sheetName) throw new Error('Sem sheet no ficheiro');

    self.postMessage({ type: 'progress', stage: 'extract', message: 'A extrair linhas…' });
    const aoa = self.XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: null });
    if (aoa.length < 5) throw new Error('Ficheiro vazio ou formato inesperado');

    // Meta
    const metaLine2 = (aoa[1] || []).filter(Boolean).join(' ');
    const metaLine3 = (aoa[2] || []).filter(Boolean).join(' ');
    const periodMatch = metaLine2.match(/Data:\s*(\d{2}-\d{2}-\d{4})\s*at[ée]\s*(\d{2}-\d{2}-\d{4})/i);
    const storeMatch  = metaLine3.match(/Loja:\s*(.+?)(?:\s*(?:Valor|Margem|Descontos|$))/i);
    const dateFrom = periodMatch ? toIsoDate(periodMatch[1]) : null;
    const dateTo   = periodMatch ? toIsoDate(periodMatch[2]) : null;
    const storeName = storeMatch ? storeMatch[1].trim() : '—';

    // Headers
    const headers = (aoa[3] || []).map(h => String(h || '').trim().toLowerCase());
    const colIdx = (patterns) => {
      for (let i = 0; i < headers.length; i++) {
        if (patterns.some(p => headers[i].includes(p))) return i;
      }
      return -1;
    };
    const cEan    = colIdx(['ean']);
    const cInt    = colIdx(['interno', 'cód', 'cod']);
    const cName   = colIdx(['descri', 'nome']);
    const cQty    = colIdx(['qtd', 'quant']);
    const cPvp    = colIdx(['pvp s/iva', 'pvp sem']);
    const cPvpVat = colIdx(['pvp']) !== cPvp ? colIdx(['pvp']) : -1;
    const cPmp    = colIdx(['pmp']);
    const cDcom   = colIdx(['d.comercial', 'd. comercial', 'comerc']);
    const cDfid   = colIdx(['d.fidelidade', 'd. fidelidade', 'fidel']);
    const cDate   = colIdx(['data']);
    const cPos    = colIdx(['pos']);
    const cTrx    = colIdx(['transa']);
    const cFam1   = colIdx(['famila 1', 'família 1', 'familia 1']);
    const cFam2   = colIdx(['famila 2', 'família 2', 'familia 2']);
    const cFam3   = colIdx(['famila 3', 'família 3', 'familia 3']);

    if (cEan < 0 || cName < 0 || cQty < 0 || cPvp < 0 || cPmp < 0) {
      throw new Error('Cabeçalho não tem as colunas esperadas (EAN, Descrição, Qtd, PVP S/IVA, PMP).');
    }

    const totalRows = aoa.length - 4;
    self.postMessage({ type: 'progress', stage: 'parse', message: `A processar ${totalRows.toLocaleString('pt-PT')} linhas…`, total: totalRows, current: 0 });

    const rows = [];
    let progressCounter = 0;
    const progressEvery = Math.max(1000, Math.floor(totalRows / 20)); // ~20 updates

    for (let r = 4; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row) continue;
      const ean = row[cEan];
      if (ean == null || ean === '') continue;
      const qty       = Number(row[cQty]) || 0;
      const pvpNoVat  = Number(row[cPvp]) || 0;
      const pvp       = cPvpVat >= 0 ? (Number(row[cPvpVat]) || 0) : pvpNoVat;
      const pmp       = Number(row[cPmp]) || 0;
      const discComerc = cDcom >= 0 ? (Number(row[cDcom]) || 0) : 0;
      const discFidel  = cDfid >= 0 ? (Number(row[cDfid]) || 0) : 0;
      const margem    = pvpNoVat - pmp;
      const margemPct = pvpNoVat !== 0 ? (margem / pvpNoVat * 100) : 0;
      const revenue   = qty * pvpNoVat;
      let dateIso = null;
      let hour = null;
      let dow = null;
      const rawDate = cDate >= 0 ? row[cDate] : null;
      if (rawDate instanceof Date) {
        dateIso = rawDate.toISOString().slice(0, 10);
        hour = rawDate.getUTCHours();
        dow  = rawDate.getUTCDay();
      } else if (typeof rawDate === 'string' && rawDate.length >= 10) {
        dateIso = rawDate.slice(0, 10);
        if (rawDate.length >= 13) hour = parseInt(rawDate.slice(11, 13), 10);
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) dow = d.getUTCDay();
      }
      rows.push({
        ean: String(ean),
        internal: cInt >= 0 ? String(row[cInt] || '').trim() : '',
        name: String(row[cName] || '').trim(),
        qty,
        pvp, pvpNoVat, pmp,
        discComerc, discFidel,
        margem, margemPct,
        revenue,
        date: dateIso, hour, dow,
        pos: cPos >= 0 ? row[cPos] : null,
        transactionId: cTrx >= 0 ? row[cTrx] : null,
        fam1: cFam1 >= 0 ? String(row[cFam1] || '').trim() : '',
        fam2: cFam2 >= 0 ? String(row[cFam2] || '').trim() : '',
        fam3: cFam3 >= 0 ? String(row[cFam3] || '').trim() : '',
      });

      progressCounter++;
      if (progressCounter % progressEvery === 0) {
        self.postMessage({ type: 'progress', stage: 'parse', message: `A processar… ${rows.length.toLocaleString('pt-PT')} de ${totalRows.toLocaleString('pt-PT')}`, total: totalRows, current: progressCounter });
      }
    }

    const importedAt = new Date().toISOString();
    const id = `${storeName.toLowerCase().replace(/\s+/g, '-')}-${importedAt.replace(/[:.]/g, '')}`;
    self.postMessage({
      type: 'done',
      result: {
        id,
        store: storeName,
        filename,
        dateFrom, dateTo, importedAt,
        rowsCount: rows.length,
        rows,
      },
    });
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message || String(err) });
  }
};
