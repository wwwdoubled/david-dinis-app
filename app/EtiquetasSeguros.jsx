'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";

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

.cam{position:fixed;inset:0;background:rgba(15,15,14,.92);z-index:60;display:flex;
  flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:14px}
.cam video{width:100%;max-width:760px;max-height:70vh;border-radius:10px;background:#000;object-fit:contain}
.cam p{color:#e8e8e4;font-size:12.5px;margin:0;text-align:center;max-width:420px;line-height:1.5}
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
export default function EtiquetasSeguros() {
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

  const stageRef = useRef(null);
  const fileRef = useRef(null);
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

  /* ---------- leitura ---------- */
  const lerUma = async (e) => {
    const r = await fetch("/api/ler-print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagem: e.img.b64, media: e.img.media }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.erro || "A leitura falhou.");
    }
    return r.json();
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

          {/* ---- 1. prints ---- */}
          <div className="sec">1 · Prints dos artigos</div>
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
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => adicionarFicheiros(e.target.files)} />
          <input ref={camInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => adicionarFicheiros(e.target.files)} />

          <div className="row">
            <button className="btn btn-main" onClick={lerTodas} disabled={!pendentes || !!progresso}>
              {progresso ? `A ler ${progresso.feitas} de ${progresso.total}…` : `Ler ${pendentes || ""} print${pendentes === 1 ? "" : "s"}`}
            </button>
            <button className="btn btn-ghost" onClick={abrirCamera} disabled={!!progresso}>
              Fotografar
            </button>
          </div>
          {erro && <div className="err">{erro}</div>}
          <p className="hint">
            Um print por artigo. Cada um dá origem a uma etiqueta com a categoria, a franquia e os
            preços já preenchidos.
          </p>

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
