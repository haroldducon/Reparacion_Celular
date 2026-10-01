import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Recortar, VacioAUndefined } from '../../common/dto-utils';

// Decimal(10,2) en Postgres admite hasta 99.999.999,99
const MAX_DINERO = 99_999_999;

export class CrearOrdenDto {
  // Usa clienteId si el cliente ya existe. Si no, llena clienteNombre +
  // clienteTelefono (y opcionalmente clienteEmail) para crearlo de una vez.
  @IsOptional()
  @VacioAUndefined()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(100)
  clienteNombre?: string;

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(30)
  clienteTelefono?: string;

  @IsOptional()
  @VacioAUndefined()
  @IsEmail()
  @MaxLength(254)
  clienteEmail?: string;

  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  marca: string;

  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  modelo: string;

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(40)
  imei?: string;

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(300)
  accesoriosRecibidos?: string;

  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  fallaReportada: string;
}

export class ItemRepuestoDto {
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_DINERO)
  costo: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  cantidad?: number;
}

/** Diagnóstico técnico y cotización. No contiene repuestos, mano de obra ni cobro. */
export class ActualizarDiagnosticoDto {
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  diagnostico: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_DINERO)
  presupuestoReparacion: number;
}

export class MarcarPresupuestoDto {
  @IsIn(['ACEPTADO', 'RECHAZADO'])
  estado: string;
}

/** Costos reales de ejecución. El cobro se hereda del presupuesto aprobado. */
export class RegistrarReparacionDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ItemRepuestoDto)
  repuestos?: ItemRepuestoDto[];

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

export class CambiarEstadoDto {
  @IsIn(['RECEPCION', 'DIAGNOSTICO', 'EN_REPARACION', 'REPARADO', 'ENTREGADO', 'CANCELADO'])
  estado: string;

  @IsOptional()
  @VacioAUndefined()
  @IsString()
  @MaxLength(500)
  nota?: string;
}

export class RegistrarEntregaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_DINERO)
  precioCobrado: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ItemRepuestoDto)
  repuestos?: ItemRepuestoDto[];

  // El frontend manda '' cuando no hay cambios de valores: se trata como "sin contraseña".
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}

export class AutorizarEntregaDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class SubirFotoDto {
  @IsIn(['RECEPCION', 'DIAGNOSTICO', 'REPARACION', 'ENTREGA'])
  tipo: string;
}

export class ComentarioDto {
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  texto: string;

  // true = lo ve el cliente en su página de seguimiento; false = nota interna del taller
  @IsBoolean()
  visibleCliente: boolean;
}

export class ReabrirOrdenDto {
  @Recortar()
  @IsString()
  @MinLength(5, { message: 'Explica el motivo (mínimo 5 caracteres)' })
  @MaxLength(500)
  motivo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
