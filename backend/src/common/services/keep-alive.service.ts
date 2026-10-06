import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeepAliveService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('KeepAliveService');
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.startKeepAlive();
  }

  onApplicationShutdown() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private startKeepAlive() {
    // Render inyecta automáticamente RENDER_EXTERNAL_URL en todos sus Web Services
    // También se puede configurar KEEP_ALIVE_URL o PUBLIC_BACKEND_URL manualmente
    const externalUrl =
      this.configService.get<string>('KEEP_ALIVE_URL') ||
      this.configService.get<string>('RENDER_EXTERNAL_URL') ||
      this.configService.get<string>('PUBLIC_BACKEND_URL');

    if (!externalUrl) {
      this.logger.log('ℹ️ Keep-Alive inactivo: No se detectó URL pública externa (entorno local).');
      return;
    }

    // Normalizar la URL hacia /api/v1/health
    const prefix = this.configService.get<string>('API_PREFIX', 'api/v1');
    let targetUrl = externalUrl.replace(/\/+$/, '');
    if (!targetUrl.includes('/health')) {
      targetUrl = `${targetUrl}/${prefix}/health`;
    }

    const intervalMinutes = Number(this.configService.get<number>('KEEP_ALIVE_INTERVAL_MINUTES', 10));
    const intervalMs = intervalMinutes * 60 * 1000;

    this.logger.log(`🚀 Keep-Alive ACTIVO: Enviando ping cada ${intervalMinutes} min a: ${targetUrl}`);

    // Primer ping a los 45 segundos tras arrancar
    setTimeout(() => {
      this.pingSelf(targetUrl);
    }, 45000);

    // Pings continuos periódicos
    this.intervalTimer = setInterval(() => {
      this.pingSelf(targetUrl);
    }, intervalMs);
  }

  private async pingSelf(url: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MascotasQR-AntiSleep/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.logger.log(`💓 Ping Keep-Alive exitoso [${response.status}] -> Servidor activo`);
      } else {
        this.logger.warn(`⚠️ Ping Keep-Alive respondió código HTTP ${response.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ Error en ping Keep-Alive: ${err.message}`);
    }
  }
}
