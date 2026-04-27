import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@strapi/design-system";
import { ExportModal } from "./ExportModal";

export function ExportButton() {
  // Strapi 5's content-manager URL is /content-manager/collection-types/:slug
  // where :slug carries the UID value (e.g. "api::article.article").
  const { slug } = useParams<{ slug: string }>();
  const uid = slug;
  const [open, setOpen] = useState(false);

  if (!uid) return null;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Export
      </Button>
      {open && <ExportModal uid={uid} onClose={() => setOpen(false)} />}
    </>
  );
}
