const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

// One data set, two layouts: a real table from md up, and touch-friendly cards on phones.
export default function DataTable({ columns, rows, getKey, renderCard }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60 text-xs uppercase tracking-wide text-muted">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${ALIGN[c.align ?? "left"]}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={getKey(row)} className="hover:bg-subtle/50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${ALIGN[c.align ?? "left"]} ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getKey(row)}>{renderCard(row)}</li>
        ))}
      </ul>
    </>
  );
}
