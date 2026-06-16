export interface PersonalResguardo {
  id: number;
  nombre_completo: string;
  correo: string;
  telefono: string;
  created_at?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  codigo_local: string;
  categoria: string;
  resguardo_id: number | null;
  edificio: string;
  ubicacion: string;
  created_at?: string;
  // Join helper field for display
  resguardo_nombre?: string;
}

export interface DbStatus {
  connected: boolean;
  isFallback: boolean;
  databaseName?: string;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
}
