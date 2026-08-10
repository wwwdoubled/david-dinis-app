'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  parsePrintTexto, parseCatalogoAoa, deduzCategoria,
  catalogoDeVendas, segurosParaArtigo, categoriaDoArtigo,
} from "./lib/etiquetasParser";
import { useBarcodeScanner, bip } from "./lib/useBarcodeScanner";
import {
  FAMILIAS, planosParaArtigo, tectoDaFamilia,
  familiaDaTabela, grupoEG, extensoesParaArtigo, precoParaSeguro,
} from "./lib/planosProtecao";

/* ------------------------------------------------------------------ */
/*  OCR — tesseract.js carregado do CDN só quando é preciso.           */
/*  Sem chave de API, sem custo, sem peso no bundle.                   */
/* ------------------------------------------------------------------ */
const TESSERACT_CDN = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js";

let tesseractPromise = null;
function carregarTesseract() {
  if (typeof window === "undefined") return Promise.reject(new Error("sem browser"));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TESSERACT_CDN;
    s.async = true;
    s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Tesseract não carregou.")));
    s.onerror = () => { tesseractPromise = null; reject(new Error("Não foi possível carregar o OCR. Verifica a ligação.")); };
    document.head.appendChild(s);
  });
  return tesseractPromise;
}

const CHAVE_CATALOGO = "dd_catalogo_seguros";

/* As famílias da tabela oficial de preços não têm os mesmos nomes que as
   categorias do banner. Este mapa liga umas às outras (coberturas e título). */
const FAMILIA_PARA_CATEGORIA = {
  "Telemóveis": "Telecom",
  "Tablets": "Telecom",
  "Smartwatches": "Telecom",
  "Equip. Eletrónicos": "Informática",
  "Consolas": "Informática",
  "Bicicletas Elétricas": "Casa",
  "Instrumentos Musicais": "Som",
  "Videojogos": "Informática",
  "Extensões de Garantia": "Casa",
};

/* ================================================================== */
/*  Estilos                                                            */
/* ================================================================== */
const CSS = `
*{box-sizing:border-box}
.app{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1b1b1b}
.wrap{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
.panel{flex:1 1 360px;min-width:320px;max-width:470px;background:#fff;border:1px solid #e2e2de;
  border-radius:10px;padding:18px}
.stage{flex:2 1 520px;min-width:320px}
h1{font-size:19px;margin:0 0 2px;letter-spacing:-.2px}
.sub{font-size:13px;color:#6b6b66;margin:0 0 18px}
.sec{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:#8a8a84;margin:22px 0 8px;border-bottom:1px solid #ececE8;padding-bottom:6px}
.sec:first-of-type{margin-top:0}
label.f{display:block;font-size:12px;color:#55554f;margin:0 0 4px}
input[type=text],select{width:100%;padding:8px 10px;border:1px solid #d8d8d2;border-radius:6px;
  font-size:13px;font-family:inherit;background:#fff}
input[type=text]:focus,select:focus{outline:2px solid #E8710A;outline-offset:-1px;border-color:#E8710A}
.btn{border:0;border-radius:6px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;
  font-family:inherit}
.btn:focus-visible{outline:2px solid #1b1b1b;outline-offset:2px}
.btn-main{background:#E8710A;color:#fff}
.btn-main:hover{background:#cf6208}
.btn-main:disabled{background:#dcd3ca;cursor:not-allowed}
.btn-ghost{background:#fff;border:1px solid #d8d8d2;color:#333}
.btn-ghost:hover{background:#f6f6f3}
.btn-ghost:disabled{color:#b5b5ae;cursor:not-allowed}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.drop{border:2px dashed #cfcfc8;border-radius:8px;padding:24px 14px;text-align:center;
  font-size:13px;color:#6b6b66;cursor:pointer;background:#fafaf8;line-height:1.6}
.drop.on{border-color:#E8710A;background:#fff6ed;color:#b85c07}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid #d8d8d2;background:#fff;border-radius:20px;padding:5px 13px;font-size:12px;
  cursor:pointer;font-family:inherit}
.chip.on{background:#1b1b1b;color:#fff;border-color:#1b1b1b}
.err{background:#fdecea;border:1px solid #f5c6c0;color:#9b2c20;font-size:12px;padding:8px 10px;
  border-radius:6px;margin-top:10px}
.hint{font-size:11px;color:#8a8a84;margin-top:6px;line-height:1.45}

/* fila de etiquetas */
.item{display:flex;align-items:center;gap:9px;padding:8px 9px;border:1px solid #e2e2de;
  border-radius:7px;margin-bottom:6px;cursor:pointer;background:#fff}
.item.on{border-color:#E8710A;background:#fff8f2}
.item .mini{width:34px;height:26px;object-fit:cover;border-radius:3px;flex:0 0 auto;
  background:#eee;border:1px solid #e2e2de}
.item .txt{flex:1 1 auto;min-width:0}
.item .t1{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .t2{font-size:11px;color:#8a8a84;margin-top:1px}
.item .x{border:0;background:none;color:#a09a92;cursor:pointer;font-size:16px;line-height:1;
  flex:0 0 auto}
.item .x:hover{color:#c0392b}
.tag{font-size:10px;padding:2px 6px;border-radius:10px;font-weight:600;flex:0 0 auto}
.tag.pend{background:#eceCE6;color:#77776f}
.tag.lend{background:#fff0dd;color:#b85c07}
.tag.ok{background:#e6f4ea;color:#276b3c}
.tag.bad{background:#fdecea;color:#9b2c20}

.srow{display:grid;grid-template-columns:1fr 82px 24px;gap:6px;margin-bottom:5px}
.srow input{font-size:12px;padding:6px 8px}
.srow button{border:0;background:none;color:#a09a92;cursor:pointer;font-size:15px}
.srow button:hover{color:#c0392b}
.cov{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px}
.cov input{accent-color:#E8710A;width:15px;height:15px}
.cov button{margin-left:auto;border:0;background:none;color:#a09a92;cursor:pointer;font-size:15px}
.vazio{font-size:12.5px;color:#8a8a84;padding:14px 0;line-height:1.5}

/* colar texto */
.ta{width:100%;min-height:150px;margin-top:10px;padding:9px 10px;border:1px solid #d8d8d2;
  border-radius:6px;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  line-height:1.55;resize:vertical;background:#fff;color:#1b1b1b}
.ta:focus{outline:2px solid #E8710A;outline-offset:-1px;border-color:#E8710A}

/* catálogo */
.cat{margin-top:10px;max-height:230px;overflow:auto;border:1px solid #e2e2de;border-radius:7px}
.catrow{display:flex;gap:8px;align-items:baseline;padding:6px 9px;border-bottom:1px solid #f0f0ec;
  font-size:11.5px}
.catrow:last-child{border-bottom:0}
.catrow .cn{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.catrow .cp{flex:0 0 auto;color:#E8710A;font-weight:700}
.catrow .addon{color:#8a8a84;font-weight:400}
.catrow.art{cursor:pointer}
.catrow.art:hover{background:#fff6ed}
.sel-art{margin-top:10px;padding:11px 12px;border:1px solid #E8710A;border-radius:7px;
  background:#fff8f2;font-size:12.5px}
.sel-art .t2{font-size:11.5px;color:#8a8a84;margin-top:3px}
.ok-box{background:#e6f4ea;border:1px solid #b7ddc4;color:#276b3c;font-size:12px;padding:8px 10px;
  border-radius:6px;margin-top:10px;line-height:1.45}
.warn-box{background:#fff6ed;border:1px solid #f3d3ae;color:#8a5410;font-size:12px;padding:8px 10px;
  border-radius:6px;margin-top:10px;line-height:1.45}

.cam{position:fixed;inset:0;background:rgba(15,15,14,.92);z-index:60;display:flex;
  flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:14px}
.cam video{width:100%;max-width:760px;max-height:70vh;border-radius:10px;background:#000;object-fit:contain}
.cam p{color:#e8e8e4;font-size:12.5px;margin:0;text-align:center;max-width:420px;line-height:1.5}
.cam .mira{position:absolute;width:min(78vw,420px);height:135px;border:3px solid #E8710A;
  border-radius:10px;box-shadow:0 0 0 100vmax rgba(0,0,0,.35);pointer-events:none}
.shot{width:64px;height:64px;border-radius:50%;border:4px solid #fff;background:#E8710A;cursor:pointer}
.shot:hover{background:#cf6208}

.previewbox{background:#dededa;border-radius:10px;padding:16px;overflow:hidden}
.scaler{transform-origin:top left}
.folhas{display:flex;flex-direction:column;gap:16px}

/* ---------- folha A4 ---------- */
.folha{width:210mm;height:297mm;background:#fff;padding:9mm;display:grid;gap:5mm;
  box-shadow:0 1px 10px rgba(0,0,0,.14)}
.g2{grid-template-columns:1fr;grid-template-rows:repeat(2,1fr)}
.g4{grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,1fr)}
.g6{grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr)}

/* ---------- etiqueta ---------- */
.etq{border:1px solid #c9c9c9;padding:2.2mm;display:flex;flex-direction:column;overflow:hidden;
  font-family:Arial,Helvetica,sans-serif;background:#fff}
.etq.ghost{border-style:dashed;border-color:#e4e4e0}
.equip{font-size:.62em;font-weight:700;color:#8a8a84;letter-spacing:.06em;
  border-bottom:1px solid #d8d8d2;padding:0 0 1mm;margin:1.6mm 0 1mm;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.equip span{color:#1b1b1b;letter-spacing:0}
.slist{width:100%;border-collapse:collapse}
.slist td{border-bottom:1px dotted #cfcfc8;padding:.62mm 0;vertical-align:middle}
.slist td.s{text-align:right;white-space:nowrap;padding-left:2mm;font-size:.86em}
.slist td.s.fr{color:#E8710A;font-weight:700}
.slist td.s.gf{color:#8a8a84}
.slist td.p{text-align:right;color:#E8710A;font-weight:700;white-space:nowrap;padding-left:2mm}
.foot{font-size:.5em;color:#9a9a92;font-style:italic;margin-top:auto;padding-top:1mm}

/* ---------- banner ---------- */
.bn{background:#fff;line-height:1.1}
.bn .bar{background:linear-gradient(90deg,#F2961A 0%,#F6B62D 100%);color:#fff;font-weight:700;
  padding:.30em .55em;display:inline-block;max-width:100%;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.bn .bar b{color:#000}
.bn .body{display:flex;align-items:center;gap:.4em;padding:.55em .25em .1em}
.bn .covs{flex:1 1 auto;min-width:0}
.bn .cv{display:flex;align-items:center;gap:.55em;padding:.19em 0;font-size:.86em;color:#232323}
.bn .cv svg{flex:0 0 auto}
.bn .cross{flex:0 0 auto}
.bn .logo{flex:0 0 auto;border:.19em solid #F2A11A;padding:.3em .45em;transform:rotate(-3deg);
  text-align:center;line-height:.95}
.bn .logo .l1{font-size:.62em;font-weight:800;color:#F2A11A;letter-spacing:.06em}
.bn .logo .l2{font-size:.92em;font-weight:800;color:#111;display:flex;align-items:center;
  justify-content:center;gap:.02em}
.bn .sub{display:flex;justify-content:flex-end;padding:.1em .25em 0}
.bn .sub span{background:#F2C417;color:#151515;font-weight:700;font-size:.8em;padding:.3em 1.1em;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}

@media print{
  @page{size:A4;margin:0}
  body{background:#fff}
  /* esconde o resto da aplicação e deixa só as folhas */
  body *{visibility:hidden !important}
  .folhas,.folhas *{visibility:visible !important}
  .folhas{position:absolute;left:0;top:0;width:210mm;gap:0}
  .noprint{display:none !important}
  .previewbox{padding:0;background:#fff;border-radius:0;overflow:visible}
  .scaler{transform:none !important;height:auto !important}
  .folha{box-shadow:none;page-break-after:always;break-after:page}
  .folha:last-child{page-break-after:auto;break-after:auto}
  .wrap{padding:0;display:block}
  .stage{max-width:none}
}
`;

