import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  align?: "left" | "right";
  /** Hide this column in the phone card view (e.g. a thumbnail already shown in the card title). */
  hideOnPhone?: boolean;
  /** The column whose value becomes the card's title on phones. */
  primary?: boolean;
}

/**
 * Table on tablet and up; on phones every row becomes a card with the same fields (DESIGN.md §5).
 * Numbers are right-aligned and use tabular figures. The empty state is passed in by the page.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  dense = false,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption: string;
  empty: ReactNode;
  dense?: boolean;
}) {
  if (rows.length === 0) return <div className="card-surface">{empty}</div>;
  const primary = columns.find((c) => c.primary) ?? columns[0];

  return (
    <>
      <div className="hidden overflow-x-auto card-surface md:block">
        <table className="w-full border-collapse type-small">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cx("h-control px-4 type-caption text-fg-muted", c.align === "right" ? "text-right" : "text-left")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-border transition-colors duration-150 hover:bg-surface-2">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx("px-4", dense ? "h-control" : "h-control-lg", c.align === "right" ? "text-right tabular" : "text-left")}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="card-surface p-4">
            <div className="mb-3 type-body font-bold">{primary.render(row)}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {columns
                .filter((c) => c !== primary && !c.hideOnPhone)
                .map((c) => (
                  <div key={c.key} className="flex min-w-0 flex-col gap-1">
                    <dt className="type-caption text-fg-muted">{c.header}</dt>
                    <dd className={cx("type-small", c.align === "right" && "tabular")}>{c.render(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
