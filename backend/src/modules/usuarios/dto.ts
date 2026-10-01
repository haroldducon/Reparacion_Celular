import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Recortar } from '../../common/dto-utils';

export class CrearUsuarioDto {
  @Recortar()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @Recortar()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsIn(['ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN'])
  rol: string;

  // Solo lo usa super_admin para elegir a qué taller pertenece el usuario nuevo.
  // Si quien crea es ADMIN, este valor se ignora y se fuerza su propio tenantId.
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @Recortar()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN'])
  rol?: string;
}

export class ResetearPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class CambiarActivoDto {
  @IsBoolean()
  activo: boolean;
}
