import { describe, it, expect } from 'vitest';
import {
  normalizaNome,
  extraiPreco,
  extraiFranquia,
  deduzCategoria,
  parsePrintTexto,
  parseCatalogoAoa,
  extraiEscalao,
  catalogoDeVendas,
  segurosParaArtigo,
  categoriaDoArtigo,
} from '../app/lib/etiquetasParser.js';

describe('normalizaNome', () => {
  it('remove o intervalo de escalão', () => {
    expect(normalizaNome('SEG DDR FOTO 1 ANO (1001-1500)')).toBe('SEG DDR FOTO 1 ANOS');
    expect(normalizaNome('SEG DDR TV 2 ANOS (1449,96-1999,95)')).toBe('SEG DDR TV 2 ANOS');
    expect(normalizaNome('SEG-EXT GARANTIA TV +3 ANOS (0-250)')).toBe('SEG-EXT GARANTIA TV +3 ANOS');
  });

  it('separa ANOS colado ao número', () => {
    expect(normalizaNome('SEG MULTIGARANTIAS FOTO 4ANOS')).toBe('SEG MULTIGARANTIAS FOTO 4 ANOS');
    expect(normalizaNome('SEG-EXT GARANTIA FOTO +3ANOS')).toBe('SEG-EXT GARANTIA FOTO +3 ANOS');
  });

  it('corrige ANS e ANO para ANOS', () => {
    expect(normalizaNome('SEG DDR INFORM 4ANS')).toBe('SEG DDR INFORM 4 ANOS');
    expect(normalizaNome('SEG DDR INFORM 2 ANO')).toBe('SEG DDR INFORM 2 ANOS');
  });

  it('normaliza espaços e devolve vazio para lixo', () => {
    expect(normalizaNome('  SEG   DDR    FOTO  ')).toBe('SEG DDR FOTO');
    expect(normalizaNome('')).toBe('');
    expect(normalizaNome(null)).toBe('');
  });
});

describe('extraiPreco', () => {
  it('apanha os formatos habituais', () => {
    expect(extraiPreco('SEG DDR FOTO 1 ANO 163,99 €')).toBe('163,99 €');
    expect(extraiPreco('SEG DDR TV 2 ANOS  49.90€')).toBe('49,90 €');
    expect(extraiPreco('SEG X 1 234,56 EUR')).toBe('1234,56 €');
  });

  it('devolve vazio quando não há preço', () => {
    expect(extraiPreco('SEG DDR FOTO 1 ANO')).toBe('');
    expect(extraiPreco('')).toBe('');
  });
});

describe('extraiFranquia', () => {
  it('lê o selo de franquia', () => {
    expect(extraiFranquia('linha\nFranquia 120€\noutra')).toBe('120 €');
    expect(extraiFranquia('FRANQUIA: 90 €')).toBe('90 €');
  });
  it('devolve vazio se não aparecer', () => {
    expect(extraiFranquia('SEG DDR FOTO 1 ANO 163,99 €')).toBe('');
  });
});

describe('deduzCategoria', () => {
  it('mapeia as designações às categorias', () => {
    expect(deduzCategoria(['SEG DDR FOTO 1 ANOS'])).toBe('Foto');
    expect(deduzCategoria(['SEG DDR INFORMATICA 2 ANOS'])).toBe('Informática');
    expect(deduzCategoria(['SEG-EXT. GARANTIA LAPTOP +3 ANOS'])).toBe('Informática');
    expect(deduzCategoria(['SEG DDR TELM/SMTP 1 ANOS'])).toBe('Telecom');
    expect(deduzCategoria(['SEG MULTIGARANTIAS TV/VIDEO 4 ANOS'])).toBe('TV');
    expect(deduzCategoria(['SEG-EXT GARANTIA AUSCUL +3 ANOS'])).toBe('Som');
    expect(deduzCategoria(['SEG-EXT. GARANTIA +2 ANOS COZ&LAR'])).toBe('Casa');
  });

  it('devolve vazio em caso de dúvida', () => {
    expect(deduzCategoria(['SEG QUALQUER COISA'])).toBe('');
    expect(deduzCategoria([])).toBe('');
  });
});

