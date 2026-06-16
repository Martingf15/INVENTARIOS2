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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2.5 rounded-xl text-white">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Inventario &amp; Resguardos de Activos</h1>
              <p className="text-xs text-slate-400">Control de Almacén, Ubicación Física y Personal Responsable</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Monthly Report PDF Button */}
            <button
              onClick={() => generateMonthlyPDFReport(productos, personal, lowStockThreshold)}
              disabled={productos.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition"
              title="Descargar Reporte Mensual Completo en Formato PDF"
              id="btn-reporte-pdf"
            >
              <FileDown className="h-4.5 w-4.5 text-orange-400" />
              <span>Reporte Mensual (PDF)</span>
            </button>

            {/* Admin State Toggle */}
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 px-3 py-2 rounded-lg text-xs">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Admin Activo</span>
                <button 
                  onClick={handleLogout}
                  className="ml-1 px-1.5 py-0.5 bg-emerald-900 hover:bg-emerald-850 rounded text-[10px] text-white tracking-wide"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs rounded-lg transition"
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
      <div className="bg-slate-200 border-b border-slate-300 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-slate-700">Estado de Almacenamiento:</span>
            {!dbStatus.isFallback ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Nube Neon Integrada (PostgreSQL)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200" title={dbStatus.error}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Modo de Prueba (Archivo JSON Local)
              </span>
            )}
          </div>
          
          {dbStatus.isFallback && (
            <p className="text-slate-500 text-center md:text-right">
              Para guardar en tu base Neon en la nube, ingresa <strong>DATABASE_URL</strong> en la pestaña de <strong>Secrets</strong> de AI Studio.
            </p>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        {/* 2. Top Metric Cards (Bento style grid) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Activos Registrados</p>
              <h3 className="text-2xl font-bold text-slate-800 font-mono">{totalActivosCount}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{totalStockSoh} unidades físicas de stock</p>
            </div>
            <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
              <Package className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Valor de Almacén</p>
              <h3 className="text-2xl font-bold text-slate-800 font-mono">
                ${totalValuation.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Suma del precio unitario × stock</p>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <span className="text-lg font-bold font-mono">$</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Personal de Resguardo</p>
              <h3 className="text-2xl font-bold text-slate-800 font-mono">{personal.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Responsables custodios registrados</p>
            </div>
            <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Low Stock Indicators Dashboard Card */}
          <div className={`p-5 rounded-xl shadow-xs border transition duration-150 flex items-center justify-between ${
            activeAlertsCount > 0 
              ? "bg-red-50/85 border-red-200 text-red-900" 
              : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Stock Bajo (Crítico)</p>
              <h3 className={`text-2xl font-bold font-mono ${activeAlertsCount > 0 ? "text-red-600" : "text-slate-800"}`}>
                {activeAlertsCount}
              </h3>
              <button 
                onClick={() => {
                  setStockFilter("STOCK_BAJO");
                  setActiveTab("productos");
                }}
                className="text-[10px] underline hover:text-orange-600 text-slate-400 mt-1 block text-left"
              >
                Filtrar stock bajo (umbral: {lowStockThreshold})
              </button>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              activeAlertsCount > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-500"
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </section>

        {/* 3. Real-time Low Stock Banner Alerts */}
        {activeAlertsCount > 0 && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4 text-sm rounded-r-xl shadow-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="w-full">
                <span className="font-semibold text-red-800 text-xs uppercase tracking-wider block mb-1">¡NOTIFICACIÓN STOCK BAJO DETECTADO!</span>
                <p className="text-red-700 text-xs mb-2">
                  Los siguientes artículos han caído por debajo del umbral de seguridad de <strong>{lowStockThreshold}</strong> unidades. Favor de gestionar compras o reabastecimiento:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lowStockItems.map(p => (
                    <div key={p.id} className="bg-white/80 border border-red-200 p-2 rounded flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold block text-slate-800">{p.nombre}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{p.codigo_local} ({p.categoria})</span>
                      </div>
                      <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded font-mono">SOH: {p.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Tab Navigation Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl gap-3 shadow-xs mb-6">
          <nav className="flex gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab("productos");
                stopCameraScanner();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "productos"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
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
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "personal"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Personal de Resguardo</span>
            </button>
            <button
              onClick={() => setActiveTab("escanear")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "escanear"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
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
                <div className="flex items-center gap-2.5 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">Mínimo Stock:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value, 10)) || 5)}
                    className="w-10 bg-white border border-slate-300 rounded font-mono font-bold text-center text-xs"
                  />
                </div>
                
                <button
                  onClick={openAddProductModal}
                  disabled={!isAdmin}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-850 text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs rounded-lg transition-all"
                  title={isAdmin ? "Crear un nuevo producto" : "Se requiere modo administrador para añadir productos"}
                >
                  <Plus className="h-4 w-4" />
                  <span>Dar de Alta Producto</span>
                </button>
              </>
            )}

            {activeTab === "personal" && (
              <button
                onClick={openAddCustodianModal}
                disabled={!isAdmin}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-850 text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs rounded-lg transition-all"
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
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Table Filters Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/75 flex flex-col lg:flex-row gap-4 justify-between items-stretch">
              <div className="flex items-center gap-2 max-w-md w-full relative">
                <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre, categoría, resguardo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 placeholder:text-slate-400 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">Filtrar por:</span>
                </div>

                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-300 text-xs rounded-lg py-1.5 px-2.5 focus:outline-hidden"
                >
                  <option value="TODAS">Categoría: Todas</option>
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Stock Level filter */}
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 text-xs rounded-lg py-1.5 px-2.5 focus:outline-hidden"
                >
                  <option value="TODOS">Stock: Todos</option>
                  <option value="STOCK_BAJO">Stock: Bajo Alerta</option>
                  <option value="STOCK_OK">Stock: Suficiente</option>
                </select>

                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("TODAS");
                    setStockFilter("TODOS");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 transition"
                >
                  Restablecer
                </button>
              </div>
            </div>

            {/* Products Table */}
            {isLoading ? (
              <div className="p-16 text-center">
                <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Cargando catálogo de inventario...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-16 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">No se encontraron productos</h3>
                <p className="text-xs text-slate-400 mt-1">Intente cambiar los filtros o el texto de la búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] tracking-wider uppercase bg-slate-50">
                      <th className="py-3 px-4 font-semibold text-slate-500">Código</th>
                      <th className="py-3 px-4 font-semibold text-slate-500">Producto / Descripción</th>
                      <th className="py-3 px-4 font-semibold text-slate-500">Categoría</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 text-right">Cantidad</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 text-right">P. Unitario</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 text-right">Val. Almacén</th>
                      <th className="py-3 px-4 font-semibold text-slate-500">Ubicación Física</th>
                      <th className="py-3 px-4 font-semibold text-slate-500">Persona en Resguardo</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 text-center">Etiquetas QR / Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredProducts.map((p) => {
                      const isLowStock = p.cantidad <= lowStockThreshold;
                      const valorTotal = p.cantidad * p.precio_unitario;

                      return (
                        <tr 
                          key={p.id} 
                          className={`hover:bg-slate-50 transition duration-100 ${
                            isLowStock ? "bg-red-50/30" : ""
                          }`}
                        >
                          {/* Código Local */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                              {p.codigo_local}
                            </span>
                          </td>

                          {/* Nombre / Desc */}
                          <td className="py-3.5 px-4 max-w-sm">
                            <span className="font-semibold text-slate-800 block text-sm">{p.nombre}</span>
                            <span className="text-slate-400 text-[11px] block mt-0.5 line-clamp-1">{p.descripcion || "Sin descripción detallada."}</span>
                          </td>

                          {/* Categoría */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium text-[10px]">
                              {p.categoria}
                            </span>
                          </td>

                          {/* Stock (SOH) */}
                          <td className="py-3.5 px-4 text-right">
                            <span className={`font-mono font-bold text-sm block ${
                              isLowStock ? "text-red-600 font-extrabold" : "text-slate-700"
                            }`}>
                              {p.cantidad}
                            </span>
                            {isLowStock && (
                              <span className="text-[9px] text-red-500 uppercase font-semibold">Stock Crítico</span>
                            )}
                          </td>

                          {/* Precio unitario */}
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            ${parseFloat(p.precio_unitario.toString()).toFixed(2)}
                          </td>

                          {/* Valor total */}
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                            ${valorTotal.toFixed(2)}
                          </td>

                          {/* Ubicación */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col text-slate-600">
                              <span className="flex items-center gap-1 font-medium text-[11px]">
                                <Building className="h-3 w-3 text-slate-400" />
                                {p.edificio || "Sin edificio"}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-4">
                                <MapPin className="h-2.5 w-2.5 text-slate-300" />
                                {p.ubicacion || "Área/Almacén"}
                              </span>
                            </div>
                          </td>

                          {/* Custodio */}
                          <td className="py-3.5 px-4">
                            {p.resguardo_nombre ? (
                              <div className="flex flex-col" title={`Email: ${p.resguardo_correo || '-'}\nTel: ${p.resguardo_telefono || '-'}`}>
                                <span className="flex items-center gap-1 text-slate-700 font-medium">
                                  <User className="h-3 w-3 text-emerald-500" />
                                  {p.resguardo_nombre}
                                </span>
                                {(p.resguardo_correo || p.resguardo_telefono) && (
                                  <span className="text-[10px] text-slate-400 ml-4 font-mono">
                                    {p.resguardo_correo ? p.resguardo_correo : p.resguardo_telefono}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                SIN RESGUARDO
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* QR Code view */}
                              <button
                                onClick={() => handleShowProductQr(p)}
                                className="p-1 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded flex items-center gap-1 text-[10px] transition"
                                title="Generar u Obtener código QR"
                              >
                                <QrCode className="h-3.5 w-3.5 text-orange-500" />
                                <span>Código QR</span>
                              </button>

                              {/* Editar */}
                              <button
                                onClick={() => openEditProductModal(p)}
                                disabled={!isAdmin}
                                className="p-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 disabled:opacity-30 disabled:hover:bg-slate-100 rounded transition"
                                title="Editar producto (Admin)"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              {/* Borrar */}
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.nombre)}
                                disabled={!isAdmin}
                                className="p-1 bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 disabled:opacity-30 disabled:hover:bg-red-50 rounded transition"
                                title="Borrar producto (Admin)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. TAB 2: CUSTODIAN PERSONNEL WORKSPACE */}
        {activeTab === "personal" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Personal custodio de activos</h2>
              <p className="text-xs text-slate-500">Mapeo del personal que tiene legal o laboralmente resguardas bajo su responsabilidad las propiedades de la empresa.</p>
            </div>

            {isLoading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Cargando directores y custodios...</p>
              </div>
            ) : personal.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700 font-mono">Sin Custodios Registrados</h3>
                <p className="text-xs text-slate-400 mt-1">Crea un registro de custodio para poder asignar responsabilidades de inventario.</p>
                <button
                  onClick={openAddCustodianModal}
                  disabled={!isAdmin}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white disabled:opacity-50 text-xs rounded-md"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Alta Custodio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personal.map((p) => {
                  const assignedItems = productos.filter((pr) => pr.resguardo_id === p.id);

                  return (
                    <div 
                      key={p.id} 
                      className="bg-slate-50/75 hover:bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs relative flex flex-col justify-between transition-all"
                    >
                      <div>
                        {/* Header card info */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-emerald-100 text-emerald-800 h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm">
                              {p.nombre_completo.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">{p.nombre_completo}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">ID Custodio: PR-00{p.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contacts panel */}
                        <div className="space-y-1.5 text-xs text-slate-600 mb-4 border-t border-slate-200/60 pt-3">
                          <div className="flex items-center gap-2 text-slate-600 font-serif">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.correo || "No registrado"}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{p.telefono || "No registrado"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer count of assigned assets */}
                      <div className="bg-white border border-slate-100 p-2.5 rounded-lg flex items-center justify-between text-xs mt-2">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Activos asignados:</span>
                          <span className="font-bold text-slate-800">{assignedItems.length} bienes</span>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditCustodianModal(p)}
                            disabled={!isAdmin}
                            className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 disabled:opacity-30 border border-slate-200 rounded"
                            title="Editar custodio"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustodian(p.id, p.nombre_completo)}
                            disabled={!isAdmin}
                            className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-30 border border-red-100 rounded"
                            title="Baja de custodio"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 7. TAB 3: QR CAMERA SCANNER */}
        {activeTab === "escanear" && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 text-center">
              <QrCode className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h2 className="text-base font-bold text-slate-800">Escaneo de Códigos QR</h2>
              <p className="text-xs text-slate-500">Escanea la etiqueta del equipo para desplegar la información y gestionar resguardo de forma rápida.</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Camera Scanner View */}
              <div className="border border-slate-200 bg-slate-900 rounded-xl overflow-hidden relative">
                {cameraScanActive ? (
                  <div>
                    <div id="qr-reader-target" className="w-full"></div>
                    <button
                      onClick={stopCameraScanner}
                      className="absolute top-2 right-2 px-2.5 py-1.5 bg-black/80 hover:bg-black text-white text-xs rounded-lg font-medium flex items-center gap-1 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Detener Cámara</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Camera className="h-10 w-10 mx-auto mb-2 text-slate-500 animate-pulse" />
                    <p className="text-xs max-w-sm mx-auto mb-4 px-4 text-slate-400">Permite el acceso a la cámara o presiona iniciar escáner para escanear en tiempo real.</p>
                    <button
                      onClick={startCameraScanner}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Camera className="h-4 w-4 text-orange-500" />
                      <span>Iniciar Escáner de Cámara</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Feedbacks */}
              {scannerFeedbackMsg && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-center text-xs font-medium text-slate-700">
                  {scannerFeedbackMsg}
                </div>
              )}

              {/* SIMULATION AND MANUAL FORM (Super reliable iframe fail-safe!) */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 text-center tracking-wider">
                  Búsqueda Manual de Coincidencia QR / Entrada
                </span>
                <form onSubmit={handleManualSearchSubmit} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ingresa el código ej: EQ-001"
                    value={scannerManualInput}
                    onChange={(e) => setScannerManualInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Simular Lectura QR
                  </button>
                </form>
              </div>

              {/* Scanned product display metadata card */}
              {scannedProduct && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-100">
                    <span className="bg-emerald-800 text-white px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                      REGISTRO ENCONTRADO: {scannedProduct.codigo_local}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">{scannedProduct.categoria}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{scannedProduct.nombre}</h3>
                  <p className="text-xs text-slate-500 mb-3">{scannedProduct.descripcion || "Sin descripción física."}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-serif bg-white p-3 rounded-lg border border-emerald-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Stock SOH</span>
                      <span className={`font-mono font-bold text-sm ${scannedProduct.cantidad <= lowStockThreshold ? "text-red-500" : "text-slate-800"}`}>
                        {scannedProduct.cantidad} unidades
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Ubicación</span>
                      <span className="text-slate-700 font-medium">
                        {scannedProduct.edificio || "-"} ({scannedProduct.ubicacion || "-"})
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Estatus del Resguardo</span>
                      <span className="text-slate-800 font-medium font-sans flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3 text-emerald-600" />
                        {scannedProduct.resguardo_nombre || "NINGUNA PERSONA TIENE EL RESGUARDO"}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          openEditProductModal(scannedProduct);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Editar Activo</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in duration-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {editingProduct ? "Editar Producto" : "Dar de Alta Producto"}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProductSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Local Code */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Código Local *</label>
                  <input
                    type="text"
                    required
                    placeholder="EQ-101"
                    value={prodCodigoLocal}
                    onChange={(e) => setProdCodigoLocal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-hidden"
                  />
                </div>

                {/* Category */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Categoría *</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Nombre del Activo / Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laptop HP Chromebook"
                    value={prodNombre}
                    onChange={(e) => setProdNombre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">Descripción detallada</label>
                  <textarea
                    rows={2}
                    placeholder="Especificaciones técnicas, marca, modelo, estado"
                    value={prodDescripcion}
                    onChange={(e) => setProdDescripcion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                  />
                </div>

                {/* SOH Quantity */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Cantidad (Stock) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodCantidad}
                    onChange={(e) => setProdCantidad(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-hidden"
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Precio Unitario ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="120.00"
                    value={prodPrecioUnitario}
                    onChange={(e) => setProdPrecioUnitario(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-hidden"
                  />
                </div>

                {/* Building */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Edificios *</label>
                  <select
                    value={prodEdificio}
                    onChange={(e) => setProdEdificio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                  >
                    {EDIFICIOS.map((ed) => (
                      <option key={ed} value={ed}>{ed}</option>
                    ))}
                  </select>
                </div>

                {/* Location context */}
                <div className="col-span-1">
                  <label className="text-xs text-slate-500 block mb-1">Ubicación exacta</label>
                  <input
                    type="text"
                    placeholder="Ej. Oficina 301, Planta Baja"
                    value={prodUbicacion}
                    onChange={(e) => setProdUbicacion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                  />
                </div>

                {/* Custodian Selection */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1 font-semibold">Asignar Responsable en Resguardo</label>
                  <select
                    value={prodResguardoId}
                    onChange={(e) => setProdResguardoId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden text-slate-800"
                  >
                    <option value="">-- Dejar SIN ASIGNACIÓN de custodio --</option>
                    {personal.map((p) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.nombre_completo} ({p.correo || "Sin correo"})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Si la persona no está, primero agrégala en la pestaña &quot;Personal de Resguardo&quot;.
                  </span>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg text-center font-medium">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold rounded-lg transition"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800">
                {editingCustodian ? "Modificar Custodio" : "Alta de Custodio"}
              </h3>
              <button 
                onClick={() => setIsCustodianModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCustodianSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan de Dios Pérez"
                  value={custNombre}
                  onChange={(e) => setCustNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={custCorreo}
                  onChange={(e) => setCustCorreo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Teléfono Móvil / Fijo</label>
                <input
                  type="tel"
                  placeholder="555-123456"
                  value={custTelefono}
                  onChange={(e) => setCustTelefono(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-hidden"
                />
              </div>

              {custFormError && (
                <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg text-center font-medium">
                  {custFormError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCustodianModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold rounded-lg transition"
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
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <QrCode className="h-4.5 w-4.5 text-orange-500" />
                <span>Etiqueta QR y Datos de Activo</span>
              </h3>
              <button 
                onClick={() => setViewingQrProduct(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated Printed Tag */}
            <div className="border border-slate-300 p-5 rounded-lg text-center space-y-3 bg-slate-50 font-serif">
              <span className="text-[10px] tracking-wider uppercase bg-orange-100 text-orange-850 px-2.5 py-0.5 rounded-full font-bold font-sans">
                Etiqueta Inventario
              </span>
              
              <div>
                <h4 className="font-bold text-slate-900 font-sans text-base leading-tight">{viewingQrProduct.nombre}</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans">Categoría: {viewingQrProduct.categoria}</p>
                <p className="text-[10px] text-slate-400 font-sans">{viewingQrProduct.edificio} &bull; {viewingQrProduct.ubicacion || "Área General"}</p>
              </div>

              {/* QR Image source */}
              {generatedQrDataUrl ? (
                <div className="bg-white p-2.5 border border-slate-200 inline-block rounded-lg shadow-2xs mx-auto">
                  <img 
                    src={generatedQrDataUrl} 
                    alt={`QR Code standard for ${viewingQrProduct.codigo_local}`}
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 bg-slate-200 rounded flex items-center justify-center mx-auto text-xs text-slate-400 font-mono">
                  Generando...
                </div>
              )}

              {/* Serial code printed layout */}
              <div>
                <span className="px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded tracking-widest leading-none select-all-clickable">
                  {viewingQrProduct.codigo_local}
                </span>
              </div>

              {/* Custodio */}
              <div className="border-t border-slate-200 pt-2 font-sans text-[11px] text-slate-500">
                Resguardo asignado a:<br />
                <strong className="text-slate-800">{viewingQrProduct.resguardo_nombre || "NINGUNA PERSONA REGISTRADA"}</strong>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setViewingQrProduct(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
              >
                Cerrar Ventana
              </button>
              <button
                onClick={handlePrintQrLabel}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Etiqueta</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
