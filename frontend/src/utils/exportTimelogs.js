import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function downloadTimelogsPDF(logs, { title = 'Time Logs Report', subtitle = '' } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  // Header block
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, marginX, 13);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle, marginX, 21);
  }

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}`, pageWidth - marginX, 21, { align: 'right' });

  // Summary row
  const totalHours = logs.reduce((sum, l) => sum + (Number(l.total_hours) || 0), 0);
  const totalOvertime = logs.reduce((sum, l) => sum + (Number(l.overtime_hours) || 0), 0);
  const disputed = logs.filter(l => Number(l.is_disputed) === 1).length;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const summaryY = 36;
  doc.text(`Total Records: ${logs.length}`, marginX, summaryY);
  doc.text(`Total Hours: ${totalHours}h`, marginX + 50, summaryY);
  doc.text(`Overtime: ${totalOvertime}h`, marginX + 100, summaryY);
  if (disputed > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Disputed: ${disputed}`, marginX + 145, summaryY);
  }

  // Table
  const hasInternCol = logs.some(l => l.intern_name);

  const head = hasInternCol
    ? [['Intern', 'Date', 'Time In', 'Time Out', 'Hours', 'Overtime', 'Status']]
    : [['Date', 'Time In', 'Time Out', 'Hours', 'Overtime', 'Status']];

  const body = logs.map(l => {
    const isDisputed = Number(l.is_disputed) === 1;
    const status = isDisputed ? 'DISPUTED' : (l.time_out ? 'Complete' : 'In Progress');
    const row = hasInternCol
      ? [l.intern_name || '—', l.date, formatTime(l.time_in), formatTime(l.time_out), `${l.total_hours ?? 0}h`, `${l.overtime_hours ?? 0}h`, status]
      : [l.date, formatTime(l.time_in), formatTime(l.time_out), `${l.total_hours ?? 0}h`, `${l.overtime_hours ?? 0}h`, status];
    return { data: row, disputed: isDisputed };
  });

  autoTable(doc, {
    startY: summaryY + 6,
    head,
    body: body.map(r => r.data),
    styles: { fontSize: 8.5, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.section === 'body') {
        const row = body[data.row.index];
        if (row?.disputed) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'italic';
        }
        // Strike-through effect on hours column for disputed rows
        const hoursColIdx = hasInternCol ? 4 : 3;
        if (row?.disputed && data.column.index === hoursColIdx) {
          data.cell.styles.textDecoration = 'linethrough';
        }
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}  •  LGU OJT Monitoring System`, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
  }

  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export function downloadTimelogsCSV(logs, filename = 'timelogs.csv') {
  const hasInternCol = logs.some(l => l.intern_name);

  const headers = hasInternCol
    ? ['Intern', 'Date', 'Time In', 'Time Out', 'Total Hours', 'Overtime Hours', 'Status', 'Disputed']
    : ['Date', 'Time In', 'Time Out', 'Total Hours', 'Overtime Hours', 'Status', 'Disputed'];

  const rows = logs.map(l => {
    const isDisputed = Number(l.is_disputed) === 1;
    const status = isDisputed ? 'Disputed' : (l.time_out ? 'Complete' : 'In Progress');
    return hasInternCol
      ? [l.intern_name ?? '', l.date, formatTime(l.time_in), formatTime(l.time_out), l.total_hours ?? 0, l.overtime_hours ?? 0, status, isDisputed ? 'Yes' : 'No']
      : [l.date, formatTime(l.time_in), formatTime(l.time_out), l.total_hours ?? 0, l.overtime_hours ?? 0, status, isDisputed ? 'Yes' : 'No'];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
