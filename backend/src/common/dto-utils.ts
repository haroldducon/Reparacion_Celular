import { Transform } from 'class-transformer';

/** Recorta espacios y convierte '' en undefined (para campos opcionales de formularios). */
export const VacioAUndefined = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim();
    return limpio === '' ? undefined : limpio;
  });

/** Solo recorta espacios (campos obligatorios). */
export const Recortar = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
