import { describe, it, expect } from 'vitest';
import {
  PLANOS, FAMILIAS, planosParaArtigo, tectoDaFamilia,
  familiaDaTabela, grupoEG, extensoesParaArtigo,
} from '../app/lib/planosProtecao.js';

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

describe('familiaDaTabela — cruzamento EAN → família', () => {
  it('classifica os casos claros', () => {
    expect(familiaDaTabela('APPLE IPHONE 16 128GB', 'TELECOM')).toBe('Telemóveis');
    expect(familiaDaTabela('SAMSUNG GALAXY TAB S9', '')).toBe('Tablets');
    expect(familiaDaTabela('APPLE WATCH SERIES 10', '')).toBe('Smartwatches');
    expect(familiaDaTabela('SONY PLAYSTATION 5 SLIM', '')).toBe('Consolas');
    expect(familiaDaTabela('TROTINETE XIAOMI PRO 4', '')).toBe('Bicicletas Elétricas');
    expect(familiaDaTabela('GUITARRA FENDER STRATOCASTER', '')).toBe('Instrumentos Musicais');
    expect(familiaDaTabela('LG TV OLED 55C5', '')).toBe('Equip. Eletrónicos');
    expect(familiaDaTabela('APPLE MACBOOK AIR M3', '')).toBe('Equip. Eletrónicos');
  });

  it('o mais específico ganha ao genérico', () => {
    // "APPLE WATCH" tem WATCH — não deve cair em electrónica
    expect(familiaDaTabela('APPLE WATCH ULTRA 2', '')).toBe('Smartwatches');
    // trotinete eléctrica não é electrónica genérica
    expect(familiaDaTabela('SCOOTER ELETRICA NINEBOT', '')).toBe('Bicicletas Elétricas');
  });

  it('usa a família Fnac quando a descrição não chega', () => {
    expect(familiaDaTabela('XPTO 1234', 'TELEMOVEIS')).toBe('Telemóveis');
  });

  it('devolve vazio quando não há certeza', () => {
    expect(familiaDaTabela('ARTIGO DESCONHECIDO', '')).toBe('');
    expect(familiaDaTabela('', '')).toBe('');
    expect(familiaDaTabela(null, null)).toBe('');
  });
});

describe('grupoEG e extensoesParaArtigo', () => {
  it('identifica o grupo de extensão de garantia', () => {
    expect(grupoEG('APPLE MACBOOK AIR M3', '')).toBe('Informática Portátil');
    expect(grupoEG('MONITOR DELL 27', '')).toBe('Informática Fixa');
    expect(grupoEG('LG TV OLED 55C5', '')).toBe('Imagem e Som');
    expect(grupoEG('ASPIRADOR DYSON V15', '')).toBe('PAE');
    expect(grupoEG('ARTIGO XPTO', '')).toBe('');
  });

  it('devolve só as extensões do grupo certo', () => {
    const r = extensoesParaArtigo('Imagem e Som', 500);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => /IMAGEM E SOM/i.test(p.produto))).toBe(true);
  });

  it('portátil não traz as de informática fixa', () => {
    const r = extensoesParaArtigo('Informática Portátil', 900);
    expect(r.every((p) => /PORT[ÁA]TIL/i.test(p.produto))).toBe(true);
  });

  it('sem grupo não devolve nada', () => {
    expect(extensoesParaArtigo('', 500)).toEqual([]);
  });
});