/* ================================================================== */
/*  Ícones                                                             */
/* ================================================================== */
const ICONS = {
  danos: (
    <svg viewBox="0 0 24 24" width="1.5em" height="1.5em" fill="none" stroke="#4a4a4a" strokeWidth="1.4">
      <path d="M12 12 4 3M12 12l8-9M12 12l9 7M12 12l-9 7M12 12l-9-3M12 12l10 1M12 12l-3 10M12 12l4 9" />
      <circle cx="12" cy="12" r="1.6" fill="#4a4a4a" stroke="none" />
    </svg>
  ),
  derrames: (
    <svg viewBox="0 0 24 24" width="1.5em" height="1.5em">
      <ellipse cx="12" cy="18" rx="9" ry="3" fill="none" stroke="#3d8fd1" strokeWidth="1.3" />
      <ellipse cx="12" cy="18" rx="5" ry="1.6" fill="none" stroke="#7ab8e6" strokeWidth="1.1" />
      <path d="M12 4c2 3.2 3.4 5 3.4 6.8A3.4 3.4 0 0 1 12 14.2a3.4 3.4 0 0 1-3.4-3.4C8.6 9 10 7.2 12 4z" fill="#4fa3dd" />
      <circle cx="5.5" cy="10" r="1.1" fill="#8cc6ee" />
      <circle cx="18.5" cy="9" r="1.3" fill="#8cc6ee" />
    </svg>
  ),
  roubo: (
    <svg viewBox="0 0 24 24" width="1.5em" height="1.5em">
      <ellipse cx="11" cy="6.4" rx="6.6" ry="1.5" fill="#6b4a35" />
      <path d="M7.6 6.6c0-2 1.5-3.4 3.4-3.4s3.4 1.4 3.4 3.4z" fill="#6b4a35" />
      <path d="M7.4 8.4h7.2c.5 3.4.3 6.4-.6 8.6H8c-.9-2.2-1.1-5.2-.6-8.6z" fill="#7a5540" />
      <path d="M8.4 17h1.5l-1.1 4H7.3zM12.6 17h1.5l1.4 4h-1.6z" fill="#7a5540" />
      <rect x="14.6" y="11.4" width="4.6" height="3.6" rx=".5" fill="#2f6fc4" />
      <path d="M9.2 6.9h1.4v.9H9.2zM12 6.9h1.4v.9H12z" fill="#fff" />
    </svg>
  ),
  safe: (
    <svg viewBox="0 0 24 24" width="1.5em" height="1.5em">
      <rect x="2.5" y="2.5" width="19" height="19" fill="none" stroke="#F2A11A" strokeWidth="2" />
      <path d="M12 6.5l4.2 1.6v3.4c0 2.6-1.7 4.6-4.2 5.5-2.5-.9-4.2-2.9-4.2-5.5V8.1z" fill="#7a5540" />
      <path d="M9.9 11.8l1.5 1.5 2.9-3" fill="none" stroke="#F2C417" strokeWidth="1.5" />
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" width="1.5em" height="1.5em">
      <rect x="2.5" y="3.5" width="19" height="17" fill="none" stroke="#F2A11A" strokeWidth="2" />
      <path d="M9 16.5a3.2 3.2 0 0 1-.2-6.4 4.1 4.1 0 0 1 7.3-.6 3 3 0 0 1 .3 6z" fill="#111" stroke="#F2A11A" strokeWidth="1.2" />
    </svg>
  ),
  generico: (
    <svg viewBox="0 0 24 24" width="1.5em" height="1.5em">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#E8710A" strokeWidth="1.6" />
      <path d="M8.4 12.2l2.6 2.6 4.6-5.2" fill="none" stroke="#E8710A" strokeWidth="1.8" />
    </svg>
  ),
};

const COBERTURAS_BASE = [
  { id: "danos", label: "Danos", icon: "danos" },
  { id: "derrames", label: "Derrames Liquidos", icon: "derrames" },
  { id: "roubo", label: "Roubo", icon: "roubo" },
  { id: "safe", label: "Fnac Safe", icon: "safe" },
  { id: "cloud", label: "Fnac Cloud", icon: "cloud" },
  { id: "extgar", label: "Extensão de Garantia", icon: "generico" },
  { id: "oxid", label: "Oxidação", icon: "generico" },
  { id: "ecra", label: "Ecrã partido", icon: "generico" },
  { id: "bat", label: "Bateria", icon: "generico" },
  { id: "assist", label: "Assistência ao domicílio", icon: "generico" },
];
const cob = (ativos) => COBERTURAS_BASE.map((c) => ({ ...c, on: ativos.includes(c.id) }));

