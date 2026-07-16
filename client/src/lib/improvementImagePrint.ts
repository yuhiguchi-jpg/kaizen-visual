export const IMPROVEMENT_PRINT_PAGE_STYLE = `
  @page {
    size: A4 landscape;
    margin: 0;
  }

  html,
  body {
    width: 297mm;
    height: 210mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #ffffff;
  }

  body {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    display: block;
    max-width: 297mm;
    max-height: 210mm;
    width: auto;
    height: auto;
    object-fit: contain;
  }
`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createImprovementPrintDocument(image: { src: string; title: string }) {
  const src = escapeHtml(image.src);
  const title = escapeHtml(image.title);

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${IMPROVEMENT_PRINT_PAGE_STYLE}</style>
  </head>
  <body>
    <img id="improvement-print-image" src="${src}" alt="${title}の改善事例" />
    <script>
      const image = document.getElementById("improvement-print-image");
      image.addEventListener("load", () => {
        window.focus();
        window.print();
      });
      image.addEventListener("error", () => window.close());
      window.addEventListener("afterprint", () => window.close());
    </script>
  </body>
</html>`;
}

export function printImprovementImage(image: { src: string; title: string }) {
  const printWindow = window.open("", "_blank", "popup,width=1200,height=850");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(createImprovementPrintDocument(image));
  printWindow.document.close();
  return true;
}
