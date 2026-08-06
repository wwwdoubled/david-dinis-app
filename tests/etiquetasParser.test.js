import { describe, it, expect } from 'vitest';
import {
  normalizaNome,
  extraiPreco,
  extraiFranquia,
  deduzCategoria,
  parsePrintTexto,
  parseCatalogoAoa,
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
