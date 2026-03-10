import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, unknown>[],
  columns: { header: string; dataKey: string }[],
  filename: string,
  title: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  doc.autoTable({
    startY: 28,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => String(row[c.dataKey] || ''))),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [41, 98, 255] },
  });

  doc.save(`${filename}.pdf`);
}
