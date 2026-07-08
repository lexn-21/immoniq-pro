import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, X, Check, RotateCw, Crop, Sparkles, Trash2,
  ImagePlus, FileText, ChevronLeft, ChevronRight, Sun, Contrast as ContrastIcon,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

type Filter = "auto" | "bw" | "color" | "grayscale";

type Page = {
  id: string;
  /** Original-Bild als data url */
  src: string;
  /** Bearbeitete data url (nach Filter / Crop / Rotation) — wird in PDF genutzt */
  edited: string;
  filter: Filter;
  rotation: 0 | 90 | 180 | 270;
  /** Crop in normierten Koordinaten 0..1 (relativ zum Original nach Rotation) */
  crop: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);

/** Bild laden */
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

/** Wendet Filter / Rotation / Crop auf ein Original-Bild an und gibt JPEG-DataURL zurück */
async function processPage(p: Page): Promise<string> {
  const img = await loadImage(p.src);

  // 1) Rotate auf temp canvas
  const rotated = document.createElement("canvas");
  const rad = (p.rotation * Math.PI) / 180;
  if (p.rotation % 180 === 0) {
    rotated.width = img.width;
    rotated.height = img.height;
  } else {
    rotated.width = img.height;
    rotated.height = img.width;
  }
  const rctx = rotated.getContext("2d")!;
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  // 2) Crop
  const cw = Math.max(1, Math.round(rotated.width * p.crop.w));
  const ch = Math.max(1, Math.round(rotated.height * p.crop.h));
  const cx = Math.round(rotated.width * p.crop.x);
  const cy = Math.round(rotated.height * p.crop.y);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d")!;
  octx.drawImage(rotated, cx, cy, cw, ch, 0, 0, cw, ch);

  // 3) Filter via Pixel-Manipulation
  if (p.filter !== "color") {
    const imgData = octx.getImageData(0, 0, cw, ch);
    const d = imgData.data;
    if (p.filter === "grayscale") {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = g;
      }
    } else if (p.filter === "bw") {
      // Adaptive Schwellung: erst Grauwert + Kontrast hochziehen, dann harter Schwellwert
      let sum = 0;
      const n = cw * ch;
      const grays = new Float32Array(n);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        grays[j] = g;
        sum += g;
      }
      const mean = sum / n;
      const thr = Math.min(210, Math.max(110, mean * 0.92));
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const v = grays[j] > thr ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    } else if (p.filter === "auto") {
      // Auto-Enhance: Weißabgleich + Kontrast
      // Simpler: pro Kanal histogram-stretch
      const min = [255, 255, 255];
      const max = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          if (d[i + c] < min[c]) min[c] = d[i + c];
          if (d[i + c] > max[c]) max[c] = d[i + c];
        }
      }
      const range = [Math.max(1, max[0] - min[0]), Math.max(1, max[1] - min[1]), Math.max(1, max[2] - min[2])];
      for (let i = 0; i < d.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let v = ((d[i + c] - min[c]) / range[c]) * 255;
          // sanfter Kontrast-Boost
          v = (v - 128) * 1.18 + 132;
          d[i + c] = Math.max(0, Math.min(255, v));
        }
      }
    }
    octx.putImageData(imgData, 0, 0);
  }

  return out.toDataURL("image/jpeg", 0.88);
}

/** PDF aus Pages bauen (A4, Bilder eingepasst) */
async function buildPdf(pages: Page[]): Promise<Blob> {
  let pdf: jsPDF | null = null;
  for (let i = 0; i < pages.length; i++) {
    const data = pages[i].edited;
    const img = await loadImage(data);
    const orient: "landscape" | "portrait" = img.width > img.height ? "landscape" : "portrait";
    if (!pdf) {
      pdf = new jsPDF({ unit: "pt", format: "a4", orientation: orient });
    } else {
      pdf.addPage("a4", orient);
    }
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const maxW = pw - margin * 2;
    const maxH = ph - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (pw - w) / 2;
    const y = (ph - h) / 2;
    pdf.addImage(data, "JPEG", x, y, w, h, undefined, "FAST");
  }
  return pdf!.output("blob");
}

/* ------------------------------ Crop Editor ------------------------------ */

type CropRect = { x: number; y: number; w: number; h: number };

