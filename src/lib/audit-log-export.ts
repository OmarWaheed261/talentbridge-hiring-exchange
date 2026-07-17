import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type AuditRow = {
  id: string;
  created_at: string;
  event_type: string;
  action: string;
  actor_email: string | null;
  actor_id: string | null;
  actor_role: string | null;
  resource_type: string | null;
  resource_id: string | null;
  status: string;
  metadata: unknown;
};

const COLUMNS: { key: keyof AuditRow | "resource" | "metadata_json"; label: string }[] = [
  { key: "created_at", label: "When (UTC)" },
  { key: "event_type", label: "Type" },
  { key: "action", label: "Action" },
  { key: "actor_email", label: "Actor Email" },
  { key: "actor_id", label: "Actor ID" },
  { key: "actor_role", label: "Role" },
  { key: "resource", label: "Resource" },
  { key: "status", label: "Status" },
  { key: "metadata_json", label: "Metadata" },
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalize(r: AuditRow) {
  return {
    created_at: r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss") : "",
    event_type: r.event_type ?? "",
    action: r.action ?? "",
    actor_email: r.actor_email ?? "",
    actor_id: r.actor_id ?? "",
    actor_role: r.actor_role ?? "",
    resource: r.resource_type ? `${r.resource_type}${r.resource_id ? `:${r.resource_id}` : ""}` : "",
    status: r.status ?? "",
    metadata_json: r.metadata ? JSON.stringify(r.metadata) : "",
  };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAuditRowsAsCSV(rows: AuditRow[], filenameBase: string) {
  const header = COLUMNS.map((c) => c.label).join(",");
  const lines = rows.map((r) => {
    const n = normalize(r);
    return COLUMNS.map((c) => csvEscape((n as Record<string, unknown>)[c.key as string])).join(",");
  });
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  download(blob, `${filenameBase}.csv`);
}

export function exportAuditRowsAsPDF(
  rows: AuditRow[],
  filenameBase: string,
  meta: { filters: Record<string, string | null | undefined>; generatedAt: string },
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text("TalentBridge AI — Audit Log Incident Report", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(meta.generatedAt), "yyyy-MM-dd HH:mm:ss")}`, 40, 58);
  doc.text(`Rows: ${rows.length}`, 40, 72);

  const activeFilters = Object.entries(meta.filters)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== "all")
    .map(([k, v]) => `${k}=${v}`)
    .join("  ·  ");
  if (activeFilters) {
    doc.text(`Filters: ${activeFilters}`, 40, 86, { maxWidth: pageWidth - 80 });
  }
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 100,
    head: [["When", "Type", "Action", "Actor", "Role", "Resource", "Status", "Metadata"]],
    body: rows.map((r) => {
      const n = normalize(r);
      return [
        n.created_at,
        n.event_type,
        n.action,
        n.actor_email || n.actor_id,
        n.actor_role,
        n.resource,
        n.status,
        n.metadata_json.length > 120 ? n.metadata_json.slice(0, 117) + "…" : n.metadata_json,
      ];
    }),
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 45 },
      2: { cellWidth: 110 },
      3: { cellWidth: 140 },
      4: { cellWidth: 55 },
      5: { cellWidth: 110 },
      6: { cellWidth: 45 },
      7: { cellWidth: "auto" },
    },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const current = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Page ${current} / ${pageCount}`,
        pageWidth - 60,
        doc.internal.pageSize.getHeight() - 20,
      );
    },
  });

  doc.save(`${filenameBase}.pdf`);
}
