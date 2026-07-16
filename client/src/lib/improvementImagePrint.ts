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

const PRINT_FRAME_ATTRIBUTE = "data-improvement-print-frame";
const PRINT_FRAME_CLEANUP_TIMEOUT_MS = 120_000;

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
  </body>
</html>`;
}

export function printImprovementImage(image: { src: string; title: string }) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(PRINT_FRAME_ATTRIBUTE, "true");
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "改善事例の印刷用フレーム";
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = printWindow?.document;
  if (!printWindow || !printDocument || typeof printWindow.print !== "function") {
    iframe.remove();
    return false;
  }

  let cleanupTimer: number | undefined;
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
    iframe.remove();
  };

  try {
    printDocument.open();
    printDocument.write(createImprovementPrintDocument(image));
    printDocument.close();

    const printImage = printDocument.getElementById("improvement-print-image") as HTMLImageElement | null;
    if (!printImage) {
      cleanup();
      return false;
    }

    const startPrint = () => {
      try {
        printWindow.addEventListener("afterprint", cleanup, { once: true });
        cleanupTimer = window.setTimeout(cleanup, PRINT_FRAME_CLEANUP_TIMEOUT_MS);
        printWindow.focus();
        printWindow.print();
      } catch {
        cleanup();
      }
    };

    if (printImage.complete) {
      if (printImage.naturalWidth > 0) {
        window.setTimeout(startPrint, 0);
      } else {
        cleanup();
        return false;
      }
    } else {
      printImage.addEventListener("load", startPrint, { once: true });
      printImage.addEventListener("error", cleanup, { once: true });
    }

    return true;
  } catch {
    cleanup();
    return false;
  }
}
