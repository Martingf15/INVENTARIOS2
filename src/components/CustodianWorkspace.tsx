import React from "react";
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  Edit, 
  Trash2, 
  RefreshCw 
} from "lucide-react";
import { Producto, PersonalResguardo } from "../types";

interface CustodianWorkspaceProps {
  personal: PersonalResguardo[];
  productos: Producto[];
  isLoading: boolean;
  isAdmin: boolean;
  openAddCustodianModal: () => void;
  openEditCustodianModal: (cust: PersonalResguardo) => void;
  handleDeleteCustodian: (id: number, name: string) => void;
}

export default function CustodianWorkspace({
  personal,
  productos,
  isLoading,
  isAdmin,
  openAddCustodianModal,
  openEditCustodianModal,
  handleDeleteCustodian
}: CustodianWorkspaceProps) {

  return (
    <div className="frosted-glass rounded-2xl shadow-2xl p-6 relative z-10">
      <div className="mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-400" />
            <span>Personal Custodio de Activos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Mapeo del personal que tiene legal o laboralmente asignados los bienes de la empresa en su resguardo.</p>
        </div>

        {personal.length > 0 && (
          <button
            onClick={openAddCustodianModal}
            disabled={!isAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition duration-200"
            title={isAdmin ? "Añadir custodio" : "Inicie sesión de Administrador para dar de alta personal"}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Alta de Custodio</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-300">Cargando directores y custodios...</p>
        </div>
      ) : personal.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/2">
          <Users className="h-12 w-12 text-slate-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">Sin Custodios Registrados</h3>
          <p className="text-xs text-slate-400 mt-2">Crea un registro de custodio para poder asignar responsabilidades de inventario.</p>
          <button
            onClick={openAddCustodianModal}
            disabled={!isAdmin}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition duration-150"
          >
            <Plus className="h-4 w-4" />
            <span>Alta Custodio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personal.map((p) => {
            const assignedItems = productos.filter((pr) => pr.resguardo_id === p.id);

            return (
              <div 
                key={p.id} 
                className="bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg relative flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  {/* Header card info */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500/10 text-orange-400 h-10 w-10 rounded-xl border border-orange-500/15 flex items-center justify-center font-bold text-sm tracking-wide shadow-inner">
                        {p.nombre_completo.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors">{p.nombre_completo}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Código Custodio: PR-00{p.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contacts panel */}
                  <div className="space-y-2 text-xs text-slate-300 mb-5 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-300 hover:text-white transition-colors" title={p.correo}>{p.correo || "Sin correo electrónico"}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{p.telefono || "Teléfono no registrado"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer count of assigned assets */}
                <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs mt-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">Bienes Asignados</span>
                    <span className="font-bold text-white text-sm">{assignedItems.length} activos</span>
                  </div>
                  
                  <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditCustodianModal(p)}
                      disabled={!isAdmin}
                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                      title="Editar custodio"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustodian(p.id, p.nombre_completo)}
                      disabled={!isAdmin}
                      className="p-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 disabled:opacity-35 border border-red-500/15 rounded-lg transition-all"
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
  );
}
