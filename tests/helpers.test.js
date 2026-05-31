import { describe, it, expect } from 'vitest';
import {
  normalizeEAN, _catFromTipo, _dayFromSerial, _ymdFromSerial,
  _workingDaysInMonth, _daysRemainingInMonth, _hoursFromCarga, _acumulaLines,
  _isWorkedCell, _matchSchedCollab, apportionLargestRemainder,
  parsePermanenciasText, _zoneFixtureScore,
} from '../app/lib/helpers.js';
import { parseNum } from '../app/lib/format.js';

// v3.23.0: testes contra o código REAL (app/lib/helpers.js), não cópias.
// Cobrem os bugs corrigidos ao longo das versões 3.21–3.22.

describe('normalizeEAN', () => {
  it('extrai dígitos e tira zeros à esquerda', () => {
    expect(normalizeEAN('05601234567890')).toBe('5601234567890');
    expect(normalizeEAN(' 5601-2345-67890 ')).toBe('5601234567890');
  });
  it('lida com null/vazio', () => {
    expect(normalizeEAN(null)).toBe('');
    expect(normalizeEAN(undefined)).toBe('');
    expect(normalizeEAN('   ')).toBe('');
  });
  it('corrige notação científica do Excel', () => {
    expect(normalizeEAN('5.60123e+12')).toBe('5601230000000');
  });
  it('⚠ documenta risco de colisão por strip de zeros', () => {
    // dois EANs distintos colapsam para a mesma key — comportamento conhecido
    expect(normalizeEAN('0012345')).toBe(normalizeEAN('12345'));
  });
});

describe('_catFromTipo', () => {
  it('mapeia TIPO → categoria', () => {
    expect(_catFromTipo('EQUIPAMENTO TV')).toBe('tv');
    expect(_catFromTipo('SEGURO HARDWARE')).toBe('hardware');
    expect(_catFromTipo('ADDON SMARTWATCH')).toBe('smartwatch');
    expect(_catFromTipo('qualquer coisa')).toBe('other');
  });
});

describe('Excel serials', () => {
  it('_dayFromSerial devolve o dia do mês', () => {
    // 46143 = 2026-05-01
    expect(_dayFromSerial(46143)).toBe(1);
  });
  it('_ymdFromSerial devolve ano/mês/dia', () => {
    expect(_ymdFromSerial(46143)).toEqual({ year: 2026, month: 5, day: 1 });
  });
  it('serial inválido → null/0', () => {
    expect(_ymdFromSerial('xx')).toBe(null);
    expect(_dayFromSerial('xx')).toBe(0);
  });
});

describe('_workingDaysInMonth', () => {
  it('exclui domingos', () => {
    // Maio 2026 tem 31 dias, 5 domingos (3,10,17,24,31) → 26 dias úteis
    expect(_workingDaysInMonth(2026, 5, 1)).toBe(26);
  });
  it('conta a partir de fromDay', () => {
    // de 29 a 31 Mai 2026: 29(sex),30(sáb),31(dom→exclui) = 2
    expect(_workingDaysInMonth(2026, 5, 29)).toBe(2);
  });
});

describe('_daysRemainingInMonth', () => {
  it('com refDay conta a partir de refDay+1 (inclui dias entre refDay e hoje)', () => {
    // refDay=27 Maio 2026 → conta 28,29,30,31(dom exclui) = 3
    const r = _daysRemainingInMonth('2026-05', 27);
    expect(r.refDay).toBe(27);
    expect(r.days).toBe(3);
    expect(r.total).toBe(26);
  });
  it('sem monthKey → fallback', () => {
    expect(_daysRemainingInMonth(null)).toEqual({ days: 22, total: 26, refDay: null });
  });
});

describe('_hoursFromCarga', () => {
  it('extrai horas', () => {
    expect(_hoursFromCarga('40H00 Semanais')).toBe(40);
    expect(_hoursFromCarga('20H00')).toBe(20);
    expect(_hoursFromCarga('')).toBe(40); // default
  });
});

describe('apportionLargestRemainder (diarização justa)', () => {
  it('16 seguros por [40,40,40,20]h → [5,5,4,2] (part-time não penalizado)', () => {
    const out = apportionLargestRemainder(16, [40, 40, 40, 20]);
    expect(out.reduce((a, b) => a + b, 0)).toBe(16);
    expect(out[3]).toBe(2);            // o de 20h recebe 2 (não 1)
    expect(out.filter(x => x === 5).length).toBe(2);
    expect(out.filter(x => x === 4).length).toBe(1);
  });
  it('soma sempre exactamente o total', () => {
    const out = apportionLargestRemainder(31, [40, 40, 35, 20, 20]);
    expect(out.reduce((a, b) => a + b, 0)).toBe(31);
  });
  it('pesos a zero → distribui igualmente', () => {
    expect(apportionLargestRemainder(4, [0, 0, 0, 0])).toEqual([1, 1, 1, 1]);
  });
  it('lista vazia → []', () => {
    expect(apportionLargestRemainder(10, [])).toEqual([]);
  });
});

