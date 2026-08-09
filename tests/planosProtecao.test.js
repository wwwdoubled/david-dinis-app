import { describe, it, expect } from 'vitest';
import { PLANOS, FAMILIAS, planosParaArtigo, tectoDaFamilia } from '../app/lib/planosProtecao.js';

describe('tabela de planos', () => {
  it('tem as nove famílias do ficheiro oficial', () => {
    expect(FAMILIAS).toEqual([
      'Telemóveis', 'Equip. Eletrónicos', 'Tablets', 'Smartwatches', 'Consolas',
      'Bicicletas Elétricas', 'Instrumentos Musicais', 'Videojogos', 'Extensões de Garantia',
    ]);
  });

  it('os escalões de cada plano estão ordenados e não se sobrepõem', () => {
    for (const plano of PLANOS) {
      for (let i = 1; i < plano.escaloes.length; i++) {
        const ant = plano.escaloes[i - 1];
        const act = plano.escaloes[i];
        expect(act.min).toBeGreaterThan(ant.min);
        expect(act.min).toBeGreaterThanOrEqual(ant.max);
      }
    }
  });

  it('todos os escalões têm preço positivo e min <= max', () => {
    for (const plano of PLANOS) {
      for (const e of plano.escaloes) {
        expect(e.pvp).toBeGreaterThan(0);
        expect(e.max).toBeGreaterThanOrEqual(e.min);
      }
    }
  });
});

describe('planosParaArtigo', () => {
  it('telemóvel de 1.500 € → o escalão 1.449,96-1.999,95', () => {
    const r = planosParaArtigo('Telemóveis', 1500);
    const doisAnos = r.find((x) => x.premio === '2 Anos');
    expect(doisAnos.preco).toBe('363,99 €');
    expect(doisAnos.escalao).toEqual({ min: 1449.96, max: 1999.95 });
  });

  it('o mesmo telemóvel mais barato cai noutro escalão', () => {
    const r = planosParaArtigo('Telemóveis', 250);
    expect(r.find((x) => x.premio === '2 Anos').preco).toBe('99,99 €');
    expect(r.find((x) => x.premio === 'Anual').preco).toBe('69,99 €');
  });

  it('respeita os limites exactos do escalão', () => {
    expect(planosParaArtigo('Telemóveis', 99.95).find((x) => x.premio === '2 Anos').preco).toBe('49,99 €');
    expect(planosParaArtigo('Telemóveis', 99.96).find((x) => x.premio === '2 Anos').preco).toBe('69,99 €');
  });

  it('equipamentos electrónicos de 1.200 €', () => {
    const r = planosParaArtigo('Equip. Eletrónicos', 1200);
    expect(r.find((x) => x.premio === 'Bienal').preco).toBe('217,99 €');
    expect(r.find((x) => x.premio === 'Anual').preco).toBe('163,99 €');
  });

  it('traz a franquia quando a tabela a define (bicicletas)', () => {
    const r = planosParaArtigo('Bicicletas Elétricas', 400);
    expect(r[0].franquia).toBe('20,00 €');
  });

  it('traz o addon quando existe (smartwatch bimestral)', () => {
    const r = planosParaArtigo('Smartwatches', 150);
    const bim = r.find((x) => x.premio === 'Bimestral');
    expect(bim.preco).toBe('5,90 €');
    expect(bim.addon).toBe('4,00 €');
  });

  it('devolve vazio para artigo acima do tecto da família', () => {
    expect(planosParaArtigo('Telemóveis', 99999)).toEqual([]);
  });

  it('aguenta entradas inválidas', () => {
    expect(planosParaArtigo('', 100)).toEqual([]);
    expect(planosParaArtigo('Telemóveis', null)).toEqual([]);
    expect(planosParaArtigo('Inexistente', 100)).toEqual([]);
  });
});

describe('tectoDaFamilia', () => {
  it('devolve o maior valor coberto', () => {
    expect(tectoDaFamilia('Telemóveis')).toBe(2499.95);
    expect(tectoDaFamilia('Inexistente')).toBe(0);
  });
});
