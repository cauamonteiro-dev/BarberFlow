import { useLayoutEffect, useRef } from "react";

// Keep native table semantics on desktop and expose the same column labels in
// each mobile card. Derived labels also cover tables with dynamic columns.
export default function ResponsiveTable({ children, ...props }) {
  const table = useRef(null);
  useLayoutEffect(() => {
    const headings = [...table.current.querySelectorAll("thead th")].map(
      (cell) => cell.textContent.trim(),
    );
    for (const row of table.current.tBodies[0]?.rows || []) {
      [...row.cells].forEach((cell, index) => {
        cell.dataset.label = headings[index] || "Ações";
        cell.dataset.empty =
          !cell.textContent.trim() &&
          !cell.querySelector("button,input,select,a");
      });
    }
  });
  return (
    <table ref={table} {...props}>
      {children}
    </table>
  );
}
