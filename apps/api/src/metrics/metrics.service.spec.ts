import { MetricsService, normalizeRoute } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('exposes default node metrics', async () => {
    const body = await service.registry.metrics();
    expect(body).toContain('process_cpu_user_seconds_total');
    expect(body).toContain('nodejs_eventloop_lag_seconds');
  });

  it('records http request durations with labels', async () => {
    service.httpRequestDuration.observe(
      { method: 'GET', route: '/api/v1/health', status_code: '200' },
      0.05,
    );
    const body = await service.registry.metrics();
    expect(body).toContain('http_request_duration_seconds_bucket');
    expect(body).toContain('route="/api/v1/health"');
  });
});

describe('MetricsService http server', () => {
  let service: MetricsService;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.METRICS_PORT = '0';
    service = new MetricsService();
    const server = service.listen();
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (typeof address === 'string' || address === null) throw new Error('no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => {
    service.onModuleDestroy();
    delete process.env.METRICS_PORT;
  });

  it('serves the prometheus exposition on /metrics', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(await res.text()).toContain('process_cpu_user_seconds_total');
  });

  it('returns 404 on any other path', async () => {
    const res = await fetch(`${baseUrl}/anything`);
    expect(res.status).toBe(404);
  });
});

describe('normalizeRoute', () => {
  it('replaces numeric and long id segments', () => {
    expect(normalizeRoute('/api/v1/servers/42/channels')).toBe('/api/v1/servers/:id/channels');
    expect(normalizeRoute('/api/v1/servers/aG7kPzQw2mNxR8vT4cYd/channels')).toBe(
      '/api/v1/servers/:id/channels',
    );
  });

  it('keeps static segments untouched', () => {
    expect(normalizeRoute('/api/v1/health')).toBe('/api/v1/health');
  });
});
