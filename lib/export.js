// PDF and Excel export utilities
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportToPDF(data, title, columns) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(56, 189, 248);
  doc.text('InvestIQ', 14, 15);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  
  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 35);
  
  // Table
  const headers = columns.map(c => c.header);
  const rows = data.map(row => columns.map(c => {
    const val = row[c.key];
    if (typeof val === 'number') return val.toFixed(c.decimals || 2);
    return val || '-';
  }));
  
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 42,
    theme: 'grid',
    headStyles: { fillColor: [56, 189, 248], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} | InvestIQ Financial Dashboard`, 14, doc.internal.pageSize.height - 10);
  }
  
  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportToExcel(data, title, columns) {
  const headers = columns.map(c => c.header);
  const rows = data.map(row => {
    const obj = {};
    columns.forEach(c => {
      obj[c.header] = row[c.key] || '-';
    });
    return obj;
  });
  
  const ws = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length + 4, 15) }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportNewsToExcel(newsItems) {
  const columns = [
    { header: 'Date', key: 'publishedAt' },
    { header: 'Source', key: 'source' },
    { header: 'Title', key: 'title' },
    { header: 'URL', key: 'url' },
    { header: 'Related', key: 'related' },
  ];
  exportToExcel(newsItems.map(n => ({
    ...n,
    publishedAt: new Date(n.publishedAt || n.savedAt).toLocaleString(),
    related: n.symbols?.join(', ') || n.sectors?.join(', ') || '-',
  })), 'News_Updates', columns);
}

export function exportNewsToPDF(newsItems) {
  const columns = [
    { header: 'Date', key: 'publishedAt' },
    { header: 'Source', key: 'source' },
    { header: 'Title', key: 'title' },
  ];
  exportToPDF(newsItems.map(n => ({
    ...n,
    publishedAt: new Date(n.publishedAt || n.savedAt).toLocaleString(),
  })), 'News_Updates', columns);
}
