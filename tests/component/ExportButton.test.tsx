import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe as test, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExportButton } from '../../admin/src/components/ExportButton';

let allowed = true;
vi.mock('@strapi/strapi/admin', () => ({
  useRBAC: () => ({ isLoading: false, allowedActions: { canExport: allowed } }),
}));

// `@strapi/design-system` ships a CJS `main` while declaring `"type": "module"`
// in its package.json, which breaks Vitest's module resolution under jsdom.
// We only need a button element here, so stub it to a plain <button>.
vi.mock('@strapi/design-system', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/content-manager/collection-types/:uid" element={<ExportButton />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('ExportButton', () => {
  it('renders the button when RBAC allows', () => {
    allowed = true;
    renderAt('/content-manager/collection-types/api::article.article');
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('renders nothing when RBAC denies', () => {
    allowed = false;
    const { container } = renderAt('/content-manager/collection-types/api::article.article');
    expect(container.querySelector('button')).toBeNull();
  });
});