describe('parsePrintTexto', () => {
  const texto = `
Planos Proteção
SEG DDR INFORM BIMESTRAL FNAC CLOUD (0-250)   9,99 €
SEG DDR INFORMATICA 1 ANO (1001-1500)   163,99 €
SEG DDR INFORMATICA 2 ANO (1001-1500)   249,99 €
SEG-EXT. GARANTIA LAPTOP +3ANOS   99,90 €
Franquia 120€
APPLE MACBOOK AIR 13 M3 16GB 512GB MIDNIGHT
`;

  it('extrai serviços, preços, franquia e categoria', () => {
    const r = parsePrintTexto(texto);
    expect(r.servicos).toHaveLength(4);
    expect(r.servicos[1]).toEqual({ nome: 'SEG DDR INFORMATICA 1 ANOS', preco: '163,99 €' });
    expect(r.servicos[2].nome).toBe('SEG DDR INFORMATICA 2 ANOS');
    expect(r.franquia).toBe('120 €');
    expect(r.categoria).toBe('Informática');
  });

  it('identifica o equipamento', () => {
    expect(parsePrintTexto(texto).equipamento).toBe('APPLE MACBOOK AIR 13 M3 16GB 512GB MIDNIGHT');
  });

  it('ignora linhas de franquia soltas', () => {
    const r = parsePrintTexto('Franquia 90€\nSEG DDR TELM/SMTP 1 ANO 59,99 €');
    expect(r.servicos).toHaveLength(1);
    expect(r.franquia).toBe('90 €');
  });

  it('aguenta texto vazio', () => {
    const r = parsePrintTexto('');
    expect(r.servicos).toEqual([]);
    expect(r.categoria).toBe('');
    expect(r.equipamento).toBe('');
  });

  it('aceita serviços sem preço', () => {
    const r = parsePrintTexto('SEG DDR FOTO 1 ANO');
    expect(r.servicos[0]).toEqual({ nome: 'SEG DDR FOTO 1 ANOS', preco: '' });
  });
});

describe('parseCatalogoAoa', () => {
  const aoa = [
    ['Loja', 'Descrição', 'Qtd', 'Preço'],
    ['PO2', 'SEG DDR FOTO 1 ANO (0-250)', 1, 49.99],
    ['PO2', 'SEG DDR FOTO 1 ANO (0-250)', 1, 49.99],
    ['PO2', 'SEG DDR FOTO 1 ANO (251-500)', 1, 79.99],
    ['PO2', 'APPLE IPHONE 15 128GB', 1, 899],
    ['PO2', 'SEG DDR TELM/SMTP 2 ANOS', 1, 129.9],
  ];

  it('agrega por designação normalizada e escolhe o preço mais frequente', () => {
    const cat = parseCatalogoAoa(aoa);
    const foto = cat.find((c) => c.nome === 'SEG DDR FOTO 1 ANOS');
    expect(foto.ocorrencias).toBe(3);
    expect(foto.preco).toBe('49,99 €');
    expect(foto.categoria).toBe('Foto');
  });

  it('exclui linhas que não são seguros', () => {
    const cat = parseCatalogoAoa(aoa);
    expect(cat.some((c) => /IPHONE/.test(c.nome))).toBe(false);
    expect(cat).toHaveLength(2);
  });

  it('devolve vazio sem cabeçalho reconhecível', () => {
    expect(parseCatalogoAoa([['a', 'b'], ['x', 'y']])).toEqual([]);
    expect(parseCatalogoAoa([])).toEqual([]);
    expect(parseCatalogoAoa(null)).toEqual([]);
  });
});

describe('extraiEscalao', () => {
  it('lê o intervalo antes da normalização', () => {
    expect(extraiEscalao('SEG DDR FOTO 1 ANO (1001-1500)')).toEqual({ min: 1001, max: 1500 });
    expect(extraiEscalao('SEG DDR TV 2 ANOS (1449,96-1999,95)')).toEqual({ min: 1449.96, max: 1999.95 });
    expect(extraiEscalao('SEG X (0-250)')).toEqual({ min: 0, max: 250 });
  });
  it('devolve null quando não há escalão', () => {
    expect(extraiEscalao('SEG DDR FOTO 1 ANO')).toBeNull();
    expect(extraiEscalao('')).toBeNull();
  });
});

