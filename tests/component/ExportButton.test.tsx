import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe as test, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExportButton } from '../../admin/src/components/ExportButton';

// `@strapi/design-system` ships a CJS `main` while declaring `"type": "module"`
// in its package.json, which breaks Vitest's module resolution under jsdom.
// We only need a button element here, so stub it to a plain <button>.
vi.mock('@strapi/design-system', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// ExportButton doesn't import from `@strapi/strapi/admin` directly, but
// ExportModal does — and resolving that chain (via @strapi/i18n) blows up
// under vitest. Stub the surface ExportModal uses.
vi.mock('@strapi/strapi/admin', () => ({
  useFetchClient: () => ({ get: () => Promise.resolve({ data: [] }) }),
  useNotification: () => ({ toggleNotification: () => {} }),
}));

function renderAt(path: string, route: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={<ExportButton />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('ExportButton', () => {
  it('renders the button on a collection list view', () => {
    renderAt(
      '/content-manager/collection-types/api::article.article',
      '/content-manager/collection-types/:slug',
    );
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('renders nothing when there is no slug param', () => {
    const { container } = renderAt('/somewhere-else', '/somewhere-else');
    expect(container.querySelector('button')).toBeNull();
  });
});
