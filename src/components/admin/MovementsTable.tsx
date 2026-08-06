import { Badge } from "@/components/ui/badge";
import type { StockMovement, StockMovementType } from "@/lib/queries";
import { useTranslation } from "react-i18next";

export const MOVEMENT_TYPES: StockMovementType[] = ["entry", "sale", "manual", "inventory", "return"];

export function movementBadgeClass(type: StockMovementType) {
  switch (type) {
    case "entry":
    case "return":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300";
    case "sale":
      return "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300";
    case "manual":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300";
    case "inventory":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300";
  }
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function MovementTypeBadge({ type }: { type: StockMovementType }) {
  const { t } = useTranslation(["admin"]);
  return <Badge className={movementBadgeClass(type)}>{t(`admin:movements.types.${type}`)}</Badge>;
}

export function MovementsTable({
  movements,
  productName,
  emptyLabel,
}: {
  movements: StockMovement[];
  productName?: (id: string) => string;
  emptyLabel: string;
}) {
  const { t } = useTranslation(["admin"]);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">{t("admin:movements.table.date")}</th>
            {productName && <th className="p-3">{t("admin:movements.table.product")}</th>}
            <th className="p-3">{t("admin:movements.table.movement")}</th>
            <th className="p-3">{t("admin:movements.table.before")}</th>
            <th className="p-3">{t("admin:movements.table.after")}</th>
            <th className="p-3">{t("admin:movements.table.type")}</th>
            <th className="p-3">{t("admin:movements.table.reference")}</th>
            <th className="p-3">{t("admin:movements.table.admin")}</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDate(m.created_at)}</td>
              {productName && <td className="p-3 font-medium">{productName(m.product_id)}</td>}
              <td className={`p-3 font-bold ${m.change >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {m.change > 0 ? "+" : ""}
                {m.change}
              </td>
              <td className="p-3 text-muted-foreground">{m.stock_before ?? "—"}</td>
              <td className="p-3 font-medium">{m.stock_after ?? "—"}</td>
              <td className="p-3">
                <MovementTypeBadge type={m.movement_type} />
                <span className="ms-2 text-xs text-muted-foreground">{m.reason}</span>
              </td>
              <td className="p-3 text-muted-foreground">{m.reference ?? m.comment ?? "—"}</td>
              <td className="p-3">{m.admin_username ?? "—"}</td>
            </tr>
          ))}
          {movements.length === 0 && (
            <tr>
              <td colSpan={productName ? 8 : 7} className="p-6 text-center text-muted-foreground">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
