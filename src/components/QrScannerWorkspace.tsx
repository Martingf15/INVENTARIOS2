import React from "react";
import { 
  QrCode, 
  Camera, 
  X, 
  User, 
  Edit 
} from "lucide-react";
import { Producto } from "../types";

interface QrScannerWorkspaceProps {
  cameraScanActive: boolean;
  startCameraScanner: () => void;
  stopCameraScanner: () => void;
  scannerFeedbackMsg: string;
  scannerManualInput: string;
  setScannerManualInput: (val: string) => void;
  handleManualSearchSubmit: (e: React.FormEvent) => void;
  scannedProduct: Producto | null;
  lowStockThreshold: number;
  isAdmin: boolean;
  openEditProductModal: (p: Producto) => void;
}

export default function QrScannerWorkspace({
  cameraScanActive,
  startCameraScanner,
  stopCameraScanner,
  scannerFeedbackMsg,
  scannerManualInput,
  setScannerManualInput,
  handleManualSearchSubmit,
  scannedProduct,
  lowStockThreshold,
  isAdmin,
  openEditProductModal
}: QrScannerWorkspaceProps) {

  return (
    <div className="max-w-xl mx-auto frosted-glass rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-white/15">
      <div className="p-6 border-b border-white/10 bg-white/3 text-center">
        <QrCode className="h-10 w-10 text-orange-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white">Escaneo de Códigos QR</h2>
        <p className="text-xs text-slate-400 mt-1">Escanee la etiqueta física del activo para desplegar toda su información y gestionar su resguardo de forma ágil.</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Camera Scanner View */}
        <div className="border border-white/10 bg-slate-900 rounded-2xl overflow-hidden relative min-h-[220px] flex items-center justify-center">
          {cameraScanActive ? (
            <div className="w-full relative">
              <div id="qr-reader-target" className="w-full"></div>
              <button
                onClick={stopCameraScanner}
                className="absolute top-3 right-3 px-3 py-1.5 bg-black/90 hover:bg-black text-white text-xs rounded-lg font-medium flex items-center gap-1.5 transition border border-white/10 z-10"
              >
                <X className="h-3.5 w-3.5 text-red-400" />
                <span>Detener Cámara</span>
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Camera className="h-12 w-12 mx-auto mb-3 text-orange-400 animate-pulse" />
              <p className="text-xs max-w-xs mx-auto mb-4 px-4 text-slate-400">Permita el acceso a la cámara de su dispositivo o utilice el ingreso manual simulación del lector QR de abajo.</p>
              <button
                onClick={startCameraScanner}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl shadow-lg border border-orange-500/50 inline-flex items-center gap-2 transition duration-200"
              >
                <Camera className="h-4 w-4" />
                <span>Iniciar Escáner de Cámara</span>
              </button>
            </div>
          )}
        </div>

        {/* Feedbacks */}
        {scannerFeedbackMsg && (
          <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl text-center text-xs font-mono font-medium text-orange-300">
            {scannerFeedbackMsg}
          </div>
        )}

        {/* INPUT MANUAL DE SIMULACIÓN */}
        <div className="bg-slate-950/50 p-5 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-3 text-center tracking-widest font-mono">
            Búsqueda Manual o Entrada de Lector USB
          </span>
          <form onSubmit={handleManualSearchSubmit} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Ej: EQ-101 (Presione enter o simule)"
              value={scannerManualInput}
              onChange={(e) => setScannerManualInput(e.target.value)}
              className="flex-1 rounded-xl px-3.5 py-2 text-xs font-mono font-bold frosted-input focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white border border-white/10 text-xs font-semibold rounded-xl transition duration-150 shadow-md"
            >
              Simular QR
            </button>
          </form>
        </div>

        {/* Scanned product display metadata card */}
        {scannedProduct && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/10">
              <span className="bg-emerald-800/80 border border-emerald-600 text-white px-2.5 py-0.5 rounded font-mono font-bold text-[10px] uppercase tracking-wide">
                Encontrado: {scannedProduct.codigo_local}
              </span>
              <span className="text-[11px] text-emerald-300 font-semibold">{scannedProduct.categoria}</span>
            </div>

            <h3 className="text-[15px] font-bold text-white mb-1">{scannedProduct.nombre}</h3>
            <p className="text-xs text-slate-300 mb-4">{scannedProduct.descripcion || "Sin descripción física."}</p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">Stock SOH</span>
                <span className={`font-mono font-bold text-sm block mt-0.5 ${scannedProduct.cantidad <= lowStockThreshold ? "text-red-400 animate-pulse" : "text-white"}`}>
                  {scannedProduct.cantidad} unidades
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">Ubicación</span>
                <span className="text-slate-200 block mt-0.5 font-medium truncate">
                  {scannedProduct.edificio || "-"} ({scannedProduct.ubicacion || "-"})
                </span>
              </div>
              <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">Estado del Resguardo</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5 mt-1.5">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-semibold">{scannedProduct.resguardo_nombre || "NINGUNA PERSONA REGISTRADA"}</span>
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    openEditProductModal(scannedProduct);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Edit className="h-3.5 w-3.5 text-orange-400" />
                  <span>Editar Activo</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
