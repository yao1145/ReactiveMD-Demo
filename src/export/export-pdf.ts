import { prepareLocalPrintHtml, waitForLocalPrintImages } from 'reactive-md/export';

/** Raised when printing would produce a document with missing images. */
export class PrintImageError extends Error {
  readonly images: readonly string[];

  constructor(images: readonly string[]) {
    super(
      `Printing stopped because these images could not be decoded: ${images.join(', ')}. `
      + 'Replace or remove them, then try again.',
    );
    this.name = 'PrintImageError';
    this.images = images;
  }
}

/** Ask the local Vite server to print the prepared static output. */
export async function createDemoPdf(html: string): Promise<Blob> {
  const response = await fetch('/__reactive-md/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html,
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.headers.get('content-type') !== 'application/pdf') {
    throw new Error('The PDF renderer returned an unexpected response.');
  }
  return response.blob();
}

/**
 * Print the same static output on a browser-only deployment. The iframe gets no
 * script capability, and a failed image decode stops the print instead of
 * producing a document that silently lacks images. Resolving means the print
 * interaction finished; saving the PDF happens in the browser print dialog, so
 * the export trace reports `printed` rather than a completed download.
 */
export async function printStaticHtml(html: string, isCurrent: () => boolean): Promise<void> {
  if (!isCurrent()) return;
  const frame = document.createElement('iframe');
  frame.title = 'PDF';
  frame.setAttribute('aria-hidden', 'true');
  // Same-origin lets this page inspect decode results; without `allow-scripts`
  // the document still cannot execute anything.
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:100vh;border:0';
  frame.srcdoc = prepareLocalPrintHtml(html);
  const loaded = new Promise<void>((resolve) => frame.addEventListener('load', () => resolve(), { once: true }));
  document.body.append(frame);
  try {
    await loaded;
    const view = frame.contentWindow;
    const printed = frame.contentDocument;
    if (!view || !printed) throw new Error('The browser could not open the print preview.');
    const broken = await waitForLocalPrintImages(printed);
    if (!isCurrent()) {
      frame.remove();
      return;
    }
    // A missing image must fail loudly: printing a page with blank slots looks
    // successful while the saved PDF is wrong.
    if (broken.length > 0) throw new PrintImageError(broken);
    view.addEventListener('afterprint', () => frame.remove(), { once: true });
    view.focus();
    view.print();
  } catch (error) {
    frame.remove();
    throw error;
  }
}
