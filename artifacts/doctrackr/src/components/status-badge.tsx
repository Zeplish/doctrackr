import { Badge } from "@/components/ui/badge";

type DocStatus = "missing" | "valid" | "expiring_soon" | "due_today" | "overdue";

const STATUS_CONFIG: Record<DocStatus, { label: string; className: string }> = {
  missing: { label: "Missing", className: "bg-gray-100 text-gray-700 border-gray-300" },
  valid: { label: "Valid", className: "bg-green-100 text-green-700 border-green-300" },
  expiring_soon: { label: "Expiring Soon", className: "bg-amber-100 text-amber-700 border-amber-300" },
  due_today: { label: "Due Today", className: "bg-orange-100 text-orange-700 border-orange-300" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-300" },
};

export function StatusBadge({ status }: { status: DocStatus | string }) {
  const cfg = STATUS_CONFIG[status as DocStatus] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-300" };
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}
