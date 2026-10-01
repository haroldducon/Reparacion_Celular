import { IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;
}