const CATEGORIAS = {
  Foto: {
    titulo: "EXTRA CLOUD", franquia: "120 €",
    coberturas: cob(["danos", "derrames", "roubo", "cloud"]),
    servicos: [
      "SEG DDR FOTO BIMESTRAL FNAC CLOUD",
      "SEG DDR FOTO 1 ANO",
      "SEG DDR FOTO 2 ANOS",
      "SEG MULTIGARANTIAS FOTO 4 ANOS",
      "SEG-MULTIGARANTIAS PRO I&S 3 ANOS",
      "SEG-EXT GARANTIA FOTO +3 ANOS",
      "SEG-EXT GARANTIA PRO I&S +4 ANOS",
    ],
  },
  Informática: {
    titulo: "EXTRA CLOUD", franquia: "120 €",
    coberturas: cob(["danos", "derrames", "roubo", "safe"]),
    servicos: [
      "SEG DDR INFORM BIMESTRAL FNAC CLOUD",
      "SEG DDR INFORM BIMESTRAL NOVO FNAC SAFE C/VPN E ID PROTECTION",
      "SEG DDR INFORMATICA 1 ANO",
      "SEG DDR INFORMATICA 2 ANOS",
      "SEG-MULTIGARANTIAS INFORMA 4 ANOS",
      "SEG-MULTIGARANTIAS PRO NOMAD 3 ANOS",
      "SEG-EXT. GARANTIA LAPTOP +3 ANOS",
      "SEG-EXT GARANTIA PRO INF +4 ANOS",
    ],
  },
  Telecom: {
    titulo: "EXTRA CLOUD", franquia: "90 €",
    coberturas: cob(["danos", "derrames", "roubo", "safe"]),
    servicos: [
      "SEG DDR TELM/SMTP BIMESTRAL FNAC CLOUD",
      "SEG DDR TELM/SMTP BIMESTRAL NOVO FNAC SAFE C/VPN E ID PROTECTION",
      "SEG DDR TELM/SMTP 1 ANO",
      "SEG DDR TELM/SMTP 2 ANOS",
      "CONFIG INICIAL BASE SMARTPHONE/TABLET",
    ],
  },
  TV: {
    titulo: "EXTRA CLOUD", franquia: "150 €",
    coberturas: cob(["danos", "roubo", "cloud"]),
    servicos: [
      "SEG DDR TV BIMESTRAL FNAC CLOUD",
      "SEG DDR TV SOM 1 ANO",
      "SEG DDR TV SOM 2 ANOS",
      "SEG MULTIGARANTIAS TV/VIDEO 4 ANOS",
      "SEG-MULTIGARANTIAS PRO I&S 3 ANOS",
      "SEG-EXT GARANTIA TV +3 ANOS",
      "SEG-EXT GARANTIA PRO I&S +4 ANOS",
    ],
  },
  Som: {
    titulo: "EXTRA CLOUD", franquia: "30 €",
    coberturas: cob(["danos", "derrames", "roubo", "cloud"]),
    servicos: [
      "SEG DDR TV BIMESTRAL FNAC CLOUD",
      "SEG DDR TV SOM 1 ANO",
      "SEG DDR TV SOM 2 ANOS",
      "SEG MULTIGARANTIAS SOM 4 ANOS",
      "SEG-MULTIGARANTIAS PRO I&S 3 ANOS",
      "SEG-EXT GARANTIA AUSCUL +3 ANOS",
      "SEG-EXT GARANTIA PRO I&S +4 ANOS",
    ],
  },
  Casa: {
    titulo: "DANOS + EXT. GARANTIA", franquia: "50 €",
    coberturas: cob(["danos", "extgar"]),
    servicos: [
      "SEG-DANOS + EXT GARANT BIMESTRAL",
      "SEG-DANOS + EXT GARANT BIM PRO",
      "SEG-EXT. GARANTIA +2 ANOS COZ&LAR",
    ],
  },
  Recondicionados: {
    titulo: "EXTRA CLOUD", franquia: "60 €",
    coberturas: cob(["danos", "derrames", "roubo", "safe"]),
    servicos: [
      "SEG DDR TELM/SMTP BIMESTRAL FNAC CLOUD",
      "SEG DDR TELM/SMTP BIMESTRAL NOVO FNAC SAFE C/VPN E ID PROTECTION",
      "SEG DDR TELM/SMTP 1 ANO",
      "SEG DDR TELM/SMTP 2 ANOS",
      "CONFIG INICIAL BASE SMARTPHONE/TABLET",
    ],
  },
};

const CHAVE_COBERTURAS = "dd_coberturas_seguros";

/* A franquia só se aplica aos seguros de danos (DDR). */
function selo(nome, franquia) {
  const n = (nome || "").toUpperCase();
  if (/\bDDR\b|SEG-DANOS/.test(n)) return { texto: franquia ? "Franquia " + franquia : "", cls: "fr" };
  if (/CONFIG/.test(n)) return { texto: "Serviço Configuração", cls: "gf" };
  return { texto: "Garantias Fnac", cls: "gf" };
}

const novaEtiqueta = (cat = "Informática", extra = {}) => {
  const c = CATEGORIAS[cat];
  return {
    id: "e" + Date.now() + Math.random().toString(36).slice(2, 6),
    estado: "ok",
    categoria: cat,
    titulo: c.titulo,
    franquia: c.franquia,
    coberturas: c.coberturas,
    equipamento: "",
    servicos: c.servicos.map((n) => ({ nome: n, preco: "" })),
    ...extra,
  };
};

/* ================================================================== */
/*  Banner e etiqueta                                                  */
/* ================================================================== */
function Banner({ titulo, coberturas, mostrarBotao }) {
  return (
    <div className="bn">
      <div className="bar">
        PLANO DE PROTEÇÃO <b>{titulo}</b>
      </div>
      <div className="body">
        <div className="covs">
          {coberturas.filter((c) => c.on).map((c) => (
            <div className="cv" key={c.id}>
              {ICONS[c.icon] || ICONS.generico}
              <span>{c.label}</span>
            </div>
          ))}
        </div>
        <div className="cross">
          <svg viewBox="0 0 100 100" width="3.4em" height="3.4em" aria-hidden="true">
            <defs>
              <linearGradient id="gcx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EE7C34" />
                <stop offset="100%" stopColor="#CE501A" />
              </linearGradient>
            </defs>
            <path d="M35 4h30v31h31v30H65v31H35V65H4V35h31z" fill="url(#gcx)" />
          </svg>
        </div>
        <div className="logo">
          <div className="l1">FNAC</div>
          <div className="l2">
            CL
            <svg viewBox="0 0 26 18" width="1.05em" height=".78em" aria-hidden="true">
              <path d="M7.5 16.5a5.2 5.2 0 0 1-.3-10.4A6.6 6.6 0 0 1 19 5.2a4.9 4.9 0 0 1 .4 9.8z"
                fill="#111" stroke="#F2A11A" strokeWidth="1.6" />
            </svg>
            UD
          </div>
        </div>
      </div>
      {mostrarBotao && (
        <div className="sub">
          <span>&gt; Subscrever</span>
        </div>
      )}
    </div>
  );
}

