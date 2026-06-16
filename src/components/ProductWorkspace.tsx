import React from "react";
import { 
  Package, 
  Search, 
  SlidersHorizontal, 
  Building, 
  MapPin, 
  User, 
  QrCode, 
  Edit, 
  Trash2, 
  RefreshCw 
} from "lucide-react";
import { Producto, PersonalResguardo } from "../types";

interface ProductWorkspaceProps {
  productos: Producto[];
  personal: PersonalResguardo[];
  isLoading: boolean;
  isAdmin: boolean;
  lowStockThreshold: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  stockFilter: "TODOS" | "STOCK_BAJO" | "STOCK_OK";
  setStockFilter: (filter: "TODOS" | "STOCK_BAJO" | "STOCK_OK") => void;
  CATEGORIAS: string[];
  handleShowProductQr: (p: Producto) => void;
  openEditProductModal: (p: Producto) => void;
  handleDeleteProduct: (id: number, name: string) => void;
}

export default function ProductWorkspace({
  productos,
  personal,
  isLoading,
  isAdmin,
  lowStockThreshold,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  stockFilter,
  setStockFilter,
  CATEGORIAS,
  handleShowProductQr,
  openEditProductModal,
  handleDeleteProduct
}: ProductWorkspaceProps) {

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
    <div className="frosted-glass rounded-2xl shadow-2xl overflow-hidden relative z-10">
      {/* Table Filters Header */}
      <div className="p-5 border-b border-white/10 bg-white/3 flex flex-col lg:flex-row gap-4 justify-between items-stretch">
        <div className="flex items-center gap-2 max-w-md w-full relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Buscar por código, nombre, categoría, resguardo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full frosted-input placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Filtrar por:</span>
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/80 border border-white/10 text-white text-xs rounded-xl py-1.5 px-3 focus:outline-none focus:border-orange-500/50"
          >
            <option className="bg-slate-950" value="TODAS">Categoría: Todas</option>
            {CATEGORIAS.map(cat => (
              <option className="bg-slate-950" key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Stock Level filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-slate-900/80 border border-white/10 text-white text-xs rounded-xl py-1.5 px-3 focus:outline-none focus:border-orange-500/50"
          >
            <option className="bg-slate-950" value="TODOS">Stock: Todos</option>
            <option className="bg-slate-950" value="STOCK_BAJO">Stock: Bajo Alerta</option>
            <option className="bg-slate-950" value="STOCK_OK">Stock: Suficiente</option>
          </select>

          <button 
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("TODAS");
              setStockFilter("TODOS");
            }}
            className="text-xs text-orange-400 hover:text-orange-300 font-medium transition"
          >
            Restablecer
          </button>
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="p-20 text-center">
          <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-300">Cargando catálogo de inventario desde Neon...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-20 text-center">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-semibold text-slate-200">No se encontraron productos</h3>
          <p className="text-xs text-slate-400 mt-2">Intente cambiar los filtros o el término de búsqueda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[10px] tracking-wider uppercase bg-white/5 font-mono">
                <th className="py-3.5 px-5 font-semibold text-slate-300">Código</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300">Producto / Descripción</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300">Categoría</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300 text-right">Cantidad</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300 text-right">P. Unitario</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300 text-right">Val. Almacén</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300">Ubicación Física</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300">Persona en Resguardo</th>
                <th className="py-3.5 px-5 font-semibold text-slate-300 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredProducts.map((p) => {
                const isLowStock = p.cantidad <= lowStockThreshold;
                const valorTotal = p.cantidad * p.precio_unitario;

                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-white/5 transition duration-150 ${
                      isLowStock ? "bg-red-500/5" : ""
                    }`}
                  >
                    {/* Código Local */}
                    <td className="py-4 px-5 font-mono font-bold text-slate-200">
                      <span className="bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded text-[11px] text-orange-400">
                        {p.codigo_local}
                      </span>
                    </td>

                    {/* Nombre / Desc */}
                    <td className="py-4 px-5 max-w-sm">
                      <span className="font-semibold text-white block text-sm">{p.nombre}</span>
                      <span className="text-slate-400 text-[11px] block mt-1 line-clamp-1">{p.descripcion || "Sin descripción física registrada."}</span>
                    </td>

                    {/* Categoría */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center bg-white/5 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-full font-medium text-[10px]">
                        {p.categoria}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-4 px-5 text-right">
                      <span className={`font-mono font-bold text-sm block ${
                        isLowStock ? "text-red-400 font-extrabold drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]" : "text-slate-100"
                      }`}>
                        {p.cantidad}
                      </span>
                      {isLowStock && (
                        <span className="text-[9px] text-red-400 uppercase font-semibold tracking-wide animate-pulse">Stock Crítico</span>
                      )}
                    </td>

                    {/* Precio unitario */}
                    <td className="py-4 px-5 text-right font-mono text-slate-300">
                      ${parseFloat(p.precio_unitario.toString()).toFixed(2)}
                    </td>

                    {/* Valor total */}
                    <td className="py-4 px-5 text-right font-mono font-semibold text-orange-350">
                      ${valorTotal.toFixed(2)}
                    </td>

                    {/* Ubicación */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col text-slate-300">
                        <span className="flex items-center gap-1 font-medium text-[11px]">
                          <Building className="h-3 w-3 text-orange-400/80" />
                          {p.edificio || "Sin edificio"}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-4">
                          <MapPin className="h-2.5 w-2.5 text-slate-500" />
                          {p.ubicacion || "Área/Almacén"}
                        </span>
                      </div>
                    </td>

                    {/* Custodio */}
                    <td className="py-4 px-5">
                      {p.resguardo_nombre ? (
                        <div className="flex flex-col" title={`Email: ${p.resguardo_correo || '-'}\nTel: ${p.resguardo_telefono || '-'}`}>
                          <span className="flex items-center gap-1 text-emerald-300 font-medium">
                            <User className="h-3.5 w-3.5 text-emerald-400" />
                            {p.resguardo_nombre}
                          </span>
                          {(p.resguardo_correo || p.resguardo_telefono) && (
                            <span className="text-[10px] text-slate-400 ml-5 font-mono">
                              {p.resguardo_correo ? p.resguardo_correo : p.resguardo_telefono}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                          SIN RESGUARDO
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* QR Code view */}
                        <button
                          onClick={() => handleShowProductQr(p)}
                          className="p-1 px-2.5 bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-orange-400 hover:text-orange-300 rounded-lg flex items-center gap-1 text-[10px] transition-all duration-200"
                          title="Generar u Obtener código QR"
                        >
                          <QrCode className="h-3.5 w-3.5 text-orange-400" />
                          <span>Código QR</span>
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => openEditProductModal(p)}
                          disabled={!isAdmin}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg transition-all"
                          title="Editar producto (Admin)"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        {/* Borrar */}
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.nombre)}
                          disabled={!isAdmin}
                          className="p-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-500/25 text-red-400 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg transition-all"
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
  );
}
