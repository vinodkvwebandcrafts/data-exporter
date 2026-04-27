import { useCallback, useState } from 'react';
import { useAuth, useNotification } from '@strapi/strapi/admin';

type RunArgs = {
  uid: string;
  query: Record<string, unknown>;
  /** Optional. If omitted, the server exports every flattenable field. */
  fields?: string[];
};

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function readErrorMessage(res: Response): Promise<string> {
  // The server returns JSON for 4xx/5xx with shape { error: { message, code } }.
  try {
    const text = await res.text();
    if (!text) return res.statusText || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      return json?.error?.message ?? json?.message ?? text;
    } catch {
      return text;
    }
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export function useExport() {
  // Strapi's useFetchClient is an axios wrapper that doesn't propagate
  // `responseType: 'blob'` reliably — the binary response gets parsed as JSON
  // and ends up as a malformed object. Use raw fetch with the admin token.
  const token = useAuth('useExport', (state) => state.token);
  const { toggleNotification } = useNotification();
  const [isExporting, setIsExporting] = useState(false);

  const run = useCallback(
    async ({ uid, query, fields }: RunArgs) => {
      setIsExporting(true);
      try {
        const body: Record<string, unknown> = { uid, query };
        if (fields && fields.length > 0) body.fields = fields;

        const res = await fetch('/data-exporter/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const message = await readErrorMessage(res);
          toggleNotification({ type: 'warning', message });
          return;
        }

        const blob = await res.blob();
        const cd = res.headers.get('content-disposition') ?? '';
        const filenameMatch = /filename="?([^"]+)"?/i.exec(cd);
        const filename = filenameMatch?.[1] ?? 'export.xlsx';

        // Wrap in xlsx mime type just in case the server omitted it.
        const xlsxBlob =
          blob.type === XLSX_MIME ? blob : new Blob([blob], { type: XLSX_MIME });

        const url = URL.createObjectURL(xlsxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[data-exporter] export failed', err);
        toggleNotification({
          type: 'warning',
          message: err?.message ?? 'Export failed',
        });
      } finally {
        setIsExporting(false);
      }
    },
    [token, toggleNotification],
  );

  return { run, isExporting };
}