describe('_isWorkedCell (horário PDF)', () => {
  it('folgas/férias → não trabalhado', () => {
    ['FC', 'FO', 'FER', 'FÉRIAS', 'ANIV', 'V', ''].forEach(c =>
      expect(_isWorkedCell(c)).toBe(false));
  });
  it('turnos → trabalhado', () => {
    ['100PA', '110RA', '140UA', '190', '130', 'PM', 'PT'].forEach(c =>
      expect(_isWorkedCell(c)).toBe(true));
  });
});

describe('_matchSchedCollab (match nome ↔ horário)', () => {
  const sched = [
    { nif: '1365', name: 'DAVID DINIS', days: {} },
    { nif: '58988', name: 'RICARDO SILVA', days: {} },
  ];
  it('match por nome completo', () => {
    expect(_matchSchedCollab({ name: 'David Dinis' }, sched)?.nif).toBe('1365');
  });
  it('alias RICARDO GABRIEL → RICARDO SILVA', () => {
    expect(_matchSchedCollab({ name: 'RICARDO GABRIEL' }, sched)?.nif).toBe('58988');
  });
  it('match por NIF mesmo com nome diferente', () => {
    expect(_matchSchedCollab({ nif: '58988', name: 'Outro Nome' }, sched)?.name).toBe('RICARDO SILVA');
  });
  it('sem match → null', () => {
    expect(_matchSchedCollab({ name: 'JOÃO NINGUÉM' }, sched)).toBe(null);
  });
});

describe('parseNum (preços PT/EN)', () => {
  it('formato PT "1.234,56" → 1234.56', () => {
    expect(parseNum('1.234,56')).toBe(1234.56);
  });
  it('formato EN "1,234.56" → 1234.56', () => {
    expect(parseNum('1,234.56')).toBe(1234.56);
  });
  it('decimal PT só com vírgula "32,19" → 32.19', () => {
    expect(parseNum('32,19')).toBe(32.19);
  });
  it('tira € e %', () => {
    expect(parseNum('19,99€')).toBe(19.99);
    expect(parseNum('30%')).toBe(30);
  });
  it('null/vazio/lixo → 0', () => {
    expect(parseNum(null)).toBe(0);
    expect(parseNum('')).toBe(0);
    expect(parseNum('abc')).toBe(0);
  });
  it('número passa directo', () => {
    expect(parseNum(42)).toBe(42);
    expect(parseNum(Infinity)).toBe(0);
  });
});

describe('_acumulaLines', () => {
  it('parte em 2 linhas equilibradas', () => {
    const [a, b] = _acumulaLines('um dois tres quatro');
    expect(a).toBe('um dois');
    expect(b).toBe('tres quatro');
  });
  it('1 palavra → segunda linha vazia', () => {
    expect(_acumulaLines('só')).toEqual(['só', '']);
  });
});

describe('_zoneFixtureScore (match zona ↔ móvel)', () => {
  it('móvel inteiro contido no nome da zona pontua mais', () => {
    expect(_zoneFixtureScore('MLS SOM (LADO SOM)', { label: 'MLS' })).toBeGreaterThan(0);
    expect(_zoneFixtureScore('PML APPLE', { label: 'PML APPLE' })).toBeGreaterThanOrEqual(4);
  });
  it('sem tokens partilhados → 0', () => {
    expect(_zoneFixtureScore('CORREDOR DA TV', { label: 'PML TELECOM' })).toBe(0);
  });
  it('ignora acentos e pontuação', () => {
    expect(_zoneFixtureScore('Tríptico Som', { label: 'TRIPTICO' })).toBeGreaterThan(0);
  });
});

describe('parsePermanenciasText (horário PDF colado)', () => {
  const sample = [
    'qui', '30', 'sex', '1-mai', 's�b', '2',
    '1365', 'DAVID DINIS', '(2/8)8s', '140UA', 'FC', '100PA',
    '5537', 'BEATRIZ PINTO', '(1/8)8s', 'FO', '110RA', 'Fer',
  ].join('\n');
  it('extrai dias e colaboradores', () => {
    const r = parsePermanenciasText(sample);
    expect(r).not.toBe(null);
    expect(r.days.length).toBe(3);
    expect(r.days[1]).toEqual({ dow: 'sex', day: 1, monthHint: 'mai' });
    expect(r.collabs.length).toBe(2);
    expect(r.collabs[0].nif).toBe('1365');
    expect(r.collabs[0].name).toBe('DAVID DINIS');
    expect(r.collabs[0].cells).toContain('140UA');
  });
  it('texto sem dias → null', () => {
    expect(parsePermanenciasText('lixo qualquer')).toBe(null);
    expect(parsePermanenciasText('')).toBe(null);
    expect(parsePermanenciasText(null)).toBe(null);
  });
});
