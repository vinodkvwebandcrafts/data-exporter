import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { describe as test, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGet = vi.fn();
const mockRun = vi.fn();

vi.mock("@strapi/strapi/admin", () => ({
  useFetchClient: () => ({ get: mockGet }),
  useNotification: () => ({ toggleNotification: vi.fn() }),
}));

vi.mock("../../admin/src/hooks/useExport", () => ({
  useExport: () => ({ run: mockRun, isExporting: false }),
}));

// `@strapi/design-system` ships a CJS `main` while declaring `"type": "module"`,
// which breaks Vitest's resolver under jsdom. Stub the bits we use to plain
// HTML so behaviour assertions still run.
vi.mock("@strapi/design-system", () => {
  const Pass = ({ children, ...rest }: any) =>
    React.createElement("div", rest, children);
  return {
    Modal: {
      Root: ({ children }: any) =>
        React.createElement("div", { role: "dialog" }, children),
      Content: Pass,
      Header: Pass,
      Title: Pass,
      Body: Pass,
      Footer: Pass,
    },
    Button: ({ children, onClick, disabled }: any) =>
      React.createElement("button", { onClick, disabled }, children),
    Checkbox: ({ checked, onCheckedChange }: any) =>
      React.createElement("input", {
        type: "checkbox",
        checked: !!checked,
        onChange: () => onCheckedChange?.(!checked),
      }),
    Flex: Pass,
    Loader: ({ children, ...rest }: any) =>
      React.createElement("div", { role: "progressbar", ...rest }, children),
    Typography: ({ children, ...rest }: any) =>
      React.createElement("span", rest, children),
  };
});

// Imported AFTER the mocks so the mocks take effect.
import { ExportModal } from "../../admin/src/components/ExportModal";

beforeEach(() => {
  mockGet.mockReset();
  mockRun.mockReset();
});

const wrapper =
  (path: string) =>
  ({ children }: any) =>
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      children,
    );

test("ExportModal", () => {
  it("shows a spinner while loading fields", () => {
    mockGet.mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(
      <ExportModal uid="api::article.article" onClose={() => {}} />,
      {
        wrapper: wrapper(
          "/content-manager/collection-types/api::article.article",
        ),
      },
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders the field checklist after fields load", async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { path: "title", label: "Title", type: "string" },
        { path: "views", label: "Views", type: "integer" },
      ],
    });
    render(
      <ExportModal uid="api::article.article" onClose={() => {}} />,
      {
        wrapper: wrapper(
          "/content-manager/collection-types/api::article.article",
        ),
      },
    );
    expect(await screen.findByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Views")).toBeInTheDocument();
  });

  it("disables submit until at least one field is selected", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ path: "title", label: "Title", type: "string" }],
    });
    render(
      <ExportModal uid="api::article.article" onClose={() => {}} />,
      {
        wrapper: wrapper(
          "/content-manager/collection-types/api::article.article",
        ),
      },
    );
    const checkbox = await screen.findByLabelText("Title");
    fireEvent.click(checkbox); // turn off the only field
    const submit = screen.getByRole("button", { name: /^export$/i });
    expect(submit).toBeDisabled();
  });

  it("calls useExport.run with parsed query and selected fields", async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { path: "title", label: "Title", type: "string" },
        { path: "views", label: "Views", type: "integer" },
      ],
    });
    render(
      <ExportModal uid="api::article.article" onClose={() => {}} />,
      {
        wrapper: wrapper(
          "/content-manager/collection-types/api::article.article?status=published&sort=title:ASC",
        ),
      },
    );
    await screen.findByLabelText("Title");
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));
    await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1));
    expect(mockRun.mock.calls[0]![0]).toMatchObject({
      uid: "api::article.article",
      fields: expect.arrayContaining(["title", "views"]),
      query: { status: "published", sort: { title: "ASC" } },
    });
  });
});
