export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  files: {
    all: ['files'] as const,
    list: (params?: { limit?: number; cursor?: string | null; prefix?: string }) =>
      [...queryKeys.files.all, 'list', params] as const,
  },
  stats: {
    all: ['stats'] as const,
    summary: () => [...queryKeys.stats.all, 'summary'] as const,
  },
  health: {
    all: ['health'] as const,
    check: () => [...queryKeys.health.all, 'check'] as const,
  },
};
