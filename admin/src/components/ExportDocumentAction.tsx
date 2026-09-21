import { Download } from '@strapi/icons';
import { useExport } from '../hooks/useExport';

type Props = {
  activeTab: 'draft' | 'published' | null;
  collectionType: string;
  document?: { documentId?: string; [key: string]: unknown };
  documentId?: string;
  model: string;
};

/**
 * DocumentActionDescription factory consumed by Strapi 5's content-manager via
 * `addDocumentAction`. Single types have no list view (and therefore no bulk
 * actions), so this is the only way to expose the export there. It renders in
 * the edit view's side panel.
 */
export const ExportDocumentAction = ({ activeTab, collectionType, document, model }: Props) => {
  // Hooks must be called unconditionally per React rules.
  const { run, isExporting } = useExport();

  // Collection types are exported from the list view via ExportBulkAction.
  if (collectionType !== 'single-types') return null;

  // `document` is undefined while the single type has never been saved.
  const hasDocument = Boolean(document?.documentId);

  return {
    label: 'Export',
    icon: <Download />,
    disabled: isExporting || !hasDocument,
    position: 'panel',
    onClick: () => {
      run({
        uid: model,
        // Export the version the user is currently looking at (draft/published).
        query: activeTab ? { status: activeTab } : {},
      });
    },
  };
};
