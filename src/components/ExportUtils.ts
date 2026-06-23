// Вспомогательные утилиты для экспорта данных в CSV, Excel (CSV с точкой с запятой и BOM) и PDF (печать)

export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
  // Добавляем BOM (\uFEFF) для корректного отображения кириллицы в Excel
  let csvContent = '\uFEFF';
  
  // Добавляем заголовки
  csvContent += headers.join(';') + '\n';
  
  // Добавляем строки
  rows.forEach(row => {
    const cleanRow = row.map(val => {
      if (val === null || val === undefined) return '';
      // Экранируем кавычки и заменяем точки с запятой
      const strVal = String(val).replace(/"/g, '""');
      return strVal.includes(';') ? `"${strVal}"` : strVal;
    });
    csvContent += cleanRow.join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(filename: string, headers: string[], rows: any[][]) {
  // В формате MVP, CSV с разделителем ";" и UTF-8 BOM распознается Excel автоматически как таблица.
  exportToCSV(filename, headers, rows);
}

export function exportToPDF(title: string, headers: string[], rows: any[][]) {
  // Создаем временное окно или фрейм для печати
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Пожалуйста, разрешите всплывающие окна для печати отчетов.');
    return;
  }

  const htmlHeaders = headers.map(h => `<th style="border: 1px solid #ddd; padding: 10px; background-color: #f2f2f2; text-align: left;">${h}</th>`).join('');
  const htmlRows = rows.map(row => {
    const cells = row.map(cell => `<td style="border: 1px solid #ddd; padding: 10px;">${cell === null || cell === undefined ? '' : cell}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Inter', sans-serif; margin: 40px; color: #333; }
          h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p style="font-size: 14px; color: #555;">Дата выгрузки: ${new Date().toLocaleString('ru-RU')}</p>
        <table>
          <thead>
            <tr>${htmlHeaders}</tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
        <div class="footer">
          <p>Система учета канцелярских товаров</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
