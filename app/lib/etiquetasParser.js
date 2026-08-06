// ─────────────────────────────────────────────────────────────────────────
// Parser local para o módulo de Etiquetas de Seguros.
//
// Substitui a leitura por IA (que exigia ANTHROPIC_API_KEY). Todas as funções
// aqui são puras e sem dependências — correm no browser e são testáveis.
//
// Replicam as regras que antes estavam no prompt da rota /api/ler-print:
//   - remover o intervalo de escalão entre parênteses  "(1001-1500)"
//   - normalizar espaços   "4ANOS" -> "4 ANOS", "2 ANO" -> "2 ANOS"
//   - deduzir a categoria a partir das designações
//   - apanhar a franquia dos selos "Franquia 120€"
// ─────────────────────────────────────────────────────────────────────────

/** Designações válidas começam por um destes prefixos. */
const RE_LINHA_SERVICO = /^(SEG|PP|EXT|GAR|CONFIG|CART[AÃ]O)\b|^SEG[-_]/i;

/** "163,99 €", "163.99€", "€163,99", "1 234,56 EUR" */
const RE_PRECO = /(?:€\s*)?(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,2})?)\s*(?:€|EUR)/i;

/** "Franquia 120€", "Franquia: 120 €", "FRANQUIA 90" */
const RE_FRANQUIA = /franquia\s*:?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/i;

/**
 * Normaliza uma designação de serviço tal como aparece no ecrã da Fnac.
 * Remove escalões, parênteses soltos, e corrige a colagem de "ANOS".
 */
export function normalizaNome(bruto) {
  let n = String(bruto || '').toUpperCase();

  // remove intervalos de escalão: (1001-1500), (1449,96-1999,95), (0-250)
  n = n.replace(/\(\s*\d[\d .,]*\s*-\s*\d[\d .,]*\s*\)/g, ' ');
  // parênteses soltos que sobrem
  n = n.replace(/[()]/g, ' ');
  // "4ANOS" -> "4 ANOS"; "+3ANOS" -> "+3 ANOS"
  n = n.replace(/(\d)\s*ANOS?\b/g, '$1 ANOS');
  n = n.replace(/(\d)(AN[OS]?)/g, '$1 $2');
  // erros de grafia comuns
  n = n.replace(/\bANS\b/g, 'ANOS');
  n = n.replace(/\bANO\b/g, 'ANOS');
  // espaços
  n = n.replace(/\s+/g, ' ').trim();
  // pontuação pendurada no fim
  n = n.replace(/[.,;:\-]+$/, '').trim();

  return n;
}

/** Extrai um preço formatado "163,99 €" de uma linha, ou "" se não houver. */
export function extraiPreco(linha) {
  const m = RE_PRECO.exec(String(linha || ''));
  if (!m) return '';
  const num = m[1].replace(/[ .](?=\d{3}\b)/g, '').replace('.', ',');
  return num + ' €';
}

/** Extrai a franquia "120 €" de um texto completo, ou "" se não houver. */
export function extraiFranquia(texto) {
  const m = RE_FRANQUIA.exec(String(texto || ''));
  if (!m) return '';
  return m[1].replace('.', ',') + ' €';
}

/**
 * Deduz a categoria a partir das designações dos serviços.
 * Mesmas regras que o prompt antigo. Devolve "" em caso de dúvida.
 */
export function deduzCategoria(nomes) {
  const t = (Array.isArray(nomes) ? nomes.join(' ') : String(nomes || '')).toUpperCase();

  if (/\bFOTO\b/.test(t)) return 'Foto';
  if (/INFORM|LAPTOP|NOMAD/.test(t)) return 'Informática';
  if (/TELM|SMTP|SMARTPHONE/.test(t)) return 'Telecom';
  if (/AUSCUL|\bSOM\b/.test(t) && !/\bTV\b/.test(t)) return 'Som';
  if (/\bTV\b|VIDEO/.test(t)) return 'TV';
  if (/COZ&LAR|COZ ?& ?LAR/.test(t)) return 'Casa';
  if (/DANOS.*EXT ?GARANT/.test(t)) return 'Casa';
  return '';
}

/**
 * Lê o texto copiado do separador "Planos Proteção" e devolve a mesma
 * estrutura que a rota de IA devolvia.
 *
 * @param {string} texto  texto colado pelo utilizador
 * @returns {{equipamento:string, franquia:string, categoria:string,
 *            servicos:Array<{nome:string, preco:string}>}}
 */
