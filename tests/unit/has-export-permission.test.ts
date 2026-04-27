import { describe as test, it, expect, vi } from 'vitest';
import policy from '../../server/src/policies/has-export-permission';

function ctxWith(user: any, uid?: string, bodyUid?: string) {
  return {
    state: { user },
    params: uid ? { uid } : {},
    request: { body: bodyUid ? { uid: bodyUid } : {} },
  } as any;
}

test('has-export-permission policy', () => {
  it('returns false when no user', async () => {
    const result = await policy(ctxWith(null, 'api::a.a'), {}, { strapi: makeStrapiMock([]) } as any);
    expect(result).toBe(false);
  });

  it('returns false when user lacks the permission', async () => {
    const result = await policy(
      ctxWith({ id: 1 }, 'api::a.a'),
      {},
      { strapi: makeStrapiMock([]) } as any,
    );
    expect(result).toBe(false);
  });

  it('returns true when user has plugin::data-exporter.export for the requested uid', async () => {
    const result = await policy(
      ctxWith({ id: 1 }, 'api::a.a'),
      {},
      { strapi: makeStrapiMock([{ action: 'plugin::data-exporter.export', subject: 'api::a.a' }]) } as any,
    );
    expect(result).toBe(true);
  });

  it('returns false when permission exists but for a different uid', async () => {
    const result = await policy(
      ctxWith({ id: 1 }, 'api::a.a'),
      {},
      { strapi: makeStrapiMock([{ action: 'plugin::data-exporter.export', subject: 'api::other.other' }]) } as any,
    );
    expect(result).toBe(false);
  });

  it('reads uid from body when params.uid is absent', async () => {
    const result = await policy(
      ctxWith({ id: 1 }, undefined, 'api::a.a'),
      {},
      { strapi: makeStrapiMock([{ action: 'plugin::data-exporter.export', subject: 'api::a.a' }]) } as any,
    );
    expect(result).toBe(true);
  });

  it('returns true when permission has wildcard subject (subject: null)', async () => {
    const result = await policy(
      ctxWith({ id: 1 }, 'api::a.a'),
      {},
      { strapi: makeStrapiMock([{ action: 'plugin::data-exporter.export', subject: null }]) } as any,
    );
    expect(result).toBe(true);
  });
});

function makeStrapiMock(permissions: { action: string; subject: string | null }[]) {
  return {
    admin: {
      services: {
        permission: {
          findUserPermissions: vi.fn().mockResolvedValue(permissions),
        },
      },
    },
  };
}
