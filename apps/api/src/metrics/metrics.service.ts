import { createServer, type Server } from 'node:http';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

// Sert /metrics sur un port interne dedie (jamais route par Traefik) :
// Prometheus scrape via le reseau Docker, rien n'est expose publiquement.
@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private server?: Server;

  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duree des requetes HTTP par methode, route et code de statut',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  listen(): Server {
    const port = Number(process.env.METRICS_PORT ?? 9464);
    this.server = createServer((req, res) => {
      if (req.url !== '/metrics') {
        res.statusCode = 404;
        res.end();
        return;
      }
      this.registry
        .metrics()
        .then((body) => {
          res.setHeader('Content-Type', this.registry.contentType);
          res.end(body);
        })
        .catch(() => {
          res.statusCode = 500;
          res.end();
        });
    });
    this.server.listen(port, () => this.logger.log(`metrics exposed on :${port}/metrics`));
    return this.server;
  }

  onModuleDestroy() {
    this.server?.close();
  }
}

// Remplace les identifiants par :id pour borner la cardinalite du label route.
export function normalizeRoute(path: string): string {
  return path
    .split('/')
    .map((seg) => (/^\d+$/.test(seg) || /^[A-Za-z0-9_-]{16,}$/.test(seg) ? ':id' : seg))
    .join('/');
}
