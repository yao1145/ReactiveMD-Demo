import type { Plugin } from 'vite';

const PATH = '/__reactive-md/pdf';
const MAX_HTML_BYTES = 36 * 1024 * 1024;

/** Local printing for the dev server. Production uses the browser print dialog. */
export function pdfExport(): Plugin {
  let printing = false;
  return {
    name: 'reactive-md-demo-pdf',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== PATH) return next();
        response.setHeader('Cache-Control', 'no-store');
        const fail = (status: number, message: string) => {
          response.statusCode = status;
          response.setHeader('Content-Type', 'text/plain; charset=utf-8');
          response.end(message);
        };
        if (request.method !== 'POST') return fail(405, 'Use POST to export a PDF.');
        if (request.headers.origin !== `http://${request.headers.host}`
          || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')
          || request.headers['content-type'] !== 'text/html; charset=utf-8') {
          return fail(403, 'Open the local ReactiveMD Demo to export a PDF.');
        }
        if (printing) return fail(429, 'A PDF is already being exported.');
        printing = true;
        try {
          if (Number(request.headers['content-length']) > MAX_HTML_BYTES) return fail(413, 'The document exceeds the PDF size limit.');
          const chunks: Buffer[] = [];
          let bytes = 0;
          for await (const chunk of request.iterator({ destroyOnReturn: false })) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            bytes += buffer.byteLength;
            if (bytes > MAX_HTML_BYTES) return fail(413, 'The document exceeds the PDF size limit.');
            chunks.push(buffer);
          }
          const html = Buffer.concat(chunks).toString('utf8');
          if (!html.startsWith('<!doctype html>')) return fail(400, 'A static HTML document is required.');
          const { renderLocalPdf } = await import('reactive-md/pdf');
          const pdf = await renderLocalPdf(html, { strict: true });
          response.setHeader('Content-Type', 'application/pdf');
          response.setHeader('X-Content-Type-Options', 'nosniff');
          response.end(Buffer.from(pdf));
        } catch (error) {
          fail(500, error instanceof Error ? error.message : String(error));
        } finally {
          printing = false;
        }
      });
    },
  };
}
