'use client';

// ─────────────────────────────────────────────────────────────────────────
// useBarcodeScanner — leitura de códigos de barras pela câmara.
//
// Extraído do scanner do Inventário (v3.1.1), que já tinha resolvido as
// partes chatas: BarcodeDetector nativo onde existe, ZXing como fallback
// para iOS Safari e Firefox, e a libertação da câmara no iOS.
//
// Uso:
//   const scanner = useBarcodeScanner({ onEan: (ean) => ... });
//   <video ref={scanner.videoRef} playsInline muted />
//   scanner.start() / scanner.stop() / scanner.scanning / scanner.erro
//
// A pistola de barcodes NÃO precisa disto — comporta-se como um teclado e
// escreve directamente no input.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeEAN } from './helpers';

const FORMATOS_NATIVOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

/** Bip curto: agudo quando encontra, grave quando não. */
export function bip(ok = true) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1200 : 600;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* sem áudio disponível — não é motivo para falhar a leitura */
  }
}

export function useBarcodeScanner({ onEan, debounceMs = 2000, lockoutMs = 600 } = {}) {
  const [scanning, setScanning] = useState(false);
  const [erro, setErro] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const zxingRef = useRef(null);

  const ultimoRef = useRef('');
  const ultimoTsRef = useRef(0);
  const lockoutRef = useRef(0);
  const onEanRef = useRef(onEan);
  useEffect(() => { onEanRef.current = onEan; }, [onEan]);

  // Mesma protecção do Inventário: a câmara dispara a mesma leitura muitas
  // vezes por segundo. Lockout global + debounce por EAN.
  const processar = useCallback((bruto) => {
    const ean = normalizeEAN(bruto);
    if (!ean) return;
    const agora = Date.now();
    if (agora < lockoutRef.current) return;
    if (ean === ultimoRef.current && agora - ultimoTsRef.current < debounceMs) return;
    ultimoRef.current = ean;
    ultimoTsRef.current = agora;
    lockoutRef.current = agora + lockoutMs;
    onEanRef.current?.(ean);
  }, [debounceMs, lockoutMs]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (zxingRef.current) {
      try { zxingRef.current.stop(); } catch {}
      zxingRef.current = null;
    }

    // O iOS às vezes não liberta a câmara se pararmos tracks já paradas.
    if (streamRef.current) {
      try {
        for (const t of streamRef.current.getTracks?.() || []) {
          try { if (t.readyState !== 'ended') t.stop(); } catch {}
        }
      } catch {}
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
        if (typeof videoRef.current.load === 'function') videoRef.current.load();
      } catch {}
    }
    streamRef.current = null;
    detectorRef.current = null;
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    setErro(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este browser não suporta acesso à câmara. Escreve o EAN à mão.');
        return;
      }
      if (typeof window !== 'undefined' &&
          window.location.protocol === 'http:' &&
          window.location.hostname !== 'localhost') {
        setErro('A câmara requer HTTPS. Abre a app em https:// ou escreve o EAN à mão.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setScanning(true);

      // 1ª escolha: BarcodeDetector nativo (Android Chrome). O iOS Safari
      // ainda não o implementa, daí o fallback ser obrigatório.
      if ('BarcodeDetector' in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({ formats: FORMATOS_NATIVOS });
          const detectar = async () => {
            if (!videoRef.current || !detectorRef.current) return;
            try {
              const codigos = await detectorRef.current.detect(videoRef.current);
              for (const c of codigos) processar(c.rawValue);
            } catch {}
            rafRef.current = requestAnimationFrame(detectar);
          };
          rafRef.current = requestAnimationFrame(detectar);
          return;
        } catch (e) {
          console.warn('[scanner] BarcodeDetector falhou, a usar ZXing:', e);
          detectorRef.current = null;
        }
      }

      // 2ª escolha: ZXing em JS puro — iOS Safari, Firefox, etc.
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);
        zxingRef.current = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (!result) return; // sem código no frame — continua
          const texto = typeof result.getText === 'function' ? result.getText() : (result.text || '');
          if (texto) processar(texto);
        });
      } catch (e) {
        console.error('[scanner] ZXing falhou:', e);
        setErro('Não foi possível iniciar o leitor neste browser. Escreve o EAN à mão.');
      }
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setErro('Permissão de câmara negada. Autoriza a câmara nas definições do browser.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        setErro('Câmara traseira não encontrada. Escreve o EAN à mão.');
      } else {
        setErro('Erro ao aceder à câmara: ' + (err?.message || String(err)));
      }
    }
  }, [processar]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, scanning, erro, start, stop, setErro };
}
