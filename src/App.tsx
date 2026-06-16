import React, { useState, useEffect, useRef } from "react";
import { 
  Package, 
  Users, 
  QrCode, 
  FileDown, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Building, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  ShieldAlert, 
  Check, 
  X, 
  RefreshCw, 
  Camera, 
  Database,
  ArrowRight,
  Printer,
  SlidersHorizontal
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "qrcode";
import { Producto, PersonalResguardo, DbStatus } from "./types";
import { generateMonthlyPDFReport } from "./utils/pdfGenerator";
import ProductWorkspace from "./components/ProductWorkspace";
import CustodianWorkspace from "./components/CustodianWorkspace";
import QrScannerWorkspace from "./components/QrScannerWorkspace";

const CATEGORIAS = [
  "Cómputo",
  "Monitores",
  "Audiovisual",
  "Mobiliario",
  "Redes",
  "Herramientas",
  "Otros"
];

const EDIFICIOS = [
  "Edificio Principal",
  "Edificio Central",
  "Edificio B",
  "Bodega Alterna",
  "Planta Alta"
];

export default function App() {
  // Lists and stats states
  const [productos, setProductos] = useState<Producto[]>([]);
  const [personal, setPersonal] = useState<PersonalResguardo[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus>({ connected: false, isFallback: true });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // App navigation state
  const [activeTab, setActiveTab] = useState<"productos" | "personal" | "escanear">("productos");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [stockFilter, setStockFilter] = useState<"TODOS" | "STOCK_BAJO" | "STOCK_OK">("TODOS");
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  // Admin and Auth state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals managers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);

  const [isCustodianModalOpen, setIsCustodianModalOpen] = useState(false);
  const [editingCustodian, setEditingCustodian] = useState<PersonalResguardo | null>(null);

  const [viewingQrProduct, setViewingQrProduct] = useState<Producto | null>(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>("");

  // Product form states
  const [prodNombre, setProdNombre] = useState("");
  const [prodDescripcion, setProdDescripcion] = useState("");
  const [prodCantidad, setProdCantidad] = useState(1);
  const [prodPrecioUnitario, setProdPrecioUnitario] = useState(0);
  const [prodCodigoLocal, setProdCodigoLocal] = useState("");
  const [prodCategoria, setProdCategoria] = useState(CATEGORIAS[0]);
  const [prodResguardoId, setProdResguardoId] = useState<string>("");
  const [prodEdificio, setProdEdificio] = useState(EDIFICIOS[0]);
  const [prodUbicacion, setProdUbicacion] = useState("");
  const [formError, setFormError] = useState("");

  // Custodian form states
  const [custNombre, setCustNombre] = useState("");
  const [custCorreo, setCustCorreo] = useState("");
  const [custTelefono, setCustTelefono] = useState("");
  const [custFormError, setCustFormError] = useState("");

  // QR Scanning States
  const [cameraScanActive, setCameraScanActive] = useState(false);
  const [scannedResultCode, setScannedResultCode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);
  const [scannerManualInput, setScannerManualInput] = useState("");
  const [scannerFeedbackMsg, setScannerFeedbackMsg] = useState("");

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Load backend contents
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // 1. Fetch DB Status
      const statusRes = await fetch("/api/status");
      if (statusRes.ok) {
        const rawStatus = await statusRes.json();
        setDbStatus(rawStatus);
      }

      // 2. Fetch Personnel
      const personnelRes = await fetch("/api/personal");
      if (personnelRes.ok) {
        const pList = await personnelRes.json();
        setPersonal(pList);
      }

      // 3. Fetch Products
      const productsRes = await fetch("/api/productos");
      if (productsRes.ok) {
        const prList = await productsRes.json();
        setProductos(prList);
      }
    } catch (e: any) {
      console.error("Error loading data from Express server:", e.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Admin Authorization
  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    
    if (passwordInput === "admin2026+") {
      setIsAdmin(true);
      setPasswordInput("");
      setAuthError("");
      setIsAuthModalOpen(false);
    } else {
      setAuthError("Clave incorrecta. Intente de nuevo.");
    }
  }

  function handleLogout() {
    setIsAdmin(false);
  }

  // Setup Product for Edit
  function openAddProductModal() {
    setEditingProduct(null);
    setProdNombre("");
    setProdDescripcion("");
    setProdCantidad(5);
    setProdPrecioUnitario(150);
    setProdCodigoLocal(generateSuggestedCode());
    setProdCategoria(CATEGORIAS[0]);
    setProdResguardoId("");
    setProdEdificio(EDIFICIOS[0]);
    setProdUbicacion("Oficina Central");
    setFormError("");
    setIsProductModalOpen(true);
  }

  function openEditProductModal(prod: Producto) {
    setEditingProduct(prod);
    setProdNombre(prod.nombre);
    setProdDescripcion(prod.descripcion);
    setProdCantidad(prod.cantidad);
    setProdPrecioUnitario(prod.precio_unitario);
    setProdCodigoLocal(prod.codigo_local);
    setProdCategoria(prod.categoria);
    setProdResguardoId(prod.resguardo_id ? prod.resguardo_id.toString() : "");
    setProdEdificio(prod.edificio || EDIFICIOS[0]);
    setProdUbicacion(prod.ubicacion || "");
    setFormError("");
    setIsProductModalOpen(true);
  }

  function generateSuggestedCode() {
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `EQ-${randomNum}`;
  }

  // Handle Save Product
  async function handleProductSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!prodNombre.trim()) {
      setFormError("El nombre del producto es obligatorio.");
      return;
    }
    if (!prodCodigoLocal.trim()) {
      setFormError("El código local es obligatorio.");
      return;
    }
    if (prodCantidad < 0) {
      setFormError("La cantidad no puede ser negativa.");
      return;
    }
    if (prodPrecioUnitario < 0) {
      setFormError("El precio unitario no puede ser negativo.");
      return;
    }

    const payload = {
      nombre: prodNombre.trim(),
      descripcion: prodDescripcion.trim(),
      cantidad: prodCantidad,
      precio_unitario: prodPrecioUnitario,
      codigo_local: prodCodigoLocal.trim(),
      categoria: prodCategoria,
      resguardo_id: prodResguardoId ? parseInt(prodResguardoId, 10) : null,
      edificio: prodEdificio,
      ubicacion: prodUbicacion.trim()
    };

    try {
      let response;
      if (editingProduct) {
        // Update product
        response = await fetch(`/api/productos/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Add new product
        response = await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setIsProductModalOpen(false);
        fetchData();
      } else {
        const errData = await response.json();
        setFormError(errData.error || "Ocurrió un error en el servidor.");
      }
    } catch (e: any) {
      setFormError("No se pudo conectar con el servidor backend.");
    }
  }

  // Delete product action
  async function handleDeleteProduct(id: number, name: string) {
    if (!confirm(`¿Está seguro de eliminar el producto "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchData();
        if (scannedProduct && scannedProduct.id === id) {
          setScannedProduct(null);
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (e) {
      alert("No se pudo procesar la eliminación en el servidor.");
    }
  }

  // Custodian Helpers
  function openAddCustodianModal() {
    setEditingCustodian(null);
    setCustNombre("");
    setCustCorreo("");
    setCustTelefono("");
    setCustFormError("");
    setIsCustodianModalOpen(true);
  }

  function openEditCustodianModal(cust: PersonalResguardo) {
    setEditingCustodian(cust);
    setCustNombre(cust.nombre_completo);
    setCustCorreo(cust.correo || "");
    setCustTelefono(cust.telefono || "");
    setCustFormError("");
    setIsCustodianModalOpen(true);
  }

  // Save Custodian Personnel
  async function handleCustodianSave(e: React.FormEvent) {
    e.preventDefault();
    setCustFormError("");

    if (!custNombre.trim()) {
      setCustFormError("El nombre completo es obligatorio.");
      return;
    }

    const payload = {
      nombre_completo: custNombre.trim(),
      correo: custCorreo.trim(),
      telefono: custTelefono.trim()
    };

    try {
      let response;
      if (editingCustodian) {
        response = await fetch(`/api/personal/${editingCustodian.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch("/api/personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setIsCustodianModalOpen(false);
        fetchData();
      } else {
        const errorData = await response.json();
        setCustFormError(errorData.error || "Error al procesar operación de resguardo.");
      }
    } catch (e) {
      setCustFormError("Error de red con el servidor Express.");
    }
  }

  // Delete Custodian
  async function handleDeleteCustodian(id: number, name: string) {
    const assignedCount = productos.filter(p => p.resguardo_id === id).length;
    let warningMsg = `¿Está seguro de dar de baja al personal de resguardo: "${name}"?`;
    if (assignedCount > 0) {
      warningMsg += `\n\nATENCIÓN: Tiene ${assignedCount} activo(s) asignado(s) bajo su resguardo. Al eliminarlo, dichos activos quedarán "SIN RESGUARDO".`;
    }

    if (!confirm(warningMsg)) {
      return;
    }

    try {
      const response = await fetch(`/api/personal/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchData();
      } else {
        const err = await response.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      alert("Error de red al intentar eliminar custodio.");
    }
  }

  // QR display logic
  async function handleShowProductQr(p: Producto) {
    setViewingQrProduct(p);
    try {
      // Build a localized deep-link data format (Can be decoded easily by scanner)
      const dataString = p.codigo_local;
      const dataUrl = await QRCode.toDataURL(dataString, {
        width: 320,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#ffffff"
        }
      });
      setGeneratedQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Error generating QR standard image:", err);
    }
  }

  // Printable layout window trigger
  function handlePrintQrLabel() {
    if (!viewingQrProduct || !generatedQrDataUrl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Presiona habilitar pop-ups para imprimir etiquetas de códigos QR.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta QR - ${viewingQrProduct.codigo_local}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: center; margin: 30px; }
            .badge-container { border: 2px dashed #000; padding: 15px; width: 330px; margin: 0 auto; border-radius: 8px; }
            h2 { margin: 5px 0; font-size: 20px; color: #1e293b; }
            p { margin: 3px 0; font-size: 13px; color: #475569; }
            .qr-tag { font-size: 24px; font-weight: bold; background-color: #f1f5f9; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; letter-spacing: 1px; }
            .footer { font-size: 9px; color: #94a3b8; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="badge-container">
            <p style="font-weight: bold; color: #f97316; text-transform: uppercase; font-size: 10px; spacing: 1px">Etiq. Control de Almacén</p>
            <h2>${viewingQrProduct.nombre}</h2>
            <p><strong>Categoría:</strong> ${viewingQrProduct.categoria}</p>
            <p><strong>Ubicación:</strong> ${viewingQrProduct.edificio} - ${viewingQrProduct.ubicacion || "Área General"}</p>
            <p><strong>Responsable:</strong> ${viewingQrProduct.resguardo_nombre || "SIN ASIGNAR"}</p>
            <img src="${generatedQrDataUrl}" style="width: 180px; height: 180px; margin: 10px 0;" />
            <div>
              <span class="qr-tag">${viewingQrProduct.codigo_local}</span>
            </div>
            <div class="footer">
              Sistema de Inventario y Custodios - Generación Certificada
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // QR Real Camera Code Scanning Loop
  function startCameraScanner() {
    setCameraScanActive(true);
    setScannerFeedbackMsg("");
    setScannedProduct(null);

    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader-target",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
          },
          false
        );

        scanner.render(
          (decodedText) => {
            // Success handler
            if (decodedText) {
              handleScannedCode(decodedText);
              scanner.clear();
              setCameraScanActive(false);
            }
          },
          (errorMessage) => {
            // Quiet, just continuous scanning messages
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        console.error("Camera init error:", err);
        setScannerFeedbackMsg("No se pudo acceder a la cámara o falta permiso en este navegador. Utiliza la simulación manual de abajo.");
        setCameraScanActive(false);
      }
    }, 150);
  }

  function stopCameraScanner() {
    if (scannerRef.current) {
      scannerRef.current.clear().catch((err) => console.log("cleanup err", err));
      scannerRef.current = null;
    }
    setCameraScanActive(false);
  }

  // Handle scanned or searched code
  function handleScannedCode(code: string) {
    const rawCode = code.trim().toUpperCase();
    setScannedResultCode(rawCode);
    
    // Find product matching local code
    const found = productos.find(p => p.codigo_local.toUpperCase() === rawCode);
    if (found) {
      setScannedProduct(found);
      setScannerFeedbackMsg(`¡Código [${rawCode}] detectado exitosamente!`);
    } else {
      setScannedProduct(null);
      setScannerFeedbackMsg(`Código [${rawCode}] escaneado o ingresado pero no se encuentra registrado en el almacén.`);
    }
  }

  function handleManualSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scannerManualInput.trim()) return;
    handleScannedCode(scannerManualInput);
    setScannerManualInput("");
  }

  // Statistics
  const totalActivosCount = productos.length;
  const totalStockSoh = productos.reduce((acc, p) => acc + p.cantidad, 0);
  const totalValuation = productos.reduce((acc, p) => acc + (p.cantidad * p.precio_unitario), 0);
  const lowStockItems = productos.filter(p => p.cantidad <= lowStockThreshold);
  const activeAlertsCount = lowStockItems.length;

  // Filter lists
  const filteredProducts = productos.filter((p) => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.codigo_local.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.resguardo_nombre || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "TODAS" || p.categoria === selectedCategory;
    
    let matchesStock = true;
    if (stockFilter === "STOCK_BAJO") {
      matchesStock = p.cantidad <= lowStockThreshold;
    } else if (stockFilter === "STOCK_OK") {
      matchesStock = p.cantidad > lowStockThreshold;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden">
      {/* Dynamic ambient backlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[25%] w-[400px] h-[400px] bg-slate-800/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* 1. Header */}
      <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2.5 rounded-xl text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Inventario &amp; Resguardos</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">Control de Almacén, Ubicación Física y Personal Responsable</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Monthly Report PDF Button */}
            <button
              onClick={() => generateMonthlyPDFReport(productos, personal, lowStockThreshold)}
              disabled={productos.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-white/10 hover:border-white/20 font-semibold text-xs rounded-xl transition-all shadow-md"
              title="Descargar Reporte Mensual Completo en Formato PDF"
              id="btn-reporte-pdf"
            >
              <FileDown className="h-4.5 w-4.5 text-orange-400" />
              <span>Reporte Mensual (PDF)</span>
            </button>

            {/* Admin State Toggle */}
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/25 px-3 py-2 rounded-xl text-xs shadow-sm">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold font-mono">Admin Activo</span>
                <button 
                  onClick={handleLogout}
                  className="ml-1 px-1.5 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 rounded font-mono text-[10px] text-white tracking-wider font-semibold transition"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg border border-orange-500/40"
                id="btn-login-admin"
              >
                <User className="h-4 w-4" />
                <span>Ingresar Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Database Connection Info Bar */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-white/10 py-2.5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-slate-350">
            <Database className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">Estado de Almacenamiento:</span>
            {!dbStatus.isFallback ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-emerald-950/30 text-emerald-300 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Nube Neon Integrada (PostgreSQL)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-amber-950/30 text-amber-300 border border-amber-500/20" title={dbStatus.error}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Modo de Prueba (Archivo JSON Local)
              </span>
            )}
          </div>
          
          {dbStatus.isFallback && (
            <p className="text-slate-400 text-center md:text-right font-mono text-[10px]">
              Para conectar tu base de datos Neon real, ingresa <strong className="text-orange-400">DATABASE_URL</strong> en los Secrets de la app en AI Studio.
            </p>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        
        {/* 2. Top Metric Cards (Bento style grid) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="frosted-glass frosted-glass-hover bg-slate-900/40 border border-white/10 p-5 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-xl">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 font-mono">Activos Registrados</p>
              <h3 className="text-2xl font-bold text-white font-mono">{totalActivosCount}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">{totalStockSoh} unidades físicas</p>
            </div>
            <div className="h-11 w-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-orange-400">
              <Package className="h-5 w-5" />
            </div>
          </div>

          <div className="frosted-glass frosted-glass-hover bg-slate-900/40 border border-white/10 p-5 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-xl">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 font-mono">Valor de Almacén</p>
              <h3 className="text-2xl font-bold text-white font-mono">
                ${totalValuation.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Precio × stock actual</p>
            </div>
            <div className="h-11 w-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-emerald-400">
              <span className="text-base font-extrabold font-mono">$</span>
            </div>
          </div>

          <div className="frosted-glass frosted-glass-hover bg-slate-900/40 border border-white/10 p-5 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-xl">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 font-mono">Personal Custodio</p>
              <h3 className="text-2xl font-bold text-white font-mono">{personal.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Responsables registrados</p>
            </div>
            <div className="h-11 w-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-orange-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Low Stock Indicators Dashboard Card */}
          <div className={`frosted-glass frosted-glass-hover p-5 rounded-2xl border transition duration-150 flex items-center justify-between ${
            activeAlertsCount > 0 
              ? "bg-red-950/20 border-red-500/30 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
              : "bg-slate-900/40 border-white/10 text-white"
          }`}>
            <div>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-1 font-mono">Stock Crítico</p>
              <h3 className={`text-2xl font-bold font-mono ${activeAlertsCount > 0 ? "text-red-400" : "text-white"}`}>
                {activeAlertsCount}
              </h3>
              <button 
                onClick={() => {
                  setStockFilter("STOCK_BAJO");
                  setActiveTab("productos");
                }}
                className="text-[10px] underline hover:text-orange-400 text-slate-400 mt-1 block text-left"
              >
                Filtrar stock bajo (umbral: {lowStockThreshold})
              </button>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${
              activeAlertsCount > 0 ? "bg-red-950/40 border-red-500/25 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-slate-400"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* 3. Real-time Low Stock Banner Alerts */}
        {activeAlertsCount > 0 && (
          <div className="mb-6 bg-red-950/30 border border-red-500/30 p-5 rounded-2xl text-sm relative z-10 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="w-full">
                <span className="font-bold text-red-400 text-xs uppercase tracking-wider block mb-1">¡Alerta de inventario crítico detectada!</span>
                <p className="text-slate-300 text-xs mb-3">
                  Los siguientes artículos han caído por debajo de la reserva mínima de seguridad (<strong>{lowStockThreshold}</strong> unidades). Sugerimos reabastecimiento:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockItems.map(p => (
                    <div key={p.id} className="bg-white/3 border border-red-500/15 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold block text-slate-200">{p.nombre}</span>
                        <span className="text-[10px] text-slate-455 font-mono text-orange-400/80">{p.codigo_local} ({p.categoria})</span>
                      </div>
                      <span className="bg-red-950/50 border border-red-500/30 text-red-400 font-extrabold px-2.5 py-0.5 rounded-lg font-mono">SOH: {p.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Tab Navigation Header */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-2 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 relative z-10">
          <nav className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab("productos");
                stopCameraScanner();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "productos"
                  ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.35)]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Inventario de Productos</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("personal");
                stopCameraScanner();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "personal"
                  ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.35)]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Personal de Resguardo</span>
            </button>
            <button
              onClick={() => setActiveTab("escanear")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "escanear"
                  ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.35)]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <QrCode className="h-4 w-4" />
              <span>Escanear Código QR</span>
            </button>
          </nav>

          {/* Action trigger based on active tab */}
          <div className="flex items-center gap-2">
            {activeTab === "productos" && (
              <>
                <div className="flex items-center gap-2.5 bg-slate-950/60 rounded-xl px-3 py-1.5 border border-white/10 text-xs">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Umbral Stock:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value, 10)) || 5)}
                    className="w-10 bg-slate-900 text-white border border-white/15 focus:outline-none focus:border-orange-500/50 rounded font-mono font-bold text-center text-xs py-0.5"
                  />
                </div>
                
                <button
                  onClick={openAddProductModal}
                  disabled={!isAdmin}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition-all shadow-lg border border-orange-500/40"
                  title={isAdmin ? "Crear un nuevo producto" : "Se requiere modo administrador para añadir productos"}
                >
                  <Plus className="h-4 w-4" />
                  <span>Alta de Producto</span>
                </button>
              </>
            )}

            {activeTab === "personal" && (
              <button
                onClick={openAddCustodianModal}
                disabled={!isAdmin}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition-all shadow-lg border border-orange-500/40"
                title={isAdmin ? "Registrar nuevo custodio" : "Se requiere modo administrador para dar de alta personal"}
              >
                <Plus className="h-4 w-4" />
                <span>Alta de Custodio</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. TAB 1: PRODUCT WORKSPACE */}
        {activeTab === "productos" && (
          <ProductWorkspace
            productos={productos}
            personal={personal}
            isLoading={isLoading}
            isAdmin={isAdmin}
            lowStockThreshold={lowStockThreshold}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            CATEGORIAS={CATEGORIAS}
            handleShowProductQr={handleShowProductQr}
            openEditProductModal={openEditProductModal}
            handleDeleteProduct={handleDeleteProduct}
          />
        )}

        {/* 6. TAB 2: CUSTODIAN PERSONNEL WORKSPACE */}
        {activeTab === "personal" && (
          <CustodianWorkspace
            personal={personal}
            productos={productos}
            isLoading={isLoading}
            isAdmin={isAdmin}
            openAddCustodianModal={openAddCustodianModal}
            openEditCustodianModal={openEditCustodianModal}
            handleDeleteCustodian={handleDeleteCustodian}
          />
        )}

        {/* 7. TAB 3: QR CAMERA SCANNER */}
        {activeTab === "escanear" && (
          <QrScannerWorkspace
            cameraScanActive={cameraScanActive}
            startCameraScanner={startCameraScanner}
            stopCameraScanner={stopCameraScanner}
            scannerFeedbackMsg={scannerFeedbackMsg}
            scannerManualInput={scannerManualInput}
            setScannerManualInput={setScannerManualInput}
            handleManualSearchSubmit={handleManualSearchSubmit}
            scannedProduct={scannedProduct}
            lowStockThreshold={lowStockThreshold}
            isAdmin={isAdmin}
            openEditProductModal={openEditProductModal}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <p>
            Desarrollado para la gestión de inventario y personal de resguardo. Conectado de forma segura a Neon.
          </p>
          <p className="text-slate-500 font-mono text-[10px]">
            Inventario de Activos y Resguardos &copy; 2026-PRESENT
          </p>
        </div>
      </footer>

      {/* ======================================= */}
      {/* ============ MODAL PORTALS ============ */}
      {/* ======================================= */}

      {/* MODAL AUTH ADMIN LOGIN */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5 text-orange-500" />
                <span>Ingreso Administrador</span>
              </h3>
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Escribe la contraseña de administrador:</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Contraseña..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Clave asignada: <code>admin2026+</code></span>
              </div>

              {authError && (
                <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg font-medium text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs rounded-lg transition"
              >
                Acceder al Sistema
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRODUCT ADD/EDIT FORM */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 max-w-lg w-full p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <SlidersHorizontal className="h-4 w-4 text-orange-400" />
                <span>{editingProduct ? "Editar Producto" : "Dar de Alta Producto"}</span>
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleProductSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Local Code */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Código Local *</label>
                  <input
                    type="text"
                    required
                    placeholder="EQ-101"
                    value={prodCodigoLocal}
                    onChange={(e) => setProdCodigoLocal(e.target.value)}
                    className="w-full frosted-input rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Categoría *</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option className="bg-slate-950" key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Nombre del Activo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laptop HP Chromebook 14"
                    value={prodNombre}
                    onChange={(e) => setProdNombre(e.target.value)}
                    className="w-full frosted-input rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Descripción Física</label>
                  <textarea
                    rows={2}
                    placeholder="Especificaciones técnicas, marca, modelo, estado general..."
                    value={prodDescripcion}
                    onChange={(e) => setProdDescripcion(e.target.value)}
                    className="w-full frosted-input rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                {/* SOH Quantity */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Cantidad (Stock) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodCantidad}
                    onChange={(e) => setProdCantidad(parseInt(e.target.value, 10) || 0)}
                    className="w-full frosted-input rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Precio Unitario ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="120.00"
                    value={prodPrecioUnitario}
                    onChange={(e) => setProdPrecioUnitario(parseFloat(e.target.value) || 0)}
                    className="w-full frosted-input rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                {/* Building */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Edificio *</label>
                  <select
                    value={prodEdificio}
                    onChange={(e) => setProdEdificio(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                  >
                    {EDIFICIOS.map((ed) => (
                      <option className="bg-slate-950" key={ed} value={ed}>{ed}</option>
                    ))}
                  </select>
                </div>

                {/* Location context */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Ubicación física</label>
                  <input
                    type="text"
                    placeholder="Ej. Oficina 301, Planta Alta"
                    value={prodUbicacion}
                    onChange={(e) => setProdUbicacion(e.target.value)}
                    className="w-full frosted-input rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                {/* Custodian Selection */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Responsable asignado en resguardo</label>
                  <select
                    value={prodResguardoId}
                    onChange={(e) => setProdResguardoId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option className="bg-slate-955" value="">-- Dejar sin asignar resguardo (Almacén Central) --</option>
                    {personal.map((p) => (
                      <option className="bg-slate-955" key={p.id} value={p.id.toString()}>
                        {p.nombre_completo} ({p.correo || "Sin correo"})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-450 mt-1 block">
                    * Si la persona no figura en la lista, primero agréguela en la pestaña "Personal de Resguardo".
                  </span>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl text-center font-medium">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-white/10 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-slate-350 text-xs font-semibold rounded-xl hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition shadow-lg border border-orange-550/30"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CUSTODIAN ADD/EDIT FORM */}
      {isCustodianModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 max-w-sm w-full p-6 rounded-2xl shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {editingCustodian ? "Modificar Custodio" : "Alta de Custodio"}
              </h3>
              <button 
                onClick={() => setIsCustodianModalOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCustodianSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan de Dios Pérez"
                  value={custNombre}
                  onChange={(e) => setCustNombre(e.target.value)}
                  className="w-full frosted-input rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={custCorreo}
                  onChange={(e) => setCustCorreo(e.target.value)}
                  className="w-full frosted-input rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider font-mono">Teléfono Móvil / Fijo</label>
                <input
                  type="tel"
                  placeholder="555-123456"
                  value={custTelefono}
                  onChange={(e) => setCustTelefono(e.target.value)}
                  className="w-full frosted-input rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>

              {custFormError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl text-center font-medium">
                  {custFormError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-white/10 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCustodianModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-slate-350 text-xs font-semibold rounded-xl hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition shadow-lg border border-orange-550/30"
                >
                  Guardar Custodio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW QR AND PRINT BADGE */}
      {viewingQrProduct && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 max-w-sm w-full p-6 rounded-2xl shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono">
                <QrCode className="h-4.5 w-4.5 text-orange-400" />
                <span>Etiqueta QR Registrada</span>
              </h3>
              <button 
                onClick={() => setViewingQrProduct(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Simulated Printed Tag */}
            <div className="border border-white/10 p-5 rounded-2xl text-center space-y-4 bg-slate-950/50 font-mono relative">
              <span className="text-[9px] tracking-widest uppercase bg-orange-500/10 text-orange-400 border border-orange-500/15 px-3 py-1 rounded-full font-bold">
                Etiq. Inventariado Físico
              </span>
              
              <div className="pt-2">
                <h4 className="font-bold text-white text-sm tracking-tight leading-tight">{viewingQrProduct.nombre}</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">{viewingQrProduct.categoria}</p>
                <p className="text-[9px] text-slate-550 font-mono mt-0.5">{viewingQrProduct.edificio} &bull; {viewingQrProduct.ubicacion || "Área General"}</p>
              </div>

              {/* QR Image source */}
              {generatedQrDataUrl ? (
                <div className="bg-white p-3 inline-block rounded-xl mx-auto shadow-inner border border-white/5">
                  <img 
                    src={generatedQrDataUrl} 
                    alt={`QR Code standard for ${viewingQrProduct.codigo_local}`}
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center mx-auto text-xs text-slate-500 font-mono">
                  Generando QR...
                </div>
              )}

              {/* Serial code printed layout */}
              <div>
                <span className="px-3.5 py-1.5 bg-orange-600/10 text-orange-400 border border-orange-500/20 font-mono font-bold text-xs rounded-xl tracking-widest leading-none select-all-clickable">
                  {viewingQrProduct.codigo_local}
                </span>
              </div>

              {/* Custodio */}
              <div className="border-t border-white/5 pt-3.5 font-sans text-[10px] text-slate-400">
                Resguardo legal bajo responsabilidad de:<br />
                <strong className="text-emerald-300 font-semibold block mt-1">{viewingQrProduct.resguardo_nombre || "NINGUNA PERSONA ASIGNADA"}</strong>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setViewingQrProduct(null)}
                className="flex-1 py-2 border border-white/10 text-slate-350 text-xs font-semibold rounded-xl hover:bg-white/5 transition"
              >
                Cerrar Ventana
              </button>
              <button
                onClick={handlePrintQrLabel}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg border border-orange-550/30"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
