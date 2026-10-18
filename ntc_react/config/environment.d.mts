export function resolveFrontendEnvironment(env: Record<string, string | undefined>, options: { mode: string; apiPath: string; defaultProxy: string }): { apiBaseUrl: string; proxyTarget: string };
