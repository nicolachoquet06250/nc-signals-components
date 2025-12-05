// SSR utilities to extract <head> content from rendered app HTML
// and provide data (title, extra head tags) for the server shell.

/**
 * Remove SSR marker comments like <!--s...--> and <!--e...-->
 * and any HTML comments, to get clean text (e.g., inside <title> or <style>).
 */
export function stripSsrMarkers(s: string): string {
  if (!s) return '';
  return s.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Extract a potential <head>...</head> block from html and build:
 * - title: taken from <title> (markers stripped) or defaultTitle
 * - headExtra: concatenation of <meta|link|base> and cleaned <style>
 * - htmlWithoutHead: html with that <head> block removed
 *
 * Supported tags mirrored with CSR sync: title, meta, link, base, style
 */
export function extractHeadFromHtml(html: string, defaultTitle = ''): { htmlWithoutHead: string, title: string, headExtra: string } {
  let htmlWithoutHead = html;
  let title = defaultTitle;
  let headExtra = '';

  try {
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headMatch) {
      const headInner = headMatch[1];

      // Title
      const tMatch = headInner.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (tMatch) {
        const raw = stripSsrMarkers(tMatch[1]).trim();
        if (raw) title = raw;
      }

      // Collect meta/link/base (self-closing/simple tags)
      const tags = [];
      const simpleRe = /<(meta|link|base)\b[\s\S]*?>/gi;
      let m;
      while ((m = simpleRe.exec(headInner)) !== null) {
        tags.push(m[0]);
      }

      // Collect <style>...</style> with internal markers cleaned
      const styleRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
      let sm;
      while ((sm = styleRe.exec(headInner)) !== null) {
        const attrs = sm[1] || '';
        const body = stripSsrMarkers(sm[2] || '');
        tags.push(`<style${attrs}>${body}</style>`);
      }

      if (tags.length) headExtra = tags.join('\n');

      // Remove the app's <head> from body HTML to avoid nested <head>
      htmlWithoutHead = html.replace(headMatch[0], '');
    }
  } catch {
    // ignore parsing errors; fall back to defaults
  }

  return { htmlWithoutHead, title, headExtra };
}
