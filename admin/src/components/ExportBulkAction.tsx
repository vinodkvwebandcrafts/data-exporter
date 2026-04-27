import { Download } from '@strapi/icons';
import { useExport } from '../hooks/useExport';

type Document = { documentId: string; [key: string]: unknown };
type Props = {
  documents: Document[];
  model: string;
  collectionType: string;
};

/**
 * BulkActionDescription factory consumed by Strapi 5's content-manager via
 * `addBulkAction`. The content-manager renders this only when ≥1 row is
 * selected; we receive the selected `documents` array here.
 */
export const ExportBulkAction = ({ documents, model, collectionType }: Props) => {
  // Hooks must be called unconditionally per React rules.
  const { run, isExporting } = useExport();

  // Single types don't have list views, so there are no bulk actions there.
  if (collectionType !== 'collection-types') return null;

  const documentIds = documents.map((d) => d.documentId).filter(Boolean);

  return {
    label: `Export${documentIds.length > 0 ? ` (${documentIds.length})` : ''}`,
    icon: <Download />,
    disabled: isExporting || documentIds.length === 0,
    onClick: () => {
      run({
        uid: model,
        query: { filters: { documentId: { $in: documentIds } } },
      });
    },
  };
};
