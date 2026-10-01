export type Rol = 'SUPER_ADMIN' | 'ADMIN' | 'TECNICO' | 'RECEPCION';

export interface UsuarioSesion {
  sub: string;
  tenantId: string | null;
  rol: Rol;
  email: string;
  nombre: string;
}

export type EstadoOrden =
  | 'RECEPCION'
  | 'DIAGNOSTICO'
  | 'EN_REPARACION'
  | 'REPARADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
}

export interface ItemRepuesto {
  id: string;
  nombre: string;
  costo: string;
  cantidad: number;
}

export interface FotoOrden {
  id: string;
  url: string;
  tipo: 'RECEPCION' | 'DIAGNOSTICO' | 'REPARACION' | 'ENTREGA';
  createdAt: string;
}

export type EstadoPresupuesto = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';

export interface HistorialEstado {
  id: string;
  estadoAnterior: string;
  estadoNuevo: string;
  nota?: string | null;
  visibleCliente?: boolean;
  createdAt: string;
}

export interface OrdenReparacion {
  id: string;
  marca: string;
  modelo: string;
  imei?: string | null;
  color?: string | null;
  accesoriosRecibidos?: string | null;
  fallaReportada: string;
  estado: EstadoOrden;
  diagnostico?: string | null;
  presupuestoReparacion?: string | number | null;
  estadoPresupuesto?: EstadoPresupuesto;
  observaciones?: string | null;
  numeroReparacion?: string | number | null;
  costoRepuestos: string;
  precioCobrado?: string | null;
  fechaRecepcion: string;
  fechaDiagnostico?: string | null;
  fechaReparado?: string | null;
  fechaEntrega?: string | null;
  cliente: Cliente;
  tecnico?: { nombre: string } | null;
  fotos?: FotoOrden[];
  repuestos?: ItemRepuesto[];
  historial?: HistorialEstado[];
}