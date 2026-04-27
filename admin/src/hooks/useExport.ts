import { useCallback, useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

type RunArgs = { uid: string; query: Record<string, unknown>; fields: string[] };

export function useExport() {
  const { post } = useFetchClient();
  const notify = useNotification();
  const [isExporting, setIsExporting] = useState(false);

  const run = useCallback(
    async ({ uid, query, fields }: RunArgs) => {
      setIsExporting(true);
      try {
        const response = await post(
          `/data-exporter/export`,
          { uid, query, fields },
          {
            responseType: 'blob',
          } as any,
        );

        const blob = response.data as Blob;
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
        const message = err?.response?.data?.error?.message ?? 'Export failed';
        (notify as any)({ type: 'warning', message });
      } finally {
        setIsExporting(false);
      }
    },
    [post, notify],
  );

  return { run, isExporting };
}