describe('catalogoDeVendas', () => {
  const rows = [
    { name: 'SEG DDR INFORMATICA 1 ANO (0-250)', pvp: 29.99, qty: 1 },
    { name: 'SEG DDR INFORMATICA 1 ANO (0-250)', pvp: 29.99, qty: 1 },
    { name: 'SEG DDR INFORMATICA 1 ANO (0-250)', pvp: 19.99, qty: 1 }, // desconto pontual
    { name: 'SEG DDR INFORMATICA 1 ANO (1001-1500)', pvp: 163.99, qty: 1 },
    { name: 'APPLE MACBOOK AIR 13 M3', pvp: 1299, qty: 1 },
    { name: 'SEG DDR FOTO 2 ANOS', pvp: -49.99, qty: -1 }, // devolução
  ];

  it('separa escalões da mesma designação', () => {
    const cat = catalogoDeVendas(rows);
    const inf = cat.filter((c) => c.nome === 'SEG DDR INFORMATICA 1 ANOS');
    expect(inf).toHaveLength(2);
    expect(inf.map((c) => c.escalao)).toEqual(
      expect.arrayContaining([{ min: 0, max: 250 }, { min: 1001, max: 1500 }])
    );
  });

  it('escolhe o preço mais frequente, ignorando descontos pontuais', () => {
    const cat = catalogoDeVendas(rows);
    const baixo = cat.find((c) => c.escalao?.max === 250);
    expect(baixo.preco).toBe('29,99 €');
    expect(baixo.ocorrencias).toBe(3);
  });

  it('exclui artigos e devoluções', () => {
    const cat = catalogoDeVendas(rows);
    expect(cat.some((c) => /MACBOOK/.test(c.nome))).toBe(false);
    expect(cat.some((c) => /FOTO/.test(c.nome))).toBe(false);
  });

  it('aguenta entrada inválida', () => {
    expect(catalogoDeVendas(null)).toEqual([]);
    expect(catalogoDeVendas([])).toEqual([]);
    expect(catalogoDeVendas([{ name: null }, {}])).toEqual([]);
  });
});

describe('segurosParaArtigo', () => {
  const cat = catalogoDeVendas([
    { name: 'SEG DDR INFORMATICA 1 ANO (0-250)', pvp: 29.99, qty: 1 },
    { name: 'SEG DDR INFORMATICA 1 ANO (1001-1500)', pvp: 163.99, qty: 1 },
    { name: 'SEG-EXT. GARANTIA LAPTOP +3 ANOS', pvp: 99.9, qty: 1 },
  ]);

  it('escolhe o escalão que cobre o preço do artigo', () => {
    const r = segurosParaArtigo(cat, 'Informática', 1299);
    expect(r.find((x) => x.nome === 'SEG DDR INFORMATICA 1 ANOS').preco).toBe('163,99 €');
  });

  it('muda de escalão quando o artigo é mais barato', () => {
    const r = segurosParaArtigo(cat, 'Informática', 199);
    expect(r.find((x) => x.nome === 'SEG DDR INFORMATICA 1 ANOS').preco).toBe('29,99 €');
  });

  it('deixa o preço vazio se o artigo cai fora de todos os escalões', () => {
    const r = segurosParaArtigo(cat, 'Informática', 5000);
    expect(r.find((x) => x.nome === 'SEG DDR INFORMATICA 1 ANOS').preco).toBe('');
  });

  it('mantém as designações sem escalão', () => {
    const r = segurosParaArtigo(cat, 'Informática', 1299);
    expect(r.find((x) => x.nome === 'SEG-EXT. GARANTIA LAPTOP +3 ANOS').preco).toBe('99,90 €');
  });

  it('aguenta catálogo vazio', () => {
    expect(segurosParaArtigo([], 'Foto', 100)).toEqual([]);
    expect(segurosParaArtigo(null, 'Foto', 100)).toEqual([]);
  });
});

describe('categoriaDoArtigo', () => {
  it('classifica os casos claros', () => {
    expect(categoriaDoArtigo('APPLE MACBOOK AIR 13 M3 16GB')).toBe('Informática');
    expect(categoriaDoArtigo('APPLE IPHONE 15 128GB PRETO')).toBe('Telecom');
    expect(categoriaDoArtigo('SAMSUNG GALAXY TAB S9')).toBe('Telecom');
    expect(categoriaDoArtigo('LG TV OLED 55C5 4K')).toBe('TV');
    expect(categoriaDoArtigo('SONY AUSCULTADORES WH-1000XM5')).toBe('Som');
    expect(categoriaDoArtigo('CANON CAMARA EOS R50')).toBe('Foto');
    expect(categoriaDoArtigo('ASPIRADOR DYSON V15')).toBe('Casa');
  });

  it('recondicionados ganham a tudo', () => {
    expect(categoriaDoArtigo('IPHONE 14 RECONDICIONADO')).toBe('Recondicionados');
    expect(categoriaDoArtigo('MACBOOK PRO REFURB')).toBe('Recondicionados');
  });

  it('devolve vazio quando não há certeza', () => {
    expect(categoriaDoArtigo('DJI MAVIC 3 DRONE')).toBe('');
    expect(categoriaDoArtigo('PLAYSTATION 5 SLIM')).toBe('');
    expect(categoriaDoArtigo('TROTINETE XIAOMI')).toBe('');
    expect(categoriaDoArtigo('')).toBe('');
    expect(categoriaDoArtigo(null)).toBe('');
  });
});
