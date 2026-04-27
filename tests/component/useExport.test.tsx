import { describe as test, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '../../admin/src/hooks/useExport';

const mockNotify = vi.fn();
vi.mock('@strapi/strapi/admin', () => ({
  useNotification: () => ({ toggleNotification: mockNotify }),
  useAuth: () => 'fake-jwt-token',
}));

beforeEach(() => {
  mockNotify.mockClear();
  // jsdom doesn't implement these
  global.URL.createObjectURL = vi.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = vi.fn();
});

function mockFetchOnce(response: Response) {
  global.fetch = vi.fn(async () => response) as any;
}

test('useExport', () => {
  it('triggers a browser download via blob URL on success', async () => {
    mockFetchOnce(
      new Response('xlsx-bytes', {
        status: 200,
        headers: {
          'content-type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition':
            'attachment; filename="article-20260427T120000Z.xlsx"',
        },
      }),
    );

    const { result } = renderHook(() => useExport());
    await act(async () => {
      await result.current.run({
        uid: 'api::article.article',
        query: {},
      });
    });
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('toggles isExporting around the call', async () => {
    mockFetchOnce(
      new Response('xlsx-bytes', {
        status: 200,
        headers: {
          'content-type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }),
    );

    const { result } = renderHook(() => useExport());
    expect(result.current.isExporting).toBe(false);
    await act(async () => {
      await result.current.run({
        uid: 'api::article.article',
        query: {},
      });
    });
    expect(result.current.isExporting).toBe(false);
  });

  it('shows the server error message on 4xx', async () => {
    mockFetchOnce(
      new Response(
        JSON.stringify({
          error: { code: 'UNKNOWN_UID', message: 'Unknown content type: x' },
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const { result } = renderHook(() => useExport());
    await act(async () => {
      await result.current.run({ uid: 'x', query: {} });
    });
    expect(mockNotify).toHaveBeenCalledWith({
      type: 'warning',
      message: 'Unknown content type: x',
    });
  });
});
