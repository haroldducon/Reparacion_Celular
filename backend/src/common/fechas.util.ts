import { BadRequestException } from '@nestjs/common';

const MAX_DIAS = 400;

// Zona horaria del negocio (Colombia no tiene horario de verano: offset fijo).
// Render corre en UTC: sin esto, una entrega a las 8 p. m. se contaría en el día siguiente.
export const TZ = process.env.APP_TIMEZONE ?? 'America/Bogota';
export const TZ_OFFSET = process.env.APP_TZ_OFFSET ?? '-05:00';

const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** 'AAAA-MM-DD' del día local del negocio para un instante dado. */
export const claveDia = (d: Date) => formatoDia.format(d);

/** Valida un rango 'AAAA-MM-DD'..'AAAA-MM-DD' y devuelve las claves normalizadas. */
export function parseRango(desde?: string, hasta?: string): [string, string] {
  const re = /^\d{4}-\d{2}-\d{2}/;
  if (!desde || !hasta || !re.test(desde) || !re.test(hasta)) {
    throw new BadRequestException('Indica "desde" y "hasta" en formato AAAA-MM-DD.');
  }
  const d = desde.slice(0, 10);
  const h = hasta.slice(0, 10);
  const td = Date.parse(`${d}T00:00:00Z`);
  const th = Date.parse(`${h}T00:00:00Z`);
  if (Number.isNaN(td) || Number.isNaN(th)) throw new BadRequestException('Fechas inválidas.');
  if (td > th) throw new BadRequestException('"desde" no puede ser posterior a "hasta".');
  if ((th - td) / 86_400_000 > MAX_DIAS) {
    throw new BadRequestException(`El rango máximo es de ${MAX_DIAS} días.`);
  }
  return [d, h];
}

/** Instantes exactos de inicio y fin del rango en la zona horaria del negocio. */
export function limitesRango(desde: string, hasta: string) {
  return {
    inicio: new Date(`${desde}T00:00:00.000${TZ_OFFSET}`),
    fin: new Date(`${hasta}T23:59:59.999${TZ_OFFSET}`),
  };
}

/** Todas las claves 'AAAA-MM-DD' entre dos fechas (inclusive). */
export function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const cursor = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (cursor <= fin) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}
