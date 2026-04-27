import { useCallback, useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

type RunArgs = {
  uid: string;
  query: Record<string, unknown>;
  /** Optional. If omitted, the server exports every flattenable field. */
  fields?: string[];
};

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
        toggleNotification({ type: 'warning', message });
      } finally {
        setIsExporting(false);
      }
    },
    [post, toggleNotification],
  );

  return { run, isExporting };
}
