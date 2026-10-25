import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, Shield, Laptop, Smartphone, Globe, AlertCircle, RefreshCw, X } from 'lucide-react';
import { ASSETS } from '../assets';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoUpdated?: () => void;
}

export const LogoUploadModal: React.FC<LogoUploadModalProps> = ({
  isOpen,
  onClose,
  onLogoUpdated,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>(ASSETS.appLogo);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (PNG recomendado).');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Read file as Base64 data URL
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      // Send to server API to generate all 4 formats strictly from this original buffer
      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el archivo.');
      }

      // Update preview immediately
      const newTime = Date.now();
      setCacheBuster(newTime);
      setPreviewUrl(imageBase64);
      setSuccessMsg('¡Logo original aplicado exitosamente! Todos los recursos (Web, Favicon, Laptop e iPhone) se han generado respetando exactamente el archivo original sin alteraciones.');

      if (onLogoUpdated) {
        onLogoUpdated();
      }
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar el logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#0B1728] border border-slate-700 shadow-2xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-condensed text-xl font-extrabold uppercase tracking-wide">
                Gestión del Logo Original
              </h3>
              <p className="text-xs text-slate-400">
                Archivo fuente único sin alteraciones ni reinterpretraciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative constraints card */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-blue-900/40 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Reglas estrictas de preservación del diseño:</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-6">
            El archivo se utiliza como fuente única de verdad. No se redibuja, no se regenera con IA, no se estiliza y no se añade ningún fondo. Solo se generan los lienzos requeridos con padding transparente centrado.
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 border-2 border-dashed border-slate-700 hover:border-blue-500/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleProcessFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            {isUploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              {isUploading ? 'Procesando formatos...' : 'Selecciona o arrastra el archivo logo limpio.png'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PNG transparente original (respetando colores, silueta y proporciones exactas)
            </p>
          </div>

          <button
            type="button"
            disabled={isUploading}
            className="mt-1 px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
          >
            Examinar archivos...
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 4 Formats Live Preview */}
        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Recursos Generados para el Sistema
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Web Logo */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-950 rounded-lg p-1.5 mb-2 border border-slate-800">
                <img src={`${previewUrl}?t=${cacheBuster}`} alt="Web Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>Logo Web</span>
              </span>
              <span className="text-[10px] text-slate-400">Sistema / Navbar</span>
            </div>

            {/* 2. Favicon */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-950 rounded-lg p-1.5 mb-2 border border-slate-800">
                <img src={`/favicon-32x32.png?t=${cacheBuster}`} alt="Favicon" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Globe className="w-3 h-3 text-amber-400" />
                <span>Favicon</span>
              </span>
              <span className="text-[10px] text-slate-400">Pestaña (16/32px)</span>
            </div>

            {/* 3. Laptop Web App Icon */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-950 rounded-lg p-1.5 mb-2 border border-slate-800">
                <img src={`/icon-192.png?t=${cacheBuster}`} alt="Laptop Icon" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Laptop className="w-3 h-3 text-emerald-400" />
                <span>Laptop</span>
              </span>
              <span className="text-[10px] text-slate-400">Web App (192/512)</span>
            </div>

            {/* 4. iPhone Icon */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-950 rounded-lg p-1.5 mb-2 border border-slate-800">
                <img src={`/apple-touch-icon.png?t=${cacheBuster}`} alt="Apple Touch Icon" className="w-8 h-8 object-contain rounded-md" />
              </div>
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-purple-400" />
                <span>iPhone</span>
              </span>
              <span className="text-[10px] text-slate-400">Apple Touch (180px)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
