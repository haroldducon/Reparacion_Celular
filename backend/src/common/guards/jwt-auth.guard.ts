import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Valida el JWT de acceso (corta duración) en el header Authorization.
 * El payload decodificado queda disponible en request.user.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
