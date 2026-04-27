import { useCallback, useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

type RunArgs = {
  uid: string;
  query: Record<string, unknown>;
  /** Optional. If omitted, the server exports every flattenable field. */
  fields?: string[];
};

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function parseBlobError(data: unknown): Promise<string | null> {
  if (!(data instanceof Blob)) return null;
  try {
    const text = await data.text();
    if (!text) return null;
    try {
      const json = JSON.parse(text);
      return json?.error?.message ?? json?.message ?? text;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

export function useExport() {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [isExporting, setIsExporting] = useState(false);

  const run = useCallback(
    async ({ uid, query, fields }: RunArgs) => {
      setIsExporting(true);
      try {
        const body: Record<string, unknown> = { uid, query };
        if (fields && fields.length > 0) body.fields = fields;
        const response = await post(`/data-exporter/export`, body, {
          responseType: 'blob',
        } as any);

        const blob = response.data as Blob;

        // The fetch wrapper may not throw on 4xx when responseType is blob —
        // axios's validateStatus default handles it, but Strapi's wrapper has
        // been seen to pass through. If the blob looks like an error JSON
        // payload (small, type application/json), surface it as a toast.
        if (blob && blob.type && !blob.type.includes(XLSX_MIME) && blob.size < 64_000) {
          const errMsg = await parseBlobError(blob);
          toggleNotification({
            type: 'warning',
            message: errMsg ?? 'Export failed',
          });
          return;
        }

        const cd: string = (response as any)?.headers?.['content-disposition'] ?? '';
        const filenameMatch = /filename="?([^"]+)"?/i.exec(cd);
        const filename = filenameMatch?.[1] ?? 'export.xlsx';

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err: any) {
        // axios with responseType: 'blob' returns the error body as a Blob too,
        // so err.response.data is not a parsed JSON object. Read the blob text
        // and try to extract a useful message.
        let message: string | null = null;

        const data = err?.response?.data;
        if (data instanceof Blob) {
          message = await parseBlobError(data);
        } else if (typeof data === 'object' && data) {
          message = data?.error?.message ?? data?.message ?? null;
        } else if (typeof data === 'string') {
          message = data;
        }

        const finalMessage =
          message ??
          err?.message ??
          err?.response?.statusText ??
          'Export failed';

        // Useful for diagnosing in the browser console.
        // eslint-disable-next-line no-console
        console.error('[data-exporter] export failed', err);

        toggleNotification({ type: 'warning', message: finalMessage });
      } finally {
        setIsExporting(false);
      }
    },
    [post, toggleNotification],
  );

  return { run, isExporting };
}
