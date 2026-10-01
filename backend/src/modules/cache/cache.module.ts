import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global() // disponible en toda la app sin re-importar
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