function CropEditor({
  page,
  onCancel,
  onApply,
}: {
  page: Page;
  onCancel: () => void;
  onApply: (crop: CropRect) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<CropRect>(page.crop);
  const [imgBox, setImgBox] = useState<{ w: number; h: number; left: number; top: number } | null>(null);

  // Rotated source for display (so crop matches processing)
  const [rotatedSrc, setRotatedSrc] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const img = await loadImage(page.src);
      const c = document.createElement("canvas");
      const rad = (page.rotation * Math.PI) / 180;
      if (page.rotation % 180 === 0) { c.width = img.width; c.height = img.height; }
      else { c.width = img.height; c.height = img.width; }
      const ctx = c.getContext("2d")!;
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      setRotatedSrc(c.toDataURL("image/jpeg", 0.9));
    })();
  }, [page.src, page.rotation]);

  const measure = useCallback(() => {
    const img = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    setImgBox({ w: ir.width, h: ir.height, left: ir.left - wr.left, top: ir.top - wr.top });
  }, []);

  useEffect(() => {
    if (!rotatedSrc) return;
    const t = setTimeout(measure, 30);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [rotatedSrc, measure]);

  const dragRef = useRef<{ mode: string; startX: number; startY: number; start: CropRect } | null>(null);

  const onPointerDown = (mode: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: { ...rect } };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !imgBox) return;
    const dx = (e.clientX - d.startX) / imgBox.w;
    const dy = (e.clientY - d.startY) / imgBox.h;
    let { x, y, w, h } = d.start;
    const MIN = 0.06;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    if (d.mode === "move") {
      x = clamp(d.start.x + dx, 0, 1 - w);
      y = clamp(d.start.y + dy, 0, 1 - h);
    } else {
      if (d.mode.includes("w")) { const nx = clamp(d.start.x + dx, 0, d.start.x + d.start.w - MIN); w = d.start.w - (nx - d.start.x); x = nx; }
      if (d.mode.includes("e")) { w = clamp(d.start.w + dx, MIN, 1 - d.start.x); }
      if (d.mode.includes("n")) { const ny = clamp(d.start.y + dy, 0, d.start.y + d.start.h - MIN); h = d.start.h - (ny - d.start.y); y = ny; }
      if (d.mode.includes("s")) { h = clamp(d.start.h + dy, MIN, 1 - d.start.y); }
    }
    setRect({ x, y, w, h });
  };

  const onPointerUp = () => { dragRef.current = null; };

  const style = imgBox
    ? {
        left: imgBox.left + rect.x * imgBox.w,
        top: imgBox.top + rect.y * imgBox.h,
        width: rect.w * imgBox.w,
        height: rect.h * imgBox.h,
      }
    : { display: "none" as const };

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const handlePos: Record<string, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    n:  "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    e:  "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    s:  "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    w:  "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
      <div
        ref={wrapRef}
        className="flex-1 relative flex items-center justify-center p-4 select-none touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {rotatedSrc ? (
          <img
            ref={imgRef}
            src={rotatedSrc}
            alt=""
            draggable={false}
            onLoad={measure}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-white/60 text-sm">Lade…</div>
        )}

        {imgBox && (
          <>
            {/* dark overlay outside crop */}
            <div className="absolute pointer-events-none" style={{ left: imgBox.left, top: imgBox.top, width: imgBox.w, height: imgBox.h, boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`, clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${rect.y * 100}%, ${rect.x * 100}% ${rect.y * 100}%, ${rect.x * 100}% ${(rect.y + rect.h) * 100}%, ${(rect.x + rect.w) * 100}% ${(rect.y + rect.h) * 100}%, ${(rect.x + rect.w) * 100}% ${rect.y * 100}%, 0 ${rect.y * 100}%)` }} />
            {/* crop rect */}
            <div
              className="absolute border-2 border-[#c9a84c] cursor-move"
              style={style}
              onPointerDown={onPointerDown("move")}
            >
              {/* grid */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/30" />
                <div className="absolute top-1/3 left-0 right-0 border-t border-white/30" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-white/30" />
              </div>
              {handles.map((h) => (
                <div
                  key={h}
                  onPointerDown={onPointerDown(h)}
                  className={`absolute h-4 w-4 bg-[#c9a84c] border-2 border-white rounded-sm ${handlePos[h]}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="border-t border-white/10 bg-black flex items-center justify-between px-4 py-3 gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onCancel}>Abbrechen</Button>
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => setRect({ x: 0, y: 0, w: 1, h: 1 })}
        >
          Zurücksetzen
        </Button>
        <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold" onClick={() => onApply(rect)}>
          <Check className="h-4 w-4 mr-2" /> Übernehmen
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Component ------------------------------ */


type Props = {
  open: boolean;
  onClose: () => void;
  /** Liefert das fertige PDF (oder JPG bei einer Seite) als File zurück */
  onComplete: (file: File) => void | Promise<void>;
  /** Suggest filename (ohne Ext) */
  suggestedName?: string;
};

export function DocScanner({ open, onClose, onComplete, suggestedName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"capture" | "review">("capture");
  const [pages, setPages] = useState<Page[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);


  /* --- Kamera Lifecycle --- */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (e: any) {
      setCameraError(
        e?.name === "NotAllowedError"
          ? "Kamera-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben."
          : "Kamera nicht verfügbar. Du kannst stattdessen ein Foto hochladen."
      );
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    if (stage === "capture") startCamera();
    else stopCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage]);

  /* --- Reset on close --- */
  useEffect(() => {
    if (!open) {
      setPages([]);
      setStage("capture");
      setActiveIdx(0);
    }
  }, [open]);

  /* --- Snap --- */
  const snap = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return toast.error("Kamera noch nicht bereit");
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const src = canvas.toDataURL("image/jpeg", 0.92);
    const newPage: Page = {
      id: uid(),
      src,
      edited: src,
      filter: "auto",
      rotation: 0,
      crop: { x: 0, y: 0, w: 1, h: 1 },
      width: canvas.width,
      height: canvas.height,
    };
    // sofort auto-enhance
    newPage.edited = await processPage(newPage);
    setPages((p) => [...p, newPage]);
    toast.success(`Seite ${pages.length + 1} aufgenommen`);
  }, [pages.length]);

  /* --- Datei hochladen statt Foto --- */
  const onPickFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return toast.error("Bitte ein Bild auswählen");
    const newPages: Page[] = [];
    for (const f of arr) {
      const src = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const img = await loadImage(src);
      const np: Page = {
        id: uid(),
        src,
        edited: src,
        filter: "auto",
        rotation: 0,
        crop: { x: 0, y: 0, w: 1, h: 1 },
        width: img.width,
        height: img.height,
      };
      np.edited = await processPage(np);
      newPages.push(np);
    }
    setPages((p) => [...p, ...newPages]);
    toast.success(`${newPages.length} Seite(n) hinzugefügt`);
  };

  /* --- Edit aktive Seite --- */
  const updatePage = async (patch: Partial<Page>) => {
    setBusy(true);
    try {
      setPages((prev) => {
        const next = [...prev];
        next[activeIdx] = { ...next[activeIdx], ...patch };
        return next;
      });
      // re-process
      const merged = { ...pages[activeIdx], ...patch };
      const newEdited = await processPage(merged);
      setPages((prev) => {
        const next = [...prev];
        next[activeIdx] = { ...next[activeIdx], ...patch, edited: newEdited };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const removePage = (idx: number) => {
    setPages((p) => p.filter((_, i) => i !== idx));
    setActiveIdx((i) => Math.max(0, Math.min(i, pages.length - 2)));
  };

  /* --- Speichern --- */
  const save = async () => {
    if (!pages.length) return;
    setBusy(true);
    const t = toast.loading("PDF wird erstellt…");
    try {
      const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
      const baseName = (suggestedName || "Scan").replace(/[^\w\-_. ]/g, "");
      let file: File;
      if (pages.length === 1) {
        // Single page → JPEG
        const blob = await (await fetch(pages[0].edited)).blob();
        file = new File([blob], `${baseName}_${ts}.jpg`, { type: "image/jpeg" });
      } else {
        const pdfBlob = await buildPdf(pages);
        file = new File([pdfBlob], `${baseName}_${ts}.pdf`, { type: "application/pdf" });
      }
      toast.dismiss(t);
      await onComplete(file);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erstellung fehlgeschlagen", { id: t });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const active = pages[activeIdx];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Abbrechen">
          <X className="h-5 w-5" />
        </Button>
        <div className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {stage === "capture" ? "Dokument scannen" : `Vorschau · ${pages.length} Seite${pages.length !== 1 ? "n" : ""}`}
        </div>
        {stage === "capture" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={!pages.length}
            onClick={() => {
              setStage("review");
              setActiveIdx(0);
            }}
          >
            Weiter ({pages.length})
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setStage("capture")}>
            <Camera className="h-4 w-4 mr-1" /> Mehr
          </Button>
        )}
      </header>

      {/* Body */}
      {stage === "capture" ? (
        <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
          {cameraError ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm space-y-4">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
                <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                  <ImagePlus className="h-4 w-4 mr-2" /> Foto hochladen
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 relative">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Visueller Rahmen / Hilfe */}
                <div className="absolute inset-6 border-2 border-white/40 rounded-2xl pointer-events-none" />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                    Kamera wird gestartet…
                  </div>
                )}
              </div>

              {/* Page strip */}
              {pages.length > 0 && (
                <div className="bg-black/80 px-3 py-2 overflow-x-auto">
                  <div className="flex gap-2">
                    {pages.map((p, i) => (
                      <div key={p.id} className="relative h-16 w-12 rounded-md overflow-hidden border border-white/30 flex-shrink-0">
                        <img src={p.edited} alt={`Seite ${i + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-1 rounded-tl">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capture controls */}
              <div className="bg-black px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-12 w-12"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Aus Galerie"
                >
                  <ImagePlus className="h-6 w-6" />
                </Button>

                <button
                  onClick={snap}
                  disabled={!cameraReady}
                  aria-label="Foto aufnehmen"
                  className="h-[72px] w-[72px] rounded-full bg-white border-4 border-white/30 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center"
                >
                  <div className="h-14 w-14 rounded-full bg-white border-2 border-black/20" />
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 h-12 px-3"
                  disabled={!pages.length}
                  onClick={() => {
                    setStage("review");
                    setActiveIdx(0);
                  }}
                >
                  Fertig
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
        </div>
      ) : (
        /* REVIEW / EDIT */
        <div className="flex-1 flex flex-col overflow-hidden">
          {cropMode && active ? (
            <CropEditor
              page={active}
              onCancel={() => setCropMode(false)}
              onApply={async (crop) => {
                setCropMode(false);
                await updatePage({ crop });
              }}
            />
          ) : (
          <div className="flex-1 bg-muted/30 flex items-center justify-center p-4 overflow-hidden relative">
            {active ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={active.id + active.edited.length}
                  src={active.edited}
                  alt={`Seite ${activeIdx + 1}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Seiten</p>
            )}

            {/* Pager */}
            {pages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 border border-border flex items-center justify-center disabled:opacity-30"
                  disabled={activeIdx === 0}
                  onClick={() => setActiveIdx((i) => i - 1)}
                  aria-label="Vorherige"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 border border-border flex items-center justify-center disabled:opacity-30"
                  disabled={activeIdx === pages.length - 1}
                  onClick={() => setActiveIdx((i) => i + 1)}
                  aria-label="Nächste"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <Badge variant="secondary" className="absolute top-3 left-3">
              Seite {activeIdx + 1} / {pages.length}
            </Badge>
          </div>
          )}

          {!cropMode && (


          {/* Edit toolbar */}
          {active && (
            <div className="border-t border-border bg-background">
              {/* Filter */}
              <div className="flex gap-2 overflow-x-auto p-3">
                {(
                  [
                    { v: "auto", label: "Auto", icon: Sparkles },
                    { v: "bw", label: "S/W Doku", icon: ContrastIcon },
                    { v: "grayscale", label: "Graustufen", icon: Sun },
                    { v: "color", label: "Original", icon: ImagePlus },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.v}
                    disabled={busy}
                    onClick={() => updatePage({ filter: f.v as Filter })}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      active.filter === f.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    <f.icon className="h-3.5 w-3.5" />
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Rotate / Delete / Crop reset */}
              <div className="flex items-center justify-around border-t border-border py-2">
                <button
                  disabled={busy}
                  onClick={() =>
                    updatePage({ rotation: (((active.rotation + 90) % 360) as Page["rotation"]) })
                  }
                  className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCw className="h-5 w-5" />
                  Drehen
                </button>
                <button
                  disabled={busy}
                  onClick={() => updatePage({ crop: { x: 0.04, y: 0.04, w: 0.92, h: 0.92 } })}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Auto-Crop (Ränder beschneiden)"
                >
                  <Crop className="h-5 w-5" />
                  Zuschneiden
                </button>
                <button
                  disabled={busy || pages.length === 0}
                  onClick={() => removePage(activeIdx)}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-5 w-5" />
                  Löschen
                </button>
              </div>

              {/* Page strip */}
              <div className="border-t border-border px-3 py-2 overflow-x-auto bg-muted/30">
                <div className="flex gap-2">
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveIdx(i)}
                      className={`relative h-16 w-12 rounded-md overflow-hidden border-2 flex-shrink-0 transition ${
                        i === activeIdx ? "border-primary shadow-md" : "border-border opacity-70"
                      }`}
                    >
                      <img src={p.edited} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-1 rounded-tl">
                        {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="p-3 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button
                  onClick={save}
                  disabled={busy || !pages.length}
                  className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold h-12"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {pages.length === 1 ? "Als Bild speichern" : `Als PDF speichern (${pages.length} Seiten)`}
                </Button>
              </div>
            </div>
          )}
          )}
        </div>

      )}
    </div>
  );
}
