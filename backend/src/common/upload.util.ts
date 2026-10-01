import { BadRequestException } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const TIPOS_IMAGEN: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export function filtroImagen(_req: unknown, file: { mimetype: string }, cb: (e: Error | null, ok: boolean) => void) {
  if (TIPOS_IMAGEN[file.mimetype]) return cb(null, true);
  cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WEBP, GIF o HEIC.'), false);
}

/** Verifica la firma real del archivo (no basta con confiar en el mimetype del cliente). */
export function firmaImagenValida(b: Buffer): boolean {
  if (b.length < 12) return false;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const gif = b.subarray(0, 4).toString('ascii') === 'GIF8';
  const webp = b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP';
  const heic = b.subarray(4, 8).toString('ascii') === 'ftyp';
  return jpeg || png || gif || webp || heic;
}
