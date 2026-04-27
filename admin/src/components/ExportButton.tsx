import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@strapi/design-system";
import { useRBAC } from "@strapi/strapi/admin";
import { ExportModal } from "./ExportModal";

export function ExportButton() {
  const { uid } = useParams<{ uid: string }>();
  const [open, setOpen] = useState(false);

  const { isLoading, allowedActions } = useRBAC({
    canExport: [{ action: "plugin::data-exporter.export", subject: uid }],
  } as any);

  if (isLoading || !allowedActions.canExport || !uid) return null;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Export
      </Button>
      {open && <ExportModal uid={uid} onClose={() => setOpen(false)} />}
    </>
  );
}
