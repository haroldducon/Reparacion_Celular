import { IsDateString } from 'class-validator';

export class SolicitarReporteIADto {
  @IsDateString()
  periodoInicio: string;

  @IsDateString()
  periodoFin: string;
}
