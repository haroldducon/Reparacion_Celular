import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { TIPOS_IMAGEN, UPLOAD_DIR } from '../../common/upload.util';

export interface FotoGuardada {
  /** Lo que se guarda en la BD: ruta relativa (disco local) o URL https (Cloudinary). */
  url: string;
  /** Identificador interno para poder borrarla si algo falla después. */
  ref: string;
}

/**
 * Almacenamiento de fotos.
 *  - Con CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET: se suben a Cloudinary (producción).
 *  - Sin esas variables: disco local (solo desarrollo; en Render el disco se borra en cada despliegue).
 */
@Injectable()
export class StorageService {
  private logger = new Logger(StorageService.name);
  private cloud = process.env.CLOUDINARY_CLOUD_NAME;
  private apiKey = process.env.CLOUDINARY_API_KEY;
  private apiSecret = process.env.CLOUDINARY_API_SECRET;

  constructor() {
    if (!this.usaNube && process.env.NODE_ENV === 'production') {
      this.logger.warn('Cloudinary no configurado: las fotos se guardan en disco local y se perderán en cada despliegue.');
    }
  }

  get usaNube() {
    return !!(this.cloud && this.apiKey && this.apiSecret);
  }

  async guardar(buffer: Buffer, mimetype: string): Promise<FotoGuardada> {
    return this.usaNube ? this.guardarEnNube(buffer, mimetype) : this.guardarEnDisco(buffer, mimetype);
  }

  async eliminar(ref: string) {
    try {
      if (this.usaNube) {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this.firmar({ public_id: ref, timestamp });
        const fd = new FormData();
        fd.append('public_id', ref);
        fd.append('timestamp', String(timestamp));
        fd.append('api_key', this.apiKey!);
        fd.append('signature', signature);
        await fetch(`https://api.cloudinary.com/v1_1/${this.cloud}/image/destroy`, {
          method: 'POST',
          body: fd,
          signal: AbortSignal.timeout(15_000),
        });
      } else {
        await unlink(join(UPLOAD_DIR, ref));
      }
    } catch {
      // limpieza "mejor esfuerzo": un archivo huérfano no debe tumbar la petición
    }
  }

  private async guardarEnDisco(buffer: Buffer, mimetype: string): Promise<FotoGuardada> {
    const nombre = `${randomUUID()}${TIPOS_IMAGEN[mimetype] ?? '.jpg'}`;
    await writeFile(join(UPLOAD_DIR, nombre), buffer, { flag: 'wx' });
    return { url: `/uploads/${nombre}`, ref: nombre };
  }

  private async guardarEnNube(buffer: Buffer, mimetype: string): Promise<FotoGuardada> {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'tech-tinker';
    const publicId = randomUUID(); // nombre aleatorio: el enlace no se puede adivinar
    const signature = this.firmar({ folder, public_id: publicId, timestamp });

    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(buffer)], { type: mimetype }), 'foto');
    fd.append('api_key', this.apiKey!);
    fd.append('timestamp', String(timestamp));
    fd.append('signature', signature);
    fd.append('folder', folder);
    fd.append('public_id', publicId);

    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${this.cloud}/image/upload`, {
      method: 'POST',
      body: fd,
      signal: AbortSignal.timeout(30_000),
    });
    if (!respuesta.ok) {
      this.logger.error(`Cloudinary respondió ${respuesta.status}`);
      throw new InternalServerErrorException('No se pudo guardar la foto. Intenta de nuevo.');
    }
    const data: any = await respuesta.json();
    // f_auto convierte HEIC (iPhone) y otros formatos a uno que todos los navegadores muestran;
    // w_1600 evita servir fotos gigantes.
    const url = String(data.secure_url).replace('/upload/', '/upload/f_auto,q_auto,w_1600,c_limit/');
    return { url, ref: data.public_id };
  }

  /** Firma de Cloudinary: parámetros ordenados alfabéticamente + secreto, en SHA-1. */
  private firmar(params: Record<string, string | number>) {
    const base = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return createHash('sha1').update(base + this.apiSecret).digest('hex');
  }
}
