import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { workboxConfig } from '../../../pwa-workbox.config';

type RuntimeRule = NonNullable<typeof workboxConfig.runtimeCaching>[number];

const matches = (rule: RuntimeRule, url: string): boolean => {
  if (typeof rule.urlPattern !== 'function') return false;

  return rule.urlPattern({
    url: new URL(url),
    request: new Request(url),
    event: {} as never,
    sameOrigin: new URL(url).origin === 'https://app.kontrolsmen.ru',
  });
};

describe('Workbox private response policy', () => {
  const runtimeCaching = workboxConfig.runtimeCaching ?? [];

  it('uses NetworkOnly for authenticated API responses on any origin', () => {
    const apiRule = runtimeCaching.find((rule) =>
      matches(rule, 'https://app.kontrolsmen.ru/api/v1/shifts')
    );

    expect(apiRule?.handler).toBe('NetworkOnly');
    expect(apiRule?.options).toBeUndefined();
    expect(matches(apiRule!, 'https://api.kontrolsmen.ru/api/v1/shifts/42/files/start')).toBe(true);
  });

  it('uses NetworkOnly for uploaded files and does not intercept public assets', () => {
    const uploadsRule = runtimeCaching.find((rule) =>
      matches(rule, 'https://api.kontrolsmen.ru/uploads/16/photo.jpg')
    );

    expect(uploadsRule?.handler).toBe('NetworkOnly');
    expect(runtimeCaching.some((rule) => matches(rule, 'https://app.kontrolsmen.ru/assets/app.js'))).toBe(false);
    expect(workboxConfig.cleanupOutdatedCaches).toBe(true);
  });

  it('deletes the legacy api-cache when the new worker activates', async () => {
    const cleanupPath = resolve(process.cwd(), 'public', 'pwa-cache-cleanup.js');
    const source = readFileSync(cleanupPath, 'utf8');
    let activateHandler: ((event: { waitUntil(promise: Promise<boolean>): void }) => void) | undefined;
    const addEventListener = vi.fn((eventName: string, handler: typeof activateHandler) => {
      if (eventName === 'activate') activateHandler = handler;
    });
    const deleteCache = vi.fn().mockResolvedValue(true);

    new Function('self', 'caches', source)(
      { addEventListener },
      { delete: deleteCache }
    );

    expect(workboxConfig.importScripts).toContain('/pwa-cache-cleanup.js');
    expect(activateHandler).toBeDefined();

    let cleanupPromise: Promise<boolean> | undefined;
    activateHandler!({ waitUntil: (promise) => { cleanupPromise = promise; } });
    await cleanupPromise;

    expect(deleteCache).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('api-cache');
  });
});