export function parsePrintTexto(texto) {
  const linhas = String(texto || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const servicos = [];
  const naoServico = [];

  for (const linha of linhas) {
    // a franquia sozinha não é um serviço
    if (/^franquia/i.test(linha)) continue;

    // separa a designação do preço: o preço está sempre à direita
    const preco = extraiPreco(linha);
    let designacao = linha;
    if (preco) {
      const m = RE_PRECO.exec(linha);
      designacao = linha.slice(0, m.index);
    }

    const nome = normalizaNome(designacao);
    if (!nome) continue;

    if (RE_LINHA_SERVICO.test(nome)) {
      servicos.push({ nome, preco });
    } else {
      naoServico.push(linha.trim());
    }
  }

  // o equipamento é, tipicamente, a linha mais longa que não é um serviço
  const equipamento = naoServico
    .filter((l) => l.length > 6 && !/^\d+$/.test(l))
    .sort((a, b) => b.length - a.length)[0] || '';

  return {
    equipamento: equipamento.replace(/\s+/g, ' ').trim(),
    franquia: extraiFranquia(texto),
    categoria: deduzCategoria(servicos.map((s) => s.nome)),
    servicos,
  };
}

/**
 * Deduz a categoria de seguro a partir da designação de um EQUIPAMENTO
 * (não de um seguro). Serve para preencher a etiqueta só com o EAN.
 *
 * Devolve "" quando não há certeza — nesse caso o interface pergunta, em vez
 * de arriscar a tabela de preços errada.
 *
 * @param {string} desc  designação do artigo, ex. "APPLE MACBOOK AIR 13 M3"
 * @returns {string} chave de CATEGORIAS, ou ""
 */
export function categoriaDoArtigo(desc) {
  const d = String(desc || '').toUpperCase();
  if (!d) return '';

  // Recondicionados ganha a tudo — é uma tabela de preços própria
  if (/\bRECOND|\bSEMINOVO|\bREFURB/.test(d)) return 'Recondicionados';

  if (/\b(TELM|TELEM|TELEMOV|SMTP|SMARTPHONE|TLM|IPHONE|GALAXY\s+S|PIXEL)\b/.test(d)) return 'Telecom';
  if (/\b(TABLET|TAB|IPAD)\b/.test(d)) return 'Telecom';
  if (/\b(TV|LCD|LED|OLED|QLED)\b/.test(d)) return 'TV';
  // prefixos, não palavras inteiras: "AUSCULTADORES", "EARBUDS", "PORTÁTIL"
  if (/\b(AUSCUL|HEADPHONE|EARBUD|COLUNA|SOUNDBAR|BARRA\s+SOM|AIRPODS|HIFI)/.test(d)) return 'Som';
  if (/\b(NOTEB|PORT[ÁA]TIL|LAPTOP|MACBOOK|DESKTOP|MONITOR|IMAC)/.test(d)) return 'Informática';
  if (/\b(FOTO|C[ÂA]MARA|CAMERA|GOPRO|LENTE|REFLEX|MIRRORLESS)/.test(d)) return 'Foto';
  if (/\b(COZ&LAR|ASPIRADOR|M[ÁA]QUINA\s+CAF[ÉE]|FRITADEIRA|MICROONDAS)/.test(d)) return 'Casa';

  // Deliberadamente sem regra para drones, gaming e mobilidade eléctrica:
  // a família de seguro varia e não vale a pena adivinhar.
  return '';
}

/**
 * Extrai o intervalo de escalão de uma designação, ANTES de a normalizar.
 * "SEG DDR FOTO 1 ANO (1001-1500)" -> { min: 1001, max: 1500 }
 * Devolve null quando a designação não tem escalão.
 */
export function extraiEscalao(bruto) {
  const m = /\(\s*(\d[\d .,]*)\s*-\s*(\d[\d .,]*)\s*\)/.exec(String(bruto || ''));
  if (!m) return null;
  const num = (s) => parseFloat(s.replace(/[ .](?=\d{3}\b)/g, '').replace(',', '.'));
  const min = num(m[1]);
  const max = num(m[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

/**
 * Constrói o catálogo a partir das linhas de vendas que a aplicação já tem
 * carregadas (stockRowsPO2 / stockRowsPO3) — sem pedir upload nenhum.
 *
 * Cada linha traz { name, pvp, qty }. As designações de seguro guardam o
 * escalão de valor do artigo entre parênteses, o que nos permite depois
 * escolher o preço certo para um artigo concreto.
 *
 * @param {Array<{name:string, pvp:number, qty:number}>} rows
 * @returns {Array<{nome:string, escalao:{min:number,max:number}|null,
 *                  preco:string, valor:number, ocorrencias:number, categoria:string}>}
 */
export function catalogoDeVendas(rows) {
  if (!Array.isArray(rows)) return [];

  const mapa = new Map();

  for (const r of rows) {
    if (!r || !r.name) continue;
    const bruto = String(r.name);
    const nome = normalizaNome(bruto);
    if (!nome || !RE_LINHA_SERVICO.test(nome)) continue;

    // ignora devoluções — preço negativo ou quantidade negativa
    const valor = Number(r.pvp);
    if (!Number.isFinite(valor) || valor <= 0) continue;
    if (Number(r.qty) < 0) continue;

    const escalao = extraiEscalao(bruto);
    const chave = nome + '|' + (escalao ? escalao.min + '-' + escalao.max : '');

    const prev = mapa.get(chave) || { nome, escalao, valores: [], ocorrencias: 0 };
    prev.ocorrencias += 1;
    prev.valores.push(Math.round(valor * 100) / 100);
    mapa.set(chave, prev);
  }

  return Array.from(mapa.values())
    .map((e) => {
      // o preço mais frequente — imune a linhas com desconto pontual
      const contagem = new Map();
      for (const v of e.valores) contagem.set(v, (contagem.get(v) || 0) + 1);
      const top = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1])[0];
      const valor = top ? top[0] : 0;
      return {
        nome: e.nome,
        escalao: e.escalao,
        valor,
        preco: valor.toFixed(2).replace('.', ',') + ' €',
        ocorrencias: e.ocorrencias,
        categoria: deduzCategoria([e.nome]),
      };
    })
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

/**
 * Dado o catálogo e o preço de um artigo, devolve as linhas de seguro
 * aplicáveis — escolhendo automaticamente o escalão certo.
 *
 * @param {Array} catalogo   saída de catalogoDeVendas
 * @param {string} categoria "Foto", "Informática", …
 * @param {number} precoArtigo  PVP do artigo, com IVA
 * @returns {Array<{nome:string, preco:string}>}
 */
export function segurosParaArtigo(catalogo, categoria, precoArtigo) {
  if (!Array.isArray(catalogo)) return [];
  const p = Number(precoArtigo);

  const doGrupo = catalogo.filter((c) => !categoria || c.categoria === categoria);

  // agrupa por designação; dentro de cada uma escolhe o escalão que cobre o preço
  const porNome = new Map();
  for (const c of doGrupo) {
    const lista = porNome.get(c.nome) || [];
    lista.push(c);
    porNome.set(c.nome, lista);
  }

  const saida = [];
  for (const [nome, variantes] of porNome) {
    const comEscalao = variantes.filter((v) => v.escalao);

    if (!comEscalao.length || !Number.isFinite(p)) {
      // sem escalões: fica o preço mais frequente
      const melhor = variantes.sort((a, b) => b.ocorrencias - a.ocorrencias)[0];
      saida.push({ nome, preco: melhor.preco });
      continue;
    }

    const certo = comEscalao.find((v) => p >= v.escalao.min && p <= v.escalao.max);
    if (certo) {
      saida.push({ nome, preco: certo.preco });
    } else {
      // fora de todos os escalões: nada de inventar um preço
      saida.push({ nome, preco: '' });
    }
  }

  return saida.sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Constrói um catálogo de seguros a partir de uma sheet no formato
 * "BD TT SEGUROS" (array de arrays, primeira linha = cabeçalhos).
 *
 * Localiza as colunas por nome, em vez de índices fixos, porque o layout do
 * export varia. Devolve um mapa designação -> { nome, precos:[], ocorrencias }.
 *
 * @param {Array<Array<any>>} aoa
 * @returns {Array<{nome:string, preco:string, ocorrencias:number, categoria:string}>}
 */
export function parseCatalogoAoa(aoa) {
  if (!Array.isArray(aoa) || aoa.length < 2) return [];

  const cab = (aoa[0] || []).map((c) => String(c || '').toLowerCase().trim());
  const acha = (re) => cab.findIndex((c) => re.test(c));

  const iDesc = acha(/descri|designa|artigo|produto/);
  const iPreco = acha(/pre[çc]o|valor|pvp|montante|total/);
  if (iDesc < 0) return [];

  const mapa = new Map();

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;

    const nome = normalizaNome(row[iDesc]);
    if (!nome || !RE_LINHA_SERVICO.test(nome)) continue;

    const bruto = iPreco >= 0 ? row[iPreco] : null;
    const valor = typeof bruto === 'number' ? bruto : parseFloat(String(bruto || '').replace(',', '.'));

    const prev = mapa.get(nome) || { nome, valores: [], ocorrencias: 0 };
    prev.ocorrencias += 1;
    if (Number.isFinite(valor) && valor > 0) prev.valores.push(valor);
    mapa.set(nome, prev);
  }

  return Array.from(mapa.values())
    .map((e) => {
      // o preço mais frequente é o representativo do escalão mais vendido
      const contagem = new Map();
      for (const v of e.valores) contagem.set(v, (contagem.get(v) || 0) + 1);
      const top = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1])[0];
      return {
        nome: e.nome,
        ocorrencias: e.ocorrencias,
        preco: top ? top[0].toFixed(2).replace('.', ',') + ' €' : '',
        categoria: deduzCategoria([e.nome]),
      };
    })
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}
