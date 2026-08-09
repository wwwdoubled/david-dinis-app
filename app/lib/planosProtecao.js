// GERADO a partir de 'Atualização oferta Planos de Proteção.xlsx' (2026-08-09).
// Não editar à mão: voltar a correr a extração se a tabela mudar.
//
// Preços oficiais por família de produto, tipo de prémio e escalão de valor
// do artigo. Substitui a dedução a partir das linhas de vendas, que só
// funcionava se o artigo já tivesse sido vendido na loja.

export const PLANOS = [
  {
    familia: "Telemóveis",
    produto: "DDR Telemóveis",
    premio: "2 Anos",
    escaloes: [
      { min: 0, max: 99.95, pvp: 49.99 },
      { min: 99.96, max: 199.95, pvp: 69.99 },
      { min: 199.96, max: 299.95, pvp: 99.99 },
      { min: 299.96, max: 399.95, pvp: 129.99 },
      { min: 399.96, max: 499.95, pvp: 155.99 },
      { min: 499.96, max: 599.95, pvp: 181.99 },
      { min: 599.96, max: 799.95, pvp: 211.99 },
      { min: 799.96, max: 1179.95, pvp: 257.99 },
      { min: 1179.96, max: 1449.95, pvp: 307.99 },
      { min: 1449.96, max: 1999.95, pvp: 363.99 },
      { min: 1999.96, max: 2499.95, pvp: 429.99 },
    ],
  },
  {
    familia: "Telemóveis",
    produto: "DDR Telemóveis",
    premio: "Anual",
    escaloes: [
      { min: 0, max: 99.95, pvp: 34.99 },
      { min: 99.96, max: 199.95, pvp: 49.99 },
      { min: 199.96, max: 299.95, pvp: 69.99 },
      { min: 299.96, max: 399.95, pvp: 89.99 },
      { min: 399.96, max: 499.95, pvp: 109.99 },
      { min: 499.96, max: 599.95, pvp: 119.99 },
      { min: 599.96, max: 799.95, pvp: 139.99 },
      { min: 799.96, max: 1179.95, pvp: 169.99 },
      { min: 1179.96, max: 1449.95, pvp: 199.99 },
      { min: 1449.96, max: 1999.95, pvp: 239.99 },
      { min: 1999.96, max: 2499.95, pvp: 279.99 },
    ],
  },
  {
    familia: "Telemóveis",
    produto: "DDR Telemóveis",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 99.95, pvp: 4.99, addon: 4 },
      { min: 99.96, max: 199.95, pvp: 7.99, addon: 4 },
      { min: 199.96, max: 299.95, pvp: 10.99, addon: 4 },
      { min: 299.96, max: 399.95, pvp: 12.99, addon: 4 },
      { min: 399.96, max: 499.95, pvp: 14.99, addon: 4 },
      { min: 499.96, max: 599.95, pvp: 16.99, addon: 4 },
      { min: 599.96, max: 799.95, pvp: 21.99, addon: 4 },
      { min: 799.96, max: 1179.95, pvp: 26.99, addon: 4 },
      { min: 1179.96, max: 1449.95, pvp: 31.99, addon: 4 },
      { min: 1449.96, max: 1999.95, pvp: 37.99, addon: 4 },
      { min: 1999.96, max: 2499.95, pvp: 44.99, addon: 4 },
    ],
  },
  {
    familia: "Telemóveis",
    produto: "DDR iPhones Recondicionados",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 299.95, pvp: 11.99, addon: 4 },
      { min: 299.96, max: 499.95, pvp: 14.99, addon: 4 },
      { min: 499.96, max: 799.95, pvp: 19.99, addon: 4 },
      { min: 799.96, max: 1179.95, pvp: 23.99, addon: 4 },
      { min: 1179.96, max: 1449.95, pvp: 29.99, addon: 4 },
      { min: 1449.96, max: 1999.95, pvp: 35.99, addon: 4 },
    ],
  },
  {
    familia: "Equip. Eletrónicos",
    produto: "DDR Equipamentos Eletrónicos",
    premio: "Bienal",
    escaloes: [
      { min: 0, max: 100, pvp: 51.99 },
      { min: 101, max: 200, pvp: 61.99 },
      { min: 201, max: 300, pvp: 83.99 },
      { min: 301, max: 400, pvp: 93.99 },
      { min: 401, max: 600, pvp: 125.99 },
      { min: 601, max: 800, pvp: 135.99 },
      { min: 801, max: 1000, pvp: 165.99 },
      { min: 1001, max: 1500, pvp: 217.99 },
      { min: 1501, max: 2500, pvp: 289.99 },
      { min: 2501, max: 5000, pvp: 359.99 },
    ],
  },
  {
    familia: "Equip. Eletrónicos",
    produto: "DDR Equipamentos Eletrónicos",
    premio: "Anual",
    escaloes: [
      { min: 0, max: 100, pvp: 35.99 },
      { min: 101, max: 200, pvp: 45.99 },
      { min: 201, max: 300, pvp: 61.99 },
      { min: 301, max: 400, pvp: 66.99 },
      { min: 401, max: 600, pvp: 87.99 },
      { min: 601, max: 800, pvp: 97.99 },
      { min: 801, max: 1000, pvp: 127.99 },
      { min: 1001, max: 1500, pvp: 163.99 },
      { min: 1501, max: 2500, pvp: 229.99 },
      { min: 2501, max: 5000, pvp: 254.99 },
    ],
  },
  {
    familia: "Equip. Eletrónicos",
    produto: "DDR Informatica",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 100, pvp: 5.99, addon: 4 },
      { min: 101, max: 200, pvp: 7.99, addon: 4 },
      { min: 201, max: 300, pvp: 9.99, addon: 4 },
      { min: 301, max: 400, pvp: 10.99, addon: 4 },
      { min: 401, max: 600, pvp: 13.99, addon: 4 },
      { min: 601, max: 800, pvp: 15.99, addon: 4 },
      { min: 801, max: 1000, pvp: 20.99, addon: 4 },
      { min: 1001, max: 1500, pvp: 26.99, addon: 4 },
      { min: 1501, max: 2500, pvp: 37.99, addon: 4 },
      { min: 2501, max: 5000, pvp: 41.99, addon: 4 },
      { min: 5001, max: 8000, pvp: 49.99, addon: 4 },
    ],
  },
  {
    familia: "Equip. Eletrónicos",
    produto: "DDR TV/DRONES/FOTO",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 100, pvp: 5.99, addon: 4 },
      { min: 101, max: 200, pvp: 7.99, addon: 4 },
      { min: 201, max: 300, pvp: 9.99, addon: 4 },
      { min: 301, max: 400, pvp: 10.99, addon: 4 },
      { min: 401, max: 600, pvp: 13.99, addon: 4 },
      { min: 601, max: 800, pvp: 15.99, addon: 4 },
      { min: 801, max: 1000, pvp: 20.99, addon: 4 },
      { min: 1001, max: 1500, pvp: 26.99, addon: 4 },
      { min: 1501, max: 2500, pvp: 37.99, addon: 4 },
      { min: 2501, max: 5000, pvp: 41.99, addon: 4 },
      { min: 5001, max: 8000, pvp: 49.99, addon: 4 },
    ],
  },
  {
    familia: "Equip. Eletrónicos",
    produto: "DDR Macbooks Recondicionados",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 599.99, pvp: 12.99, addon: 4 },
      { min: 600, max: 799.99, pvp: 14.99, addon: 4 },
      { min: 800, max: 999.99, pvp: 19.99, addon: 4 },
      { min: 1000, max: 1499.99, pvp: 25.99, addon: 4 },
      { min: 1500, max: 2499.99, pvp: 36.99, addon: 4 },
      { min: 2500, max: 5000, pvp: 40.99, addon: 4 },
    ],
  },
  {
    familia: "Tablets",
    produto: "DDR Tablets",
    premio: "Anual",
    escaloes: [
      { min: 0, max: 100.99, pvp: 35.99 },
      { min: 101, max: 200.99, pvp: 50.99 },
      { min: 201, max: 300.99, pvp: 65.99 },
      { min: 301, max: 500.99, pvp: 91.99 },
      { min: 501, max: 700.99, pvp: 117.99 },
      { min: 701, max: 900.99, pvp: 143.99 },
      { min: 901, max: 1100.99, pvp: 159.99 },
      { min: 1101, max: 1300, pvp: 175.9 },
      { min: 1300.01, max: 1599.99, pvp: 185.9 },
      { min: 1600, max: 1899.99, pvp: 195.9 },
      { min: 1900, max: 2200, pvp: 205.9 },
      { min: 2200.01, max: 2599.99, pvp: 225.99 },
      { min: 2600, max: 3000, pvp: 245.99 },
      { min: 3000.01, max: 3500, pvp: 265.99 },
    ],
  },
  {
    familia: "Tablets",
    produto: "DDR Tablets",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 100, pvp: 5.99, addon: 4 },
      { min: 101, max: 200, pvp: 8.99, addon: 4 },
      { min: 201, max: 300, pvp: 10.99, addon: 4 },
      { min: 301, max: 500, pvp: 15.99, addon: 4 },
      { min: 501, max: 700, pvp: 19.99, addon: 4 },
      { min: 701, max: 900, pvp: 23.99, addon: 4 },
      { min: 901, max: 1100, pvp: 26.99, addon: 4 },
      { min: 1101, max: 1300, pvp: 29.99, addon: 4 },
      { min: 1300, max: 1599, pvp: 31.99, addon: 4 },
      { min: 1600, max: 1899, pvp: 33.99, addon: 4 },
      { min: 1900, max: 2200, pvp: 35.99, addon: 4 },
      { min: 2200, max: 2599, pvp: 37.99, addon: 4 },
      { min: 2600, max: 3000, pvp: 39.99, addon: 4 },
      { min: 3000, max: 3500, pvp: 43.99, addon: 4 },
    ],
  },
  {
    familia: "Tablets",
    produto: "DDR iPads Recondicionados",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 200.99, pvp: 7.99, addon: 4 },
      { min: 201, max: 300.99, pvp: 9.99, addon: 4 },
      { min: 301, max: 500.99, pvp: 14.99, addon: 4 },
      { min: 501, max: 700.99, pvp: 18.99, addon: 4 },
      { min: 701, max: 900.99, pvp: 22.99, addon: 4 },
      { min: 901, max: 1100.99, pvp: 25.99, addon: 4 },
      { min: 1101, max: 1300, pvp: 28.99, addon: 4 },
      { min: 1300.01, max: 1599.99, pvp: 30.99, addon: 4 },
      { min: 1600, max: 1899.99, pvp: 32.99, addon: 4 },
      { min: 1900, max: 2200, pvp: 34.99, addon: 4 },
    ],
  },
  {
    familia: "Smartwatches",
    produto: "DDR Smartwatches",
    premio: "Anual",
    escaloes: [
      { min: 0, max: 99.99, pvp: 19.99 },
      { min: 100, max: 199.99, pvp: 29.99 },
      { min: 200, max: 299.99, pvp: 45.99 },
      { min: 300, max: 399.99, pvp: 77.99 },
      { min: 400, max: 599.99, pvp: 97.99 },
      { min: 600, max: 799.99, pvp: 117.99 },
      { min: 800, max: 999.99, pvp: 137.99 },
      { min: 1000, max: 1200, pvp: 157.99 },
    ],
  },
  {
    familia: "Smartwatches",
    produto: "DDR Smartwatches",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 99.99, pvp: 4.9, addon: 4 },
      { min: 100, max: 199.99, pvp: 5.9, addon: 4 },
      { min: 200, max: 299.99, pvp: 7.9, addon: 4 },
      { min: 300, max: 399.99, pvp: 9.9, addon: 4 },
      { min: 400, max: 599.99, pvp: 13.9, addon: 4 },
      { min: 600, max: 799.99, pvp: 16.9, addon: 4 },
      { min: 800, max: 999.99, pvp: 19.9, addon: 4 },
      { min: 1000, max: 1200, pvp: 23.9, addon: 4 },
    ],
  },
  {
    familia: "Smartwatches",
    produto: "DDR iWatches Recondicionados",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 199.99, pvp: 4.9, addon: 4 },
      { min: 200, max: 299.99, pvp: 7.9, addon: 4 },
      { min: 300, max: 399.99, pvp: 11.9, addon: 4 },
      { min: 400, max: 599.99, pvp: 15.9, addon: 4 },
      { min: 600, max: 799.99, pvp: 18.9, addon: 4 },
      { min: 800, max: 999.99, pvp: 21.9, addon: 4 },
    ],
  },
  {
    familia: "Consolas",
    produto: "DDR Consolas",
    premio: "Anual",
    escaloes: [
      { min: 0, max: 100.99, pvp: 25.99 },
      { min: 101, max: 200.99, pvp: 36.99 },
      { min: 201, max: 300.99, pvp: 47.99 },
      { min: 301, max: 400.99, pvp: 63.99 },
      { min: 401, max: 600, pvp: 68.99 },
    ],
  },
  {
    familia: "Consolas",
    produto: "DDR Consolas",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 100.99, pvp: 3.99, addon: 4 },
      { min: 101, max: 200.99, pvp: 5.99, addon: 4 },
      { min: 201, max: 300.99, pvp: 7.99, addon: 4 },
      { min: 301, max: 400.99, pvp: 9.99, addon: 4 },
      { min: 401, max: 600, pvp: 10.99, addon: 4 },
    ],
  },
  {
    familia: "Consolas",
    produto: "DA + EG Consolas",
    premio: "Único",
    escaloes: [
      { min: 0, max: 299.99, pvp: 69 },
      { min: 300, max: 600, pvp: 79 },
    ],
  },
  {
    familia: "Consolas",
    produto: "DA + EG Consolas",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 299.99, pvp: 23.94, addon: 4 },
      { min: 300, max: 600, pvp: 29.94, addon: 4 },
    ],
  },
  {
    familia: "Bicicletas Elétricas",
    produto: "DR Bicicletas Elétricas / Trotinetes Elétricas / Hoveboards",
    premio: "Anual",
    escaloes: [
      { min: 0, max: 150, pvp: 32.9, franquia: 10 },
      { min: 150.01, max: 300, pvp: 46.9, franquia: 15 },
      { min: 300.01, max: 500, pvp: 62.9, franquia: 20 },
      { min: 500.01, max: 800, pvp: 79.9, franquia: 25 },
      { min: 800.01, max: 1200, pvp: 89.9, franquia: 30 },
      { min: 1200.01, max: 1500, pvp: 109.9, franquia: 35 },
      { min: 1500.01, max: 4000, pvp: 149.9, franquia: 45 },
    ],
  },
  {
    familia: "Bicicletas Elétricas",
    produto: "DR Bicicletas Elétricas / Trotinetes Elétricas / Hoveboards",
    premio: "Bimestral",
    escaloes: [
      { min: 0, max: 150, pvp: 4.99, franquia: 10 },
      { min: 150.01, max: 300, pvp: 7.49, franquia: 15 },
      { min: 300.01, max: 500, pvp: 9.99, franquia: 20 },
      { min: 500.01, max: 800, pvp: 12.99, franquia: 25 },
      { min: 800.01, max: 1200, pvp: 14.49, franquia: 30 },
      { min: 1200.01, max: 1500, pvp: 17.49, franquia: 35 },
      { min: 1500.01, max: 4000, pvp: 23.99, franquia: 45 },
    ],
  },
  {
    familia: "Instrumentos Musicais",
    produto: "DR Instrumentos Musicais",
    premio: "Anual",
    apolice: "BGDN016899",
    escaloes: [
      { min: 0, max: 99.99, pvp: 19.99 },
      { min: 100, max: 199.99, pvp: 29 },
      { min: 200, max: 399.99, pvp: 39 },
      { min: 400, max: 599.99, pvp: 59 },
      { min: 600, max: 799.99, pvp: 89 },
      { min: 800, max: 999.99, pvp: 99 },
      { min: 1000, max: 1500, pvp: 119 },
    ],
  },
  {
    familia: "Videojogos",
    produto: "DDR DVD / Videojogos",
    premio: "Único",
    apolice: "BGDP016496",
    escaloes: [
      { min: 0, max: 30, pvp: 1.49 },
      { min: 30, max: 999999, pvp: 2.99 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "EG 2+2 PAE",
    premio: "Único",
    apolice: "BGDV000760",
    escaloes: [
      { min: 0, max: 49.99, pvp: 9.99 },
      { min: 50, max: 99.99, pvp: 14.99 },
      { min: 100, max: 199.99, pvp: 19 },
      { min: 200, max: 299.99, pvp: 29 },
      { min: 300, max: 499.99, pvp: 39 },
      { min: 500, max: 799.99, pvp: 59 },
      { min: 800, max: 1199.99, pvp: 79 },
      { min: 1200, max: 1499.99, pvp: 109 },
      { min: 1500, max: 2000, pvp: 149 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "Multigarantia Imagem e Som",
    premio: "Único",
    apolice: "BGDR006680",
    escaloes: [
      { min: 0, max: 199.99, pvp: 34 },
      { min: 200, max: 399.99, pvp: 44 },
      { min: 400, max: 599.99, pvp: 54 },
      { min: 600, max: 799.99, pvp: 79 },
      { min: 800, max: 999.99, pvp: 89 },
      { min: 1000, max: 1249.99, pvp: 99 },
      { min: 1250, max: 1499.99, pvp: 109 },
      { min: 1500, max: 1749.99, pvp: 114 },
      { min: 1750, max: 1999.99, pvp: 119 },
      { min: 2000, max: 2499.99, pvp: 129 },
      { min: 2500, max: 2999.99, pvp: 134 },
      { min: 3000, max: 3499.99, pvp: 139 },
      { min: 3500, max: 3999.99, pvp: 149 },
      { min: 4000, max: 4499.99, pvp: 159 },
      { min: 4500, max: 5000, pvp: 169 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "Multigarantia Informática Portátil",
    premio: "Único",
    apolice: "BGDR006680",
    escaloes: [
      { min: 0, max: 199.99, pvp: 54 },
      { min: 200, max: 399.99, pvp: 69 },
      { min: 400, max: 599.99, pvp: 99 },
      { min: 600, max: 799.99, pvp: 119 },
      { min: 800, max: 999.99, pvp: 159 },
      { min: 1000, max: 1249.99, pvp: 179 },
      { min: 1250, max: 1499.99, pvp: 189 },
      { min: 1500, max: 1749.99, pvp: 199 },
      { min: 1750, max: 1999.99, pvp: 209 },
      { min: 2000, max: 2499.99, pvp: 219 },
      { min: 2500, max: 2999.99, pvp: 239 },
      { min: 3000, max: 3499.99, pvp: 259 },
      { min: 3500, max: 3999.99, pvp: 279 },
      { min: 4000, max: 4499.99, pvp: 299 },
      { min: 4500, max: 5000, pvp: 319 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "Multigarantia Informática Fixa",
    premio: "Único",
    apolice: "BGDR006680",
    escaloes: [
      { min: 0, max: 199.99, pvp: 39 },
      { min: 200, max: 399.99, pvp: 54 },
      { min: 400, max: 599.99, pvp: 74 },
      { min: 600, max: 799.99, pvp: 89 },
      { min: 800, max: 999.99, pvp: 99 },
      { min: 1000, max: 1499.99, pvp: 129 },
      { min: 1500, max: 1999.99, pvp: 139 },
      { min: 2000, max: 2499.99, pvp: 149 },
      { min: 2500, max: 5000, pvp: 209 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "Multigarantia Pro Imagem e Som",
    premio: "Único",
    apolice: "BGDR006681",
    escaloes: [
      { min: 0, max: 249.99, pvp: 45 },
      { min: 250, max: 499.99, pvp: 65 },
      { min: 500, max: 749.99, pvp: 89 },
      { min: 750, max: 999.99, pvp: 99 },
      { min: 1000, max: 1499.99, pvp: 119 },
      { min: 1500, max: 2499.99, pvp: 145 },
      { min: 2500, max: 5000, pvp: 185 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "Multigarantia Pro Informática Portátil",
    premio: "Único",
    apolice: "BGDR006681",
    escaloes: [
      { min: 0, max: 249.99, pvp: 65 },
      { min: 250, max: 499.99, pvp: 95 },
      { min: 500, max: 749.99, pvp: 145 },
      { min: 750, max: 999.99, pvp: 179 },
      { min: 1000, max: 1499.99, pvp: 209 },
      { min: 1500, max: 2499.99, pvp: 245 },
      { min: 2500, max: 5000, pvp: 345 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "Multigarantia Pro Informática Fixa",
    premio: "Único",
    apolice: "BGDR006681",
    escaloes: [
      { min: 0, max: 249.99, pvp: 59 },
      { min: 250, max: 499.99, pvp: 79 },
      { min: 500, max: 749.99, pvp: 99 },
      { min: 750, max: 999.99, pvp: 119 },
      { min: 1000, max: 1499.99, pvp: 145 },
      { min: 1500, max: 2499.99, pvp: 165 },
      { min: 2500, max: 5000, pvp: 229 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "EG 2+3 Imagem e Som",
    premio: "Único",
    apolice: "BGDR006685",
    escaloes: [
      { min: 0, max: 249.99, pvp: 49 },
      { min: 250, max: 499.99, pvp: 59 },
      { min: 500, max: 749.99, pvp: 79 },
      { min: 750, max: 999.99, pvp: 89 },
      { min: 1000, max: 1499.99, pvp: 109 },
      { min: 1500, max: 2499.99, pvp: 129 },
      { min: 2500, max: 5000, pvp: 169 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "EG 2+3 Informática Fixa e Portátil",
    premio: "Único",
    apolice: "BGDV000762",
    escaloes: [
      { min: 0, max: 149.99, pvp: 29 },
      { min: 150, max: 299.99, pvp: 39 },
      { min: 300, max: 399.99, pvp: 49 },
      { min: 400, max: 599.99, pvp: 65 },
      { min: 600, max: 799.99, pvp: 89 },
      { min: 800, max: 999.99, pvp: 99 },
      { min: 1000, max: 1249.99, pvp: 109 },
      { min: 1250, max: 1499.99, pvp: 129 },
      { min: 1500, max: 1999.99, pvp: 164 },
      { min: 2000, max: 2499.99, pvp: 194 },
      { min: 2500, max: 2999.99, pvp: 224 },
      { min: 3000, max: 5000, pvp: 274 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "EG Pro 2+3 Imagem e Som",
    premio: "Único",
    apolice: "BGDR006686",
    escaloes: [
      { min: 0, max: 249.99, pvp: 57 },
      { min: 250, max: 499.99, pvp: 65 },
      { min: 500, max: 749.99, pvp: 89 },
      { min: 750, max: 999.99, pvp: 99 },
      { min: 1000, max: 1499.99, pvp: 119 },
      { min: 1500, max: 2499.99, pvp: 145 },
      { min: 2500, max: 5000, pvp: 185 },
    ],
  },
  {
    familia: "Extensões de Garantia",
    produto: "EG Pro 2+3 Informática Fixa e Portátil",
    premio: "Único",
    apolice: "BGDV000764",
    escaloes: [
      { min: 0, max: 149.99, pvp: 32 },
      { min: 150, max: 299.99, pvp: 45 },
      { min: 300, max: 399.99, pvp: 55 },
      { min: 400, max: 599.99, pvp: 75 },
      { min: 600, max: 799.99, pvp: 99 },
      { min: 800, max: 999.99, pvp: 109 },
      { min: 1000, max: 1249.99, pvp: 119 },
      { min: 1250, max: 1499.99, pvp: 145 },
      { min: 1500, max: 1999.99, pvp: 189 },
      { min: 2000, max: 2499.99, pvp: 219 },
      { min: 2500, max: 2999.99, pvp: 249 },
      { min: 3000, max: 5000, pvp: 319 },
    ],
  },
];

/** Famílias disponíveis, pela ordem em que aparecem na tabela oficial. */
export const FAMILIAS = [...new Set(PLANOS.map((p) => p.familia))];

/**
 * Todos os planos aplicáveis a um artigo de uma família, ao preço indicado.
 * Escolhe automaticamente o escalão que cobre esse preço.
 *
 * @param {string} familia  uma das FAMILIAS
 * @param {number} preco    PVP do artigo
 * @returns {Array<{nome:string, preco:string, franquia:string, addon:string}>}
 */
export function planosParaArtigo(familia, preco) {
  // Number(null) e Number('') dão 0, que cairia no primeiro escalão. Recusa-se
  // explicitamente tudo o que não seja um valor escrito.
  if (preco === null || preco === undefined || preco === '') return [];
  const p = Number(preco);
  if (!familia || !Number.isFinite(p) || p < 0) return [];

  const saida = [];
  for (const plano of PLANOS) {
    if (plano.familia !== familia) continue;
    const e = plano.escaloes.find((x) => p >= x.min && p <= x.max);
    if (!e) continue; // artigo fora dos escalões deste plano
    saida.push({
      nome: `${plano.produto} · ${plano.premio}`,
      produto: plano.produto,
      premio: plano.premio,
      preco: e.pvp.toFixed(2).replace('.', ',') + ' €',
      franquia: e.franquia != null ? e.franquia.toFixed(2).replace('.', ',') + ' €' : '',
      addon: e.addon != null ? e.addon.toFixed(2).replace('.', ',') + ' €' : '',
      escalao: { min: e.min, max: e.max },
    });
  }
  return saida;
}

/** O maior valor coberto pela tabela de uma família — para avisar quando o artigo passa disso. */
export function tectoDaFamilia(familia) {
  let max = 0;
  for (const plano of PLANOS) {
    if (plano.familia !== familia) continue;
    for (const e of plano.escaloes) if (e.max > max) max = e.max;
  }
  return max;
}

// ─────────────────────────────────────────────────────────────────────────
// Cruzamento EAN → família da tabela
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mapeia a designação (e a família Fnac, quando existe) para uma das FAMILIAS
 * da tabela de preços. Devolve "" quando não há certeza — nunca adivinha, para
 * não aplicar a tabela de preços errada em silêncio.
 *
 * @param {string} desc  descrição do artigo
 * @param {string} fam1  família Fnac do ficheiro, se disponível
 */
export function familiaDaTabela(desc, fam1) {
  const d = (String(desc || '') + ' ' + String(fam1 || '')).toUpperCase();
  if (!d.trim()) return '';

  // ordem importa: o mais específico primeiro
  if (/\b(TROTI|TROTINETE|SCOOTER|BICICLET|E-?BIKE|HOVERBOARD)/.test(d)) return 'Bicicletas Elétricas';
  if (/\b(SMARTWATCH|SMTWATCH|GALAXY\s*WATCH|APPLE\s*WATCH|IWATCH)/.test(d)) return 'Smartwatches';
  if (/\b(TABLET|IPAD)\b|\bTAB\b/.test(d)) return 'Tablets';
  // prefixos: "TELEMOVEIS", "SMARTPHONES" — não são palavras exactas
  if (/\b(TELM|TELEM|SMTP|SMARTPHONE|IPHONE)/.test(d)) return 'Telemóveis';
  if (/\b(CONSOLA|PLAYSTATION|\bPS5\b|\bPS4\b|XBOX|NINTENDO|SWITCH)\b/.test(d)) return 'Consolas';
  if (/\b(VIDEOJOGO|VIDEO\s*JOGO|JOGO\s|\bDVD\b|BLU-?RAY)/.test(d)) return 'Videojogos';
  if (/\b(GUITARR|PIANO|VIOLIN|BATERIA\s*MUSIC|INSTRUMENTO|SINTETIZAD|AMPLIFICAD)/.test(d)) return 'Instrumentos Musicais';

  // catch-all da electrónica: TV, informática, foto, som, drones
  if (/\b(TV|LCD|LED|OLED|QLED|MONITOR|NOTEB|PORT[ÁA]TIL|LAPTOP|MACBOOK|DESKTOP|IMAC|IMPRESSOR|FOTO|C[ÂA]MARA|CAMERA|GOPRO|LENTE|DRONE|AUSCUL|COLUNA|SOUNDBAR|AIRPODS|HIFI)/.test(d)) {
    return 'Equip. Eletrónicos';
  }
  return '';
}

/**
 * Grupo de extensão de garantia aplicável ao artigo, ou "" se não for claro.
 * As EG têm tabela própria, separada dos DDR.
 */
export function grupoEG(desc, fam1) {
  const d = (String(desc || '') + ' ' + String(fam1 || '')).toUpperCase();
  if (!d.trim()) return '';
  if (/\b(NOTEB|PORT[ÁA]TIL|LAPTOP|MACBOOK)/.test(d)) return 'Informática Portátil';
  if (/\b(DESKTOP|IMAC|MONITOR|IMPRESSOR|\bPC\b)/.test(d)) return 'Informática Fixa';
  if (/\b(TV|LCD|LED|OLED|QLED|AUSCUL|COLUNA|SOUNDBAR|HIFI|FOTO|C[ÂA]MARA|CAMERA)/.test(d)) return 'Imagem e Som';
  if (/\b(ASPIRADOR|CAF[ÉE]|FRITADEIRA|MICROONDAS|M[ÁA]QUINA\s*LAVAR|PAE)/.test(d)) return 'PAE';
  return '';
}

/**
 * Extensões de garantia aplicáveis a um grupo e preço.
 * Filtra a família "Extensões de Garantia" pelos produtos do grupo indicado.
 */
export function extensoesParaArtigo(grupo, preco) {
  if (!grupo) return [];
  const todos = planosParaArtigo('Extensões de Garantia', preco);
  const g = grupo.toUpperCase();
  return todos.filter((p) => {
    const n = p.produto.toUpperCase();
    if (g === 'PAE') return /\bPAE\b/.test(n);
    if (g === 'IMAGEM E SOM') return /IMAGEM E SOM/.test(n);
    if (g === 'INFORMÁTICA PORTÁTIL') return /PORT[ÁA]TIL/.test(n);
    if (g === 'INFORMÁTICA FIXA') return /\bFIXA\b/.test(n);
    return false;
  });
}