function Etiqueta({ e, base, rodape, botao }) {
  if (!e) return <div className="etq ghost" />;
  return (
    <div className="etq" style={{ fontSize: base }}>
      <Banner titulo={e.titulo} coberturas={e.coberturas} mostrarBotao={botao} />
      <div className="equip">
        EQUIPAMENTO: <span>{e.equipamento || "\u00A0"}</span>
      </div>
      <table className="slist" style={{ fontSize: "0.58em" }}>
        <tbody>
          {e.servicos.map((s, i) => {
            const sl = selo(s.nome, e.franquia);
            return (
              <tr key={i}>
                <td>{s.nome}</td>
                <td className={"s " + sl.cls}>{sl.texto}</td>
                <td className="p" style={{ fontSize: "1.15em" }}>{s.preco || "00,00 €"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rodape && <div className="foot">{rodape}</div>}
    </div>
  );
}

/* ================================================================== */
/*  App                                                                */
/* ================================================================== */
export default function EtiquetasSeguros({ rows = [], produtos = [] }) {
  const [etiquetas, setEtiquetas] = useState([novaEtiqueta()]);
  const [selId, setSelId] = useState(null);
  const [porFolha, setPorFolha] = useState(4);
  const [botao, setBotao] = useState(true);
  const [rodape, setRodape] = useState(
    "Preços consoante o escalão de valor do artigo. Consulte o vendedor."
  );
  const [progresso, setProgresso] = useState(null); // {feitas, total}
  const [erro, setErro] = useState("");
  const [dragOn, setDragOn] = useState(false);
  const [camAberta, setCamAberta] = useState(false);
  const [escala, setEscala] = useState(0.5);

  // modo de entrada: texto colado | manual | catálogo da app | OCR local
  const [modo, setModo] = useState("tabela");
  // modo "tabela": família + preço do artigo → preços oficiais. Não depende
  // de dados de vendas nem de EAN, por isso funciona sempre.
  const [familia, setFamilia] = useState("");
  const [precoArtigo, setPrecoArtigo] = useState("");
  const [nomeArtigo, setNomeArtigo] = useState("");
  const [texto, setTexto] = useState("");
  const [catalogo, setCatalogo] = useState([]);
  const [procura, setProcura] = useState("");
  const [artigoSel, setArtigoSel] = useState(null);

  const stageRef = useRef(null);
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);
  const camInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const sel = etiquetas.find((e) => e.id === selId) || null;
  const pendentes = etiquetas.filter((e) => e.estado === "pendente").length;

  /* ---------- escala da pré-visualização ---------- */
  useEffect(() => {
    const calc = () => {
      const w = stageRef.current?.clientWidth || 600;
      setEscala(Math.min(1, (w - 32) / 794));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* ---------- coberturas guardadas por categoria ---------- */
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_COBERTURAS);
      if (bruto) {
        const guardadas = JSON.parse(bruto);
        Object.keys(guardadas).forEach((k) => {
          if (CATEGORIAS[k]) CATEGORIAS[k].coberturas = guardadas[k];
        });
      }
    } catch (err) {
      /* ainda não há nada guardado */
    }
  }, []);

  const guardarCoberturas = () => {
    if (!sel) return;
    CATEGORIAS[sel.categoria].coberturas = sel.coberturas;
    const mapa = {};
    Object.keys(CATEGORIAS).forEach((k) => (mapa[k] = CATEGORIAS[k].coberturas));
    try {
      localStorage.setItem(CHAVE_COBERTURAS, JSON.stringify(mapa));
      setErro("");
    } catch (err) {
      setErro("Não foi possível guardar as coberturas.");
    }
  };

  /* ---------- atualizar uma etiqueta ---------- */
  const upd = (id, campos) =>
    setEtiquetas((lista) => lista.map((e) => (e.id === id ? { ...e, ...campos } : e)));

  const aplicarCategoria = (id, nome) => {
    const c = CATEGORIAS[nome];
    upd(id, {
      categoria: nome,
      titulo: c.titulo,
      franquia: c.franquia,
      coberturas: c.coberturas,
      servicos: c.servicos.map((n) => ({ nome: n, preco: "" })),
    });
  };

  /* ---------- adicionar imagens à fila ---------- */
  const adicionarFicheiros = useCallback((files) => {
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) {
      setErro("Só são aceites imagens (prints ou fotografias).");
      return;
    }
    setErro("");
    imgs.forEach((file) => {
      const fr = new FileReader();
      fr.onload = () => {
        const url = fr.result;
        setEtiquetas((lista) => [
          ...lista,
          novaEtiqueta("Informática", {
            estado: "pendente",
            img: { b64: url.split(",")[1], media: file.type, url },
            servicos: [],
          }),
        ]);
      };
      fr.readAsDataURL(file);
    });
  }, []);

  useEffect(() => {
    const onPaste = (e) => {
      const fs = [...(e.clipboardData?.items || [])]
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter(Boolean);
      if (fs.length) adicionarFicheiros(fs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [adicionarFicheiros]);

  /* ---------- câmara ---------- */
  const abrirCamera = async () => {
    setErro("");
    const toque = window.matchMedia("(pointer: coarse)").matches;
    if (toque || !navigator.mediaDevices?.getUserMedia) {
      camInputRef.current?.click();
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
      });
      setCamAberta(true);
    } catch (err) {
      camInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (camAberta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camAberta]);

  const fecharCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamAberta(false);
  };

  const capturar = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((b) => b && adicionarFicheiros([new File([b], "foto.jpg", { type: "image/jpeg" })]), "image/jpeg", 0.92);
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  /* ---------- 1. texto colado ---------- */
  const lerTexto = () => {
    const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    if (!blocos.length) {
      setErro("Cola primeiro o texto do ecrã Planos Proteção.");
      return;
    }
    const novas = [];
    for (const bloco of blocos) {
      const j = parsePrintTexto(bloco);
      if (!j.servicos.length) continue;
      const c = CATEGORIAS[j.categoria];
      novas.push(
        novaEtiqueta(c ? j.categoria : "Informática", {
          estado: "ok",
          equipamento: j.equipamento,
          franquia: j.franquia || (c ? c.franquia : ""),
          titulo: c ? c.titulo : "EXTRA CLOUD",
          coberturas: c ? c.coberturas : cob([]),
          servicos: j.servicos,
        })
      );
    }
    if (!novas.length) {
      setErro("Não reconheci nenhuma linha de serviço. As designações têm de começar por SEG, PP, EXT, GAR ou CONFIG.");
      return;
    }
    setErro("");
    setTexto("");
    setEtiquetas((l) => [...l.filter((e) => e.servicos.length || e.equipamento), ...novas]);
    setSelId(novas[0].id);
  };

  /* ---------- 3. catálogo a partir do ficheiro de vendas ---------- */
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_CATALOGO);
      if (bruto) setCatalogo(JSON.parse(bruto));
    } catch (err) {
      /* ainda não há catálogo */
    }
  }, []);

  const importarCatalogo = async (file) => {
    if (!file) return;
    setErro("");
    setProgresso({ feitas: 0, total: 1 });
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      // a sheet BD TT SEGUROS é a preferida; senão, a primeira que dê linhas
      const nomes = ["BD TT SEGUROS", ...wb.SheetNames];
      let linhas = [];
      for (const n of nomes) {
        const sh = wb.Sheets[n];
        if (!sh) continue;
        const aoa = XLSX.utils.sheet_to_json(sh, { header: 1, blankrows: false, defval: null });
        linhas = parseCatalogoAoa(aoa);
        if (linhas.length) break;
      }
      if (!linhas.length) {
        setErro("Não encontrei linhas de seguros. O ficheiro precisa de colunas de descrição e preço.");
      } else {
        setCatalogo(linhas);
        try { localStorage.setItem(CHAVE_CATALOGO, JSON.stringify(linhas)); } catch (err) { /* quota */ }
      }
    } catch (err) {
      setErro("Falha a ler o ficheiro: " + err.message);
    }
    setProgresso(null);
  };

  /* ---------- catálogo vindo directamente da Análise de Vendas ---------- */
  // Não pede upload nenhum: as linhas já carregadas na app trazem as
  // designações de seguro com o escalão e o preço realmente praticado.
  const catalogoApp = React.useMemo(() => catalogoDeVendas(rows), [rows]);

  // artigos (não-seguros) para pesquisa por EAN ou designação
  const artigos = React.useMemo(() => {
    const mapa = new Map();
    for (const r of rows || []) {
      if (!r || !r.name || !(Number(r.pvp) > 0)) continue;
      if (/^(SEG|PP|EXT|GAR|CONFIG)[\s_-]/i.test(r.name)) continue;
      const chave = r.ean || r.name;
      if (!mapa.has(chave)) mapa.set(chave, { ean: r.ean, name: r.name, pvp: Number(r.pvp) });
    }
    return Array.from(mapa.values());
  }, [rows]);

  const artigosFiltrados = React.useMemo(() => {
    const q = procura.trim().toUpperCase();
    if (q.length < 2) return [];
    return artigos
      .filter((a) => a.name.toUpperCase().includes(q) || String(a.ean || "").includes(q))
      .slice(0, 12);
  }, [artigos, procura]);

  // categorias que têm mesmo seguros nos dados carregados
  // Sem catálogo carregado, mostram-se todas — senão não haveria por onde escolher.
  const categoriasDisponiveis = React.useMemo(() => {
    const comSeguros = Object.keys(CATEGORIAS).filter((k) => catalogoApp.some((c) => c.categoria === k));
    return comSeguros.length ? comSeguros : Object.keys(CATEGORIAS);
  }, [catalogoApp]);

  const etiquetaDoArtigo = useCallback((artigo, categoria) => {
    const c = CATEGORIAS[categoria];
    if (!c) return false;
    // Sem catálogo (ou sem seguros desta família) a etiqueta sai na mesma, com as
    // designações habituais e os preços por preencher — melhor que não sair nada.
    const doCatalogo = segurosParaArtigo(catalogoApp, categoria, artigo.pvp);
    const linhas = doCatalogo.length
      ? doCatalogo
      : c.servicos.map((nome) => ({ nome, preco: "" }));
    const n = novaEtiqueta(categoria, {
      estado: "ok",
      equipamento: artigo.name,
      franquia: c.franquia,
      servicos: linhas,
    });
    setErro("");
    setEtiquetas((l) => [...l, n]);
    setSelId(n.id);
    return true;
  }, [catalogoApp]);

  /* ---------- EAN → artigo (cruzamento) ----------
     O índice junta tudo o que a app conhece: linhas de vendas/stock e produtos
     das campanhas. Dá preço + descrição + família Fnac, que é o que falta para
     a tabela de preços decidir sozinha. */
  const indicePorEan = React.useMemo(() => {
    const m = new Map();
    // O prémio incide sobre o VALOR ORIGINAL — nunca sobre o preço de campanha
    // ou baixa de preço. precoParaSeguro() aplica essa ordem de preferência.
    const juntar = (ean, name, precos, fam1) => {
      const k = String(ean || "").replace(/[^\d]/g, "").replace(/^0+/, "");
      if (!k || !name) return;
      const { preco, origem } = precoParaSeguro(precos);
      const ja = m.get(k);
      // um registo com preço original ganha sempre a um que só tenha promoção
      if (ja && (ja.origem === "original" || (ja.preco > 0 && origem !== "original"))) return;
      m.set(k, { ean: k, name: String(name).trim(), preco, origem, fam1: fam1 || "" });
    };
    // As linhas de stock são objectos com as chaves do Excel ("EAN", "Descrição",
    // "PVP"…), não {ean,name,pvp}. Detecta-se a coluna pelo cabeçalho, como faz
    // o buildStockIndex — antes lia-se r.ean/r.name e não vinha nada.
    const cols = (() => {
      const primeira = (rows || []).find(Boolean);
      if (!primeira) return null;
      const hs = Object.keys(primeira);
      const acha = (...res) => { for (const re of res) { const h = hs.find((x) => re.test(x)); if (h) return h; } return null; };
      return {
        ean: acha(/^\s*ean\s*$/i, /ean|barcode|c[oó]d.?barras/i),
        nome: acha(/descri|designa|artigo|produto/i),
        preco: acha(/pvp.*iva|^\s*pvp\s*$/i, /pre[çc]o|valor/i),
        fam: acha(/fam[ií]lia\s*1|^fam1$/i, /fam[ií]lia/i),
      };
    })();

    if (cols?.ean) {
      for (const r of rows || []) {
        if (!r) continue;
        juntar(r[cols.ean], cols.nome ? r[cols.nome] : "",
          { pvp: cols.preco ? parseFloat(String(r[cols.preco]).replace(",", ".")) : 0 },
          cols.fam ? r[cols.fam] : "");
      }
    }
    // linhas já normalizadas (análise de vendas), se vierem nesse formato
    for (const r of rows || []) if (r?.ean && r?.name) juntar(r.ean, r.name, { pvp: r.pvp }, r.fam1);
    for (const p of produtos || []) {
      juntar(p?.ean, p?.description || p?.name,
        { basePrice: p?.basePrice, campaignPrice: p?.campaignPrice }, p?.family);
    }
    return m;
  }, [rows, produtos]);

  /* ---------- tabela oficial: família + preço ---------- */
  const precoNum = React.useMemo(() => {
    const t = precoArtigo.trim().replace(/[€\s]/g, "").replace(",", ".");
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }, [precoArtigo]);

  const planos = React.useMemo(
    () => (familia && precoNum !== null ? planosParaArtigo(familia, precoNum) : []),
    [familia, precoNum]
  );

  // Extensões de garantia do artigo — tabela própria, cruzada pelo grupo.
  const [grupoExt, setGrupoExt] = useState("");
  const extensoes = React.useMemo(
    () => (grupoExt && precoNum !== null ? extensoesParaArtigo(grupoExt, precoNum) : []),
    [grupoExt, precoNum]
  );

  /* Resolve um EAN: preenche preço, família e grupo de extensão de uma vez. */
  const [eanTabela, setEanTabela] = useState("");
  const [avisoEan, setAvisoEan] = useState("");

  const resolverEanTabela = useCallback((bruto) => {
    const k = String(bruto || "").replace(/[^\d]/g, "").replace(/^0+/, "");
    if (!k) return;
    const art = indicePorEan.get(k);
    bip(!!art);
    if (!art) {
      setAvisoEan(`EAN ${k} não está nas campanhas nem no stock carregados. Escreve o preço à mão.`);
      return;
    }
    const fam = familiaDaTabela(art.name, art.fam1);
    setNomeArtigo(art.name);
    if (art.preco > 0) setPrecoArtigo(String(art.preco).replace(".", ","));
    if (fam) setFamilia(fam);
    setGrupoExt(grupoEG(art.name, art.fam1));
    setEanTabela("");
    setAvisoEan(
      !art.preco ? `${art.name} — encontrado, mas sem preço nos dados. Escreve-o à mão.`
        : art.origem === "promocao"
          ? `${art.name} — só encontrei o preço de campanha. O seguro calcula-se sobre o valor ORIGINAL: confirma-o e corrige se preciso.`
        : !fam ? `${art.name} — família não reconhecida. Escolhe-a em baixo.`
        : ""
    );
  }, [indicePorEan]);

  useEffect(() => {
    const q = eanTabela.trim();
    if (!/^\d{8,}$/.test(q)) return;
    const t = setTimeout(() => resolverEanTabela(q), 400);
    return () => clearTimeout(t);
  }, [eanTabela, resolverEanTabela]);

  const scannerTabela = useBarcodeScanner({ onEan: (e) => setEanTabela(e) });

  const etiquetaDaTabela = () => {
    if (!planos.length) return;
    // a franquia vem da tabela quando existe; senão fica a da categoria
    const comFranquia = planos.find((p) => p.franquia);
    // seguros + extensões de garantia na mesma etiqueta
    const linhas = [...planos, ...extensoes].map((p) => ({ nome: p.nome, preco: p.preco }));
    const n = novaEtiqueta(FAMILIA_PARA_CATEGORIA[familia] || "Informática", {
      estado: "ok",
      equipamento: nomeArtigo.trim(),
      franquia: comFranquia ? comFranquia.franquia : "",
      servicos: linhas,
    });
    setErro("");
    setEtiquetas((l) => [...l, n]);
    setSelId(n.id);
    setNomeArtigo("");
    setPrecoArtigo("");
  };

  /* ---------- scanner de barcodes (o mesmo motor do Inventário) ---------- */
  // Devolve o EAN normalizado; a partir daí segue o mesmo caminho que
  // escrever à mão ou ler com a pistola.
  // A câmara entrega o EAN ao mesmo caminho que o teclado e a pistola:
  // escreve-o no campo e o efeito com debounce trata do resto.
  const aoLerCodigo = useCallback((ean) => {
    bip(artigos.some((a) => String(a.ean || "").replace(/^0+/, "") === ean));
    setArtigoSel(null);
    setProcura(ean);
  }, [artigos]);

  const scanner = useBarcodeScanner({ onEan: aoLerCodigo });

  /* ---------- EAN → etiqueta pronta, sem cliques ----------
     Escrever ou ler com a pistola um EAN que existe nos dados de vendas
     preenche a etiqueta de uma vez: o artigo dá o PVP (logo, o escalão) e a
     designação dá a família. Se a família não for clara, pergunta-se. */
  // v3.25.2: um EAN completo faz SEMPRE alguma coisa. Antes, se não existisse
  // nos dados de vendas, a função saía em silêncio — e sem dados carregados isso
  // era sempre, pelo que escrever o código não produzia nada.
  const resolverEan = useCallback((q) => {
    const norm = q.replace(/^0+/, "");
    const achado = artigos.find((a) => String(a.ean || "").replace(/^0+/, "") === norm);

    if (achado) {
      const categoria = categoriaDoArtigo(achado.name);
      // família clara E com seguros no catálogo → etiqueta directa
      if (categoria && CATEGORIAS[categoria] && catalogoApp.some((c) => c.categoria === categoria)) {
        if (etiquetaDoArtigo(achado, categoria)) setProcura("");
        return;
      }
      setArtigoSel(achado); // família por confirmar
      return;
    }

    // EAN desconhecido: a etiqueta sai na mesma, com o código no equipamento.
    setErro("");
    setArtigoSel({ ean: q, name: "EAN " + q, pvp: 0, desconhecido: true });
  }, [artigos, catalogoApp, etiquetaDoArtigo]);

  // Debounce: a pistola escreve muito depressa e o teclado dígito a dígito.
  // Espera-se que o código estabilize antes de agir.
  useEffect(() => {
    const q = procura.trim();
    if (artigoSel) return;
    if (!/^\d{8,}$/.test(q)) return;
    const t = setTimeout(() => resolverEan(q), 500);
    return () => clearTimeout(t);
  }, [procura, artigoSel, resolverEan]);

  const catalogoFiltrado = React.useMemo(() => {
    const q = procura.trim().toUpperCase();
    const base = q ? catalogo.filter((c) => c.nome.includes(q) || c.categoria.toUpperCase().includes(q)) : catalogo;
    return base.slice(0, 40);
  }, [catalogo, procura]);

  const etiquetaDoCatalogo = (categoria) => {
    const linhas = catalogo.filter((c) => c.categoria === categoria);
    if (!linhas.length) return;
    const c = CATEGORIAS[categoria];
    const n = novaEtiqueta(categoria, {
      estado: "ok",
      franquia: c.franquia,
      servicos: linhas.map((l) => ({ nome: l.nome, preco: l.preco })),
    });
    setEtiquetas((l) => [...l, n]);
    setSelId(n.id);
  };

  /* ---------- 4. OCR local ---------- */
  const lerUma = async (e) => {
    const T = await carregarTesseract();
    const { data } = await T.recognize(e.img.url, "por");
    const j = parsePrintTexto(data?.text || "");
    if (!j.categoria) j.categoria = deduzCategoria(j.servicos.map((s) => s.nome));
    return j;
  };

  const lerTodas = async () => {
    const fila = etiquetas.filter((e) => e.estado === "pendente");
    if (!fila.length) return;
    setErro("");
    setProgresso({ feitas: 0, total: fila.length });
    for (let i = 0; i < fila.length; i++) {
      const e = fila[i];
      upd(e.id, { estado: "lendo" });
      try {
        const j = await lerUma(e);
        if (!j.servicos || !j.servicos.length) {
          upd(e.id, { estado: "erro" });
        } else {
          const c = CATEGORIAS[j.categoria];
          upd(e.id, {
            estado: "ok",
            categoria: c ? j.categoria : e.categoria,
            titulo: c ? c.titulo : e.titulo,
            coberturas: c ? c.coberturas : e.coberturas,
            franquia: j.franquia || (c ? c.franquia : e.franquia),
            equipamento: j.equipamento || "",
            servicos: j.servicos.map((s) => ({ nome: s.nome || "", preco: s.preco || "" })),
          });
        }
      } catch (err) {
        upd(e.id, { estado: "erro" });
      }
      setProgresso({ feitas: i + 1, total: fila.length });
    }
    setProgresso(null);
  };

  /* ---------- guardar / imprimir ---------- */
  const imprimir = () => window.print();

  /* ---------- render ---------- */
  const base = porFolha === 2 ? "16px" : porFolha === 4 ? "11.5px" : "9.5px";
  const visiveis = etiquetas.filter((e) => e.estado !== "pendente" && e.estado !== "lendo");
  const folhas = [];
  for (let i = 0; i < Math.max(visiveis.length, 1); i += porFolha) {
    folhas.push(visiveis.slice(i, i + porFolha));
  }
  const nFolhas = folhas.length;

  return (
    <div className="app">
      <style>{CSS}</style>

      {/* leitor de barcodes — mantido montado enquanto lê, para o vídeo não piscar */}
      <div className="cam noprint" style={{ display: scanner.scanning ? "flex" : "none" }}>
        <video ref={scanner.videoRef} playsInline muted />
        <div className="mira" />
        <p>Aponta ao código de barras do artigo. Cada leitura cria uma etiqueta.</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={scanner.stop}>Fechar</button>
        </div>
      </div>

      {camAberta && (
        <div className="cam noprint">
          <video ref={videoRef} playsInline muted />
          <p>Enquadra a lista de seguros a direito. Podes tirar várias fotos seguidas.</p>
          <div className="row">
            <button className="btn btn-ghost" onClick={fecharCamera}>Fechar</button>
            <button className="shot" onClick={capturar} aria-label="Tirar fotografia" />
          </div>
        </div>
      )}

      <div className="wrap">
        <div className="panel noprint">
          <h1>Etiquetas de seguros</h1>
          <p className="sub">Junta os prints de todos os artigos, lê tudo de uma vez, imprime.</p>

          {/* ---- 1. origem dos dados ---- */}
          <div className="sec">1 · De onde vêm os dados</div>
          <div className="chips">
            {[
              ["tabela", "Tabela de preços"],
              ["texto", "Colar texto"],
              ["manual", "Manual"],
              ["catalogo", "Catálogo"],
              ["ocr", "Print (OCR)"],
            ].map(([k, label]) => (
              <button key={k} className={"chip" + (modo === k ? " on" : "")} onClick={() => { setModo(k); setErro(""); }}>
                {label}
              </button>
            ))}
          </div>

          {/* --- 1z. tabela oficial de preços (o caminho normal) --- */}
          {modo === "tabela" && (
            <>
              <p className="hint" style={{ marginTop: 10 }}>
                Preços oficiais dos Planos de Proteção. Escolhe a família, escreve o preço do
                artigo e os escalões são aplicados sozinhos. Não precisa de EAN nem de dados
                de vendas.
              </p>

              <div className="sec" style={{ marginTop: 14 }}>Ler o artigo pelo EAN</div>
              <input type="text" value={eanTabela} autoFocus
                placeholder="Lê o código de barras ou escreve o EAN…"
                onChange={(e) => { setEanTabela(e.target.value); setAvisoEan(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resolverEanTabela(eanTabela); } }} />
              <div className="row">
                <button className="btn btn-ghost" onClick={scannerTabela.start} disabled={scannerTabela.scanning}>
                  Ler código de barras
                </button>
                <button className="btn btn-ghost" onClick={() => { setFamilia(""); setPrecoArtigo(""); setNomeArtigo(""); setGrupoExt(""); setAvisoEan(""); }}>
                  Limpar
                </button>
              </div>
              <p className="hint">
                Cruza com as campanhas e o stock já carregados: preenche preço, família e o
                grupo de extensão de garantia. Se o artigo não estiver lá, escreve o preço à mão.
              </p>
              {avisoEan && <div className="warn-box">{avisoEan}</div>}
              {scannerTabela.erro && <div className="err">{scannerTabela.erro}</div>}

              <label className="f" style={{ marginTop: 14 }}>Família</label>
              <div className="chips">
                {FAMILIAS.map((f) => (
                  <button key={f} className={"chip" + (familia === f ? " on" : "")}
                    onClick={() => setFamilia(f)}>
                    {f}
                  </button>
                ))}
              </div>

              <label className="f" style={{ marginTop: 14 }}>Preço original do artigo</label>
              <input type="text" inputMode="decimal" value={precoArtigo} placeholder="Ex.: 1499,99"
                onChange={(e) => setPrecoArtigo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && planos.length) etiquetaDaTabela(); }} />
              <p className="hint">
                Valor <b>antes</b> de promoção ou baixa de preço — é sobre esse que o prémio
                é calculado.
              </p>

              <label className="f" style={{ marginTop: 10 }}>Equipamento (opcional)</label>
              <input type="text" value={nomeArtigo} placeholder="Ex.: APPLE IPHONE 16 128GB"
                onChange={(e) => setNomeArtigo(e.target.value)} />

              {familia && precoNum !== null && !planos.length && (
                <div className="warn-box">
                  {precoNum > tectoDaFamilia(familia)
                    ? `Acima do maior escalão de ${familia} (${tectoDaFamilia(familia).toFixed(2).replace(".", ",")} €). Confirma no sistema.`
                    : "Nenhum plano cobre este valor nesta família."}
                </div>
              )}

              {planos.length > 0 && (
                <>
                  <div className="cat" style={{ marginTop: 12 }}>
                    {planos.map((p, i) => (
                      <div className="catrow" key={i}>
                        <span className="cn">
                          {p.nome}
                          {p.addon ? <span className="addon"> +cloud {p.addon}</span> : null}
                        </span>
                        <span className="cp">{p.preco}</span>
                      </div>
                    ))}
                  </div>
                  <p className="hint">
                    Escalão {planos[0].escalao.min.toFixed(2).replace(".", ",")} –{" "}
                    {planos[0].escalao.max.toFixed(2).replace(".", ",")} €
                    {planos.find((p) => p.franquia) ? ` · franquia ${planos.find((p) => p.franquia).franquia}` : ""}
                  </p>
                  {extensoes.length > 0 && (
                    <>
                      <div className="sec" style={{ marginTop: 16 }}>Extensões de garantia · {grupoExt}</div>
                      <div className="cat">
                        {extensoes.map((p, i) => (
                          <div className="catrow" key={i}>
                            <span className="cn">{p.produto}</span>
                            <span className="cp">{p.preco}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <button className="btn btn-main" style={{ marginTop: 10 }} onClick={etiquetaDaTabela}>
                    Criar etiqueta · {planos.length} seguros
                    {extensoes.length ? ` + ${extensoes.length} extensões` : ""}
                  </button>
                </>
              )}
            </>
          )}

          {/* --- 1a. texto colado --- */}
          {modo === "texto" && (
            <>
              <textarea
                className="ta"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={"SEG DDR INFORMATICA 1 ANO (1001-1500)   163,99 €\nSEG-EXT. GARANTIA LAPTOP +3ANOS   99,90 €\nFranquia 120€\nAPPLE MACBOOK AIR 13 M3\n\n(linha em branco separa artigos)"}
              />
              <div className="row">
                <button className="btn btn-main" onClick={lerTexto} disabled={!texto.trim()}>
                  Criar etiquetas
                </button>
                <button className="btn btn-ghost" onClick={() => setTexto("")} disabled={!texto}>
                  Limpar
                </button>
              </div>
              <p className="hint">
                No ecrã Planos Proteção, selecciona a lista, copia e cola aqui. Separa artigos
                diferentes com uma <b>linha em branco</b>. Escalões, franquia e categoria são
                detectados sozinhos.
              </p>
            </>
          )}

          {/* --- 1b. manual --- */}
          {modo === "manual" && (
            <>
              <p className="hint" style={{ marginTop: 10 }}>
                Escolhe a categoria: a etiqueta nasce já com as designações e coberturas
                habituais dessa família. Só tens de escrever os preços no passo 3.
              </p>
              <div className="chips" style={{ marginTop: 10 }}>
                {Object.keys(CATEGORIAS).map((k) => (
                  <button key={k} className="chip" onClick={() => {
                    const c = CATEGORIAS[k];
                    const n = novaEtiqueta(k, {
                      estado: "ok",
                      franquia: c.franquia,
                      servicos: c.servicos.map((nome) => ({ nome, preco: "" })),
                    });
                    setEtiquetas((l) => [...l, n]);
                    setSelId(n.id);
                  }}>
                    + {k}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* --- 1c. catálogo vindo do ficheiro de vendas --- */}
          {modo === "catalogo" && (
            <>
              {/* v3.25.1: o EAN e o scanner estão SEMPRE disponíveis. Antes viviam
                  dentro do bloco "catalogoApp.length > 0" e desapareciam quando não
                  havia dados de vendas carregados — que é o caso mais comum. */}
              {catalogoApp.length > 0 ? (
                <div className="ok-box">
                  {catalogoApp.length} seguros e {artigos.length} artigos vindos da Análise de
                  Vendas — os preços saem preenchidos.
                </div>
              ) : (
                <div className="warn-box">
                  Sem dados de vendas em memória. Podes na mesma ler o EAN — a etiqueta sai
                  com as designações da família, mas <b>sem preços</b>. Para os preços, abre
                  a Análise de Vendas ou importa o ficheiro aqui em baixo.
                </div>
              )}
                  <label className="f" style={{ marginTop: 12 }}>EAN ou designação do artigo</label>
                  <input type="text" value={procura} autoFocus
                    placeholder="Lê o código de barras ou escreve o nome…"
                    onChange={(e) => { setProcura(e.target.value); setArtigoSel(null); }}
                    onKeyDown={(e) => {
                      // A pistola termina a leitura com Enter — não esperar pelo debounce.
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const q = procura.trim();
                      if (/^\d{6,}$/.test(q)) resolverEan(q);
                    }} />
                  <div className="row">
                    <button className="btn btn-ghost" onClick={scanner.start} disabled={scanner.scanning}>
                      Ler código de barras
                    </button>
                  </div>
                  <p className="hint">
                    Um EAN completo cria a etiqueta sozinho — com a pistola, com a câmara,
                    ou escrito à mão.
                  </p>
                  {scanner.erro && <div className="err">{scanner.erro}</div>}
                  {artigosFiltrados.length > 0 && !artigoSel && (
                    <div className="cat">
                      {artigosFiltrados.map((a, i) => (
                        <div className="catrow art" key={i} onClick={() => { setArtigoSel(a); setErro(""); }}>
                          <span className="cn">{a.name}</span>
                          <span className="cp">{a.pvp.toFixed(2).replace(".", ",")} €</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {artigoSel && (
                    <div className="sel-art">
                      <div className="cn"><b>{artigoSel.name}</b></div>
                      <div className="t2">
                        {artigoSel.desconhecido
                          ? "Artigo não encontrado nos dados de vendas — preços por preencher."
                          : artigoSel.pvp.toFixed(2).replace(".", ",") + " €"}
                        {" · escolhe a família:"}
                      </div>
                      <div className="chips" style={{ marginTop: 8 }}>
                        {categoriasDisponiveis.map((k) => (
                          <button key={k} className="chip" onClick={() => { etiquetaDoArtigo(artigoSel, k); setArtigoSel(null); setProcura(""); }}>
                            {k}
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setArtigoSel(null)}>
                        Escolher outro artigo
                      </button>
                    </div>
                  )}

                  <p className="hint">
                    O preço do artigo determina o <b>escalão</b> de cada seguro, por isso os
                    valores são os que o cliente vai mesmo pagar. A família não é adivinhada —
                    escolhe-la tu. Confere na pré-visualização antes de imprimir.
                  </p>
                  <div className="sec" style={{ marginTop: 18 }}>Ou importar de um ficheiro</div>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => xlsxRef.current?.click()} disabled={!!progresso}>
                  {progresso ? "A ler o ficheiro…" : catalogo.length ? "Actualizar catálogo" : "Importar ficheiro de vendas"}
                </button>
              </div>
              <input ref={xlsxRef} type="file" accept=".xlsx,.xls,.xlsm" style={{ display: "none" }}
                onChange={(e) => importarCatalogo(e.target.files?.[0])} />

              {!catalogo.length ? (
                <p className="hint">
                  Importa o mesmo ficheiro que usas na Análise de Vendas. Da sheet
                  <b> BD TT SEGUROS</b> saem as designações e o preço mais praticado de cada
                  seguro. Fica guardado — só precisas de repetir quando os preços mudarem.
                </p>
              ) : (
                <>
                  <input type="text" style={{ marginTop: 10 }} value={procura}
                    placeholder={`Procurar entre ${catalogo.length} seguros…`}
                    onChange={(e) => setProcura(e.target.value)} />
                  <div className="chips" style={{ marginTop: 10 }}>
                    {Object.keys(CATEGORIAS)
                      .filter((k) => catalogo.some((c) => c.categoria === k))
                      .map((k) => (
                        <button key={k} className="chip" onClick={() => etiquetaDoCatalogo(k)}>
                          + {k}
                        </button>
                      ))}
                  </div>
                  <div className="cat">
                    {catalogoFiltrado.map((c, i) => (
                      <div className="catrow" key={i}>
                        <span className="cn">{c.nome}</span>
                        <span className="cp">{c.preco || "—"}</span>
                      </div>
                    ))}
                    {!catalogoFiltrado.length && <div className="vazio">Nada encontrado.</div>}
                  </div>
                  <p className="hint">
                    Os botões criam uma etiqueta com todos os seguros dessa categoria e os preços
                    já preenchidos. Confere sempre antes de imprimir.
                  </p>
                </>
              )}
            </>
          )}

          {/* --- 1d. OCR local --- */}
          {modo === "ocr" && (
            <>
              <div
                className={"drop" + (dragOn ? " on" : "")}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOn(true); }}
                onDragLeave={() => setDragOn(false)}
                onDrop={(e) => { e.preventDefault(); setDragOn(false); adicionarFicheiros(e.dataTransfer.files); }}
              >
                Cola com <b>Ctrl+V</b>, arrasta os ficheiros
                <br />
                ou clica para escolher vários de uma vez
              </div>
              <div className="row">
                <button className="btn btn-main" onClick={lerTodas} disabled={!pendentes || !!progresso}>
                  {progresso ? `A ler ${progresso.feitas} de ${progresso.total}…` : `Ler ${pendentes || ""} print${pendentes === 1 ? "" : "s"}`}
                </button>
                <button className="btn btn-ghost" onClick={abrirCamera} disabled={!!progresso}>
                  Fotografar
                </button>
              </div>
              <p className="hint">
                O reconhecimento corre <b>no teu browser</b> — nada sai do computador e não há
                custo. Em contrapartida engana-se com alguma frequência nos números: confirma
                sempre os preços no passo 3. Para prints, o modo <b>Colar texto</b> é mais fiável.
              </p>
            </>
          )}

          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => adicionarFicheiros(e.target.files)} />
          <input ref={camInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => adicionarFicheiros(e.target.files)} />
          {erro && <div className="err">{erro}</div>}

          {/* ---- 2. lista ---- */}
          <div className="sec">2 · Etiquetas ({etiquetas.length})</div>
          {etiquetas.map((e) => (
            <div
              key={e.id}
              className={"item" + (e.id === selId ? " on" : "")}
              onClick={() => setSelId(e.id === selId ? null : e.id)}
            >
              {e.img ? <img className="mini" src={e.img.url} alt="" /> : <div className="mini" />}
              <div className="txt">
                <div className="t1">{e.equipamento || "Sem equipamento"}</div>
                <div className="t2">{e.categoria} · {e.servicos.length} serviços</div>
              </div>
              {e.estado === "pendente" && <span className="tag pend">por ler</span>}
              {e.estado === "lendo" && <span className="tag lend">a ler</span>}
              {e.estado === "erro" && <span className="tag bad">falhou</span>}
              {e.estado === "ok" && <span className="tag ok">pronta</span>}
              <button className="x" title="Remover"
                onClick={(ev) => { ev.stopPropagation(); setEtiquetas((l) => l.filter((x) => x.id !== e.id)); }}>
                ×
              </button>
            </div>
          ))}
          <div className="row">
            <button className="btn btn-ghost" onClick={() => { const n = novaEtiqueta(); setEtiquetas((l) => [...l, n]); setSelId(n.id); }}>
              + Etiqueta em branco
            </button>
            {sel && (
              <button className="btn btn-ghost" onClick={() => {
                const n = { ...sel, id: "e" + Date.now(), img: undefined };
                setEtiquetas((l) => [...l, n]);
              }}>
                Duplicar
              </button>
            )}
          </div>

          {/* ---- 3. editor ---- */}
          <div className="sec">3 · Editar etiqueta</div>
          {!sel ? (
            <p className="vazio">Escolhe uma etiqueta na lista acima para corrigir designações, preços ou coberturas.</p>
          ) : (
            <>
              <label className="f">Categoria</label>
              <div className="chips">
                {Object.keys(CATEGORIAS).map((k) => (
                  <button key={k} className={"chip" + (sel.categoria === k ? " on" : "")}
                    onClick={() => aplicarCategoria(sel.id, k)}>
                    {k}
                  </button>
                ))}
              </div>

              <label className="f" style={{ marginTop: 14 }}>Equipamento</label>
              <input type="text" value={sel.equipamento} placeholder="Ex.: LG TV OLED 55C5 4K"
                onChange={(ev) => upd(sel.id, { equipamento: ev.target.value })} />

              <label className="f" style={{ marginTop: 10 }}>Franquia</label>
              <input type="text" value={sel.franquia} placeholder="Ex.: 120 €"
                onChange={(ev) => upd(sel.id, { franquia: ev.target.value })} />
              <p className="hint">Só aparece nas linhas DDR. Multigarantias e extensões levam “Garantias Fnac”.</p>

              <label className="f" style={{ marginTop: 14 }}>Serviços e preços</label>
              {sel.servicos.map((s, i) => (
                <div className="srow" key={i}>
                  <input type="text" value={s.nome} placeholder="Designação"
                    onChange={(ev) => upd(sel.id, { servicos: sel.servicos.map((x, k) => (k === i ? { ...x, nome: ev.target.value } : x)) })} />
                  <input type="text" value={s.preco} placeholder="00,00 €"
                    onChange={(ev) => upd(sel.id, { servicos: sel.servicos.map((x, k) => (k === i ? { ...x, preco: ev.target.value } : x)) })} />
                  <button title="Remover linha"
                    onClick={() => upd(sel.id, { servicos: sel.servicos.filter((_, k) => k !== i) })}>×</button>
                </div>
              ))}
              <button className="btn btn-ghost"
                onClick={() => upd(sel.id, { servicos: [...sel.servicos, { nome: "", preco: "" }] })}>
                + Linha
              </button>

              <label className="f" style={{ marginTop: 16 }}>Coberturas do banner</label>
              {sel.coberturas.map((c) => (
                <div className="cov" key={c.id}>
                  <input type="checkbox" id={sel.id + c.id} checked={c.on}
                    onChange={() => upd(sel.id, { coberturas: sel.coberturas.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)) })} />
                  <label htmlFor={sel.id + c.id}>{c.label}</label>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={guardarCoberturas}>
                Usar estas coberturas em {sel.categoria}
              </button>
              <p className="hint">Fica guardado e passa a ser aplicado a todos os prints desta categoria.</p>

              <label className="f" style={{ marginTop: 14 }}>Nome do plano</label>
              <input type="text" value={sel.titulo} onChange={(ev) => upd(sel.id, { titulo: ev.target.value })} />
            </>
          )}

          {/* ---- 4. folha ---- */}
          <div className="sec">4 · Folhas A4</div>
          <div className="chips">
            {[2, 4, 6].map((v) => (
              <button key={v} className={"chip" + (porFolha === v ? " on" : "")} onClick={() => setPorFolha(v)}>
                {v} por folha
              </button>
            ))}
          </div>
          <label className="f" style={{ marginTop: 14 }}>Rodapé</label>
          <input type="text" value={rodape} onChange={(e) => setRodape(e.target.value)} />
          <div className="cov" style={{ marginTop: 8 }}>
            <input type="checkbox" id="cbbot" checked={botao} onChange={() => setBotao(!botao)} />
            <label htmlFor="cbbot">Mostrar botão “&gt; Subscrever”</label>
          </div>
          <button className="btn btn-main" style={{ marginTop: 4 }} onClick={imprimir}
            disabled={!visiveis.length}>
            Imprimir ou guardar em PDF · {nFolhas} folha{nFolhas === 1 ? "" : "s"}
          </button>
          <p className="hint">
            Na janela que abre: A4, margens “Nenhumas” e gráficos de fundo ligados. Para ficar com o
            ficheiro, muda a impressora para <b>Guardar como PDF</b> — depois é só anexá-lo ao e-mail.
          </p>
        </div>

        {/* ---- pré-visualização ---- */}
        <div className="stage" ref={stageRef}>
          <div className="previewbox">
            <div className="scaler"
              style={{ transform: `scale(${escala})`, height: (1123 * nFolhas + 60 * (nFolhas - 1)) * escala }}>
              <div className="folhas">
                {folhas.map((grupo, fi) => (
                  <div className={"folha g" + porFolha} key={fi}>
                    {Array.from({ length: porFolha }).map((_, i) => (
                      <Etiqueta key={i} e={grupo[i]} base={base} rodape={rodape} botao={botao} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
