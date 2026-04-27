import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Modal,
  Button,
  Checkbox,
  Flex,
  Loader,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useExport } from "../hooks/useExport";
import { parseListQuery } from "../lib/parse-list-query";

type FieldDescriptor = { path: string; label: string; type: string };

type Props = { uid: string; onClose: () => void };

export function ExportModal({ uid, onClose }: Props) {
  const { get } = useFetchClient();
  const location = useLocation();
  const { run, isExporting } = useExport();

  const [fields, setFields] = useState<FieldDescriptor[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await get(`/data-exporter/fields/${encodeURIComponent(uid)}`);
      if (!alive) return;
      const list = ((res as any)?.data as FieldDescriptor[]) ?? [];
      setFields(list);
      setSelected(new Set(list.map((f) => f.path)));
    })();
    return () => {
      alive = false;
    };
  }, [uid, get]);

  const query = useMemo(
    () => parseListQuery(location.search),
    [location.search],
  );

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const submit = async () => {
    await run({ uid, query, fields: Array.from(selected) });
    onClose();
  };

  return (
    <Modal.Root open onOpenChange={(o: boolean) => !o && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Export to xlsx</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {fields === null ? (
            <Loader role="progressbar">Loading fields…</Loader>
          ) : (
            <>
              <Flex gap={2}>
                <Button
                  variant="tertiary"
                  onClick={() =>
                    setSelected(new Set(fields.map((f) => f.path)))
                  }
                >
                  Select all
                </Button>
                <Button
                  variant="tertiary"
                  onClick={() => setSelected(new Set())}
                >
                  Select none
                </Button>
              </Flex>
              <Flex
                direction="column"
                alignItems="stretch"
                gap={1}
                marginTop={4}
              >
                {fields.map((f) => (
                  <label key={f.path}>
                    <Checkbox
                      checked={selected.has(f.path)}
                      onCheckedChange={() => toggle(f.path)}
                    />
                    <Typography>{f.label}</Typography>
                  </label>
                ))}
              </Flex>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={isExporting}
            disabled={selected.size === 0 || fields === null}
          >
            Export
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
