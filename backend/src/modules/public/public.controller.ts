import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicService } from './public.service';

@Controller('seguimiento')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get(':id')
  // sin JwtAuthGuard a propósito: es la página pública que ve el cliente.
  // Rate limit más estricto que el global, para frenar cualquier intento de
  // enumeración (aunque el id es un UUID, prácticamente no adivinable).
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  seguimiento(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicService.seguimiento(id);
  }
}
