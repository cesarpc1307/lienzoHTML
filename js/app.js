/* ============================================
   VISOR HTML
   Application Logic
   ============================================
   Arquitectura: una sola fuente de verdad (el textarea
   #code-editor). La barra de herramientas manipula ese texto
   directamente (envolviendo la selección con etiquetas HTML),
   por lo que el HTML nunca se reescribe ni reorganiza a tus
   espaldas: lo que ves en el editor es exactamente lo que se
   previsualiza.
   ============================================ */

(function () {
  'use strict';

  // ========================================
  //  DOM REFERENCES
  // ========================================
  const codeEditor      = document.getElementById('code-editor');
  const previewFrame    = document.getElementById('preview-frame');
  const deviceContainer = document.getElementById('device-container');
  const deviceLabel     = document.getElementById('device-label');
  const btnPC           = document.getElementById('btn-pc');
  const btnMobile       = document.getElementById('btn-mobile');

  const btnCopy      = document.getElementById('btn-copy');
  const btnClearAll  = document.getElementById('btn-clear-all');
  const btnBeautify  = document.getElementById('btn-beautify');
  const btnClean     = document.getElementById('btn-clean');
  const selHeading   = document.getElementById('sel-heading');
  const btnBold      = document.getElementById('btn-bold');
  const btnItalic    = document.getElementById('btn-italic');
  const btnUnderline = document.getElementById('btn-underline');
  const btnStrike    = document.getElementById('btn-strike');
  const btnUl        = document.getElementById('btn-ul');
  const btnOl        = document.getElementById('btn-ol');
  const btnLink      = document.getElementById('btn-link');
  const btnTable     = document.getElementById('btn-table');
  const btnTableRow  = document.getElementById('btn-table-row');

  const modalTable  = document.getElementById('modal-table');
  const modalLink   = document.getElementById('modal-link');

  // Preset color palette (24 colors covering neutrals + a full hue wheel)
  const PALETTE = [
    '#000000', '#1e293b', '#475569', '#64748b', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78350f'
  ];

  const HEX_RE = /^#[0-9a-fA-F]{6}$/;

  // ========================================
  //  STARTER CONTENT (fácil de borrar con "Limpiar todo")
  // ========================================
  const STARTER_HTML =
`<h1>Bienvenido al Visor HTML</h1>
<p>Escribe o pega tu código HTML aquí. Selecciona texto y usa la barra de
herramientas para aplicar <strong>negrita</strong>, <em>cursiva</em> o
<span style="color: #6366f1;">color</span>.</p>
<ul>
  <li>Lo que escribes es exactamente lo que se previsualiza.</li>
  <li>Puedes pegar una página completa (con &lt;html&gt;, &lt;head&gt; y
  estilos propios) y se respetará tal cual.</li>
</ul>`;

  // ========================================
  //  SELECTION / TEXT HELPERS
  // ========================================
  // Al reasignar .value, algunos navegadores mueven momentáneamente el
  // cursor/scroll del textarea. Por eso forzamos la posición correcta y
  // el scroll hasta la línea editada en el siguiente frame, así el editor
  // se queda mirando justo donde estabas trabajando en vez de saltar al final.
  function scrollCaretIntoView(pos) {
    const style = window.getComputedStyle(codeEditor);
    let lineHeight = parseFloat(style.lineHeight);
    if (!lineHeight || isNaN(lineHeight)) {
      lineHeight = (parseFloat(style.fontSize) || 13) * 1.65;
    }
    const before = codeEditor.value.slice(0, pos);
    const lineIndex = before.split('\n').length - 1;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const caretTop = paddingTop + lineIndex * lineHeight;
    const visible = codeEditor.clientHeight;
    let target = caretTop - visible / 2;
    const maxScroll = codeEditor.scrollHeight - codeEditor.clientHeight;
    if (target < 0) target = 0;
    if (target > maxScroll) target = Math.max(0, maxScroll);
    codeEditor.scrollTop = target;
  }

  function focusAndSelect(cs, ce) {
    requestAnimationFrame(function () {
      codeEditor.focus();
      codeEditor.setSelectionRange(cs, ce);
      scrollCaretIntoView(cs);
    });
  }

  function replaceRange(start, end, newText, cursorStart, cursorEnd) {
    const before = codeEditor.value.slice(0, start);
    const after = codeEditor.value.slice(end);
    codeEditor.value = before + newText + after;
    const cs = start + (cursorStart != null ? cursorStart : newText.length);
    const ce = start + (cursorEnd != null ? cursorEnd : (cursorStart != null ? cursorStart : newText.length));
    focusAndSelect(cs, ce);
    syncPreview();
  }

  function wrapSelection(openTag, closeTag) {
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const inner = codeEditor.value.slice(start, end);
    const newText = openTag + inner + closeTag;
    replaceRange(start, end, newText, openTag.length, openTag.length + inner.length);
  }

  function insertAtCursor(text) {
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    replaceRange(start, end, text, text.length, text.length);
  }

  function getCurrentLineRange() {
    const val = codeEditor.value;
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = val.length;
    return { lineStart, lineEnd };
  }

  // ========================================
  //  HTML FORMATTER / BEAUTIFIER (solo bajo demanda)
  // ========================================
  function formatHTML(html) {
    if (!html || html.trim() === '') return '';

    let clean = html.replace(/>\s+</g, '><').trim();

    let formatted = '';
    let indent = 0;
    const tab = '  ';

    const reg = /(<[^>]+>)/g;
    const parts = clean.split(reg).filter(Boolean);

    const parentContainerTags = new Set([
      'html', 'head', 'body', 'div', 'section', 'article', 'ul', 'ol',
      'table', 'thead', 'tbody', 'tr', 'blockquote', 'main', 'header', 'footer', 'nav'
    ]);

    const blockTextTags = new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'th', 'td', 'dt', 'dd', 'title', 'style', 'script'
    ]);

    const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

    parts.forEach(function (part) {
      if (part.startsWith('<!')) {
        formatted += (formatted ? '\n' : '') + part;
        return;
      }
      if (part.startsWith('</')) {
        const tag = (part.match(/^<\/([\w-]+)/) || [])[1];
        const tagLower = tag ? tag.toLowerCase() : '';
        if (parentContainerTags.has(tagLower)) {
          indent = Math.max(0, indent - 1);
          formatted += '\n' + tab.repeat(indent) + part;
        } else {
          formatted += part;
        }
      } else if (part.startsWith('<')) {
        const tag = (part.match(/^<([\w-]+)/) || [])[1];
        const tagLower = tag ? tag.toLowerCase() : '';
        const isSelfClosing = part.endsWith('/>') || voidTags.has(tagLower);

        if (parentContainerTags.has(tagLower)) {
          if (formatted && !formatted.endsWith('\n')) formatted += '\n';
          formatted += tab.repeat(indent) + part;
          if (!isSelfClosing) indent++;
        } else if (blockTextTags.has(tagLower)) {
          if (formatted && !formatted.endsWith('\n')) formatted += '\n';
          formatted += tab.repeat(indent) + part;
        } else {
          formatted += part;
        }
      } else {
        formatted += part;
      }
    });

    return formatted.trim();
  }

  // ========================================
  //  PREVIEW
  // ========================================
  // Estilos mínimos: solo un reset de box-sizing y un fallback de
  // tipografía. No forzamos márgenes, colores ni tamaños de encabezado,
  // para no pisar el diseño que ya trae tu HTML.
  const MINIMAL_PREVIEW_CSS =
    '<style>*,*::before,*::after{box-sizing:border-box;}' +
    'body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;}' +
    'img,video{max-width:100%;height:auto;}</style>';

  function isFullDocument(html) {
    return /<!doctype/i.test(html) || /<html[\s>]/i.test(html);
  }

  function buildPreviewDocument(html) {
    if (!html || !html.trim()) {
      return '<!DOCTYPE html><html><head><meta charset="UTF-8">' + MINIMAL_PREVIEW_CSS + '</head><body></body></html>';
    }
    if (isFullDocument(html)) {
      // Documento completo pegado por el usuario: se respeta tal cual,
      // sin envolver ni inyectar estilos adicionales.
      return html;
    }
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' + MINIMAL_PREVIEW_CSS + '</head><body>' + html + '</body></html>';
  }

  let debounceTimer = null;
  function syncPreview() {
    // srcdoc es más seguro y estable que document.write + contentDocument
    previewFrame.srcdoc = buildPreviewDocument(codeEditor.value);
  }

  function scheduleSyncPreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncPreview, 150);
  }

  // ========================================
  //  CLEAR ALL  (punto 1: ahora funciona de forma directa y aislada)
  // ========================================
  function clearAll() {
    if (!confirm('¿Estás seguro de que deseas borrar todo el contenido? Esta acción no se puede deshacer.')) {
      return;
    }
    codeEditor.value = '';
    syncPreview();
    codeEditor.focus();
  }

  // ========================================
  //  COPY HTML
  // ========================================
  function showCopied() {
    btnCopy.classList.add('copied');
    btnCopy.textContent = '✅ Copiado';
    setTimeout(function () {
      btnCopy.classList.remove('copied');
      btnCopy.textContent = '📋 Copiar';
    }, 2000);
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
    cb();
  }

  function copyHTML() {
    const text = codeEditor.value;
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopied).catch(function () {
        fallbackCopy(text, showCopied);
      });
    } else {
      fallbackCopy(text, showCopied);
    }
  }

  // ========================================
  //  HEADINGS / BLOCK FORMAT
  // ========================================
  selHeading.addEventListener('change', function () {
    const tag = selHeading.value;
    if (!tag) return;

    let start = codeEditor.selectionStart;
    let end = codeEditor.selectionEnd;
    if (start === end) {
      const range = getCurrentLineRange();
      start = range.lineStart;
      end = range.lineEnd;
    }

    const original = codeEditor.value.slice(start, end);
    const match = original.trim().match(/^<(h[1-6]|p)>([\s\S]*)<\/\1>$/i);
    const inner = match ? match[2] : original.trim();
    const newText = '<' + tag + '>' + inner + '</' + tag + '>';

    replaceRange(start, end, newText, newText.length, newText.length);
    selHeading.selectedIndex = 0;
  });

  // ========================================
  //  INLINE FORMATTING
  // ========================================
  btnBold.addEventListener('click', function () { wrapSelection('<strong>', '</strong>'); });
  btnItalic.addEventListener('click', function () { wrapSelection('<em>', '</em>'); });
  btnUnderline.addEventListener('click', function () { wrapSelection('<u>', '</u>'); });
  btnStrike.addEventListener('click', function () { wrapSelection('<s>', '</s>'); });

  // ========================================
  //  LISTS
  // ========================================
  function applyList(ordered) {
    let start = codeEditor.selectionStart;
    let end = codeEditor.selectionEnd;
    if (start === end) {
      const range = getCurrentLineRange();
      start = range.lineStart;
      end = range.lineEnd;
    }
    const original = codeEditor.value.slice(start, end);
    const lines = original.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    const source = lines.length ? lines : [''];
    const items = source.map(function (l) {
      return '  <li>' + l.replace(/^<li>/i, '').replace(/<\/li>$/i, '') + '</li>';
    }).join('\n');
    const tag = ordered ? 'ol' : 'ul';
    const newText = '<' + tag + '>\n' + items + '\n</' + tag + '>';
    replaceRange(start, end, newText, newText.length, newText.length);
  }

  btnUl.addEventListener('click', function () { applyList(false); });
  btnOl.addEventListener('click', function () { applyList(true); });

  // ========================================
  //  CLEAN FORMATTING (quitar etiquetas de la selección)
  // ========================================
  function stripSelectionFormatting() {
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    if (start === end) {
      alert('Selecciona primero el texto del que deseas quitar el formato.');
      return;
    }
    const value = codeEditor.value;
    let before = value.slice(0, start);
    let inner = value.slice(start, end);
    let after = value.slice(end);

    // Capa por capa: si lo que seleccionaste está justo envuelto por una
    // etiqueta (aunque no hayas incluido la etiqueta en tu selección),
    // se detecta y también se quita. Por ejemplo, seleccionar solo "hola"
    // dentro de <strong>hola</strong> ahora sí le quita la negrita.
    let changed = true;
    while (changed) {
      changed = false;
      const openMatch = before.match(/<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>$/);
      if (openMatch) {
        const closeRe = new RegExp('^</' + openMatch[1] + '>', 'i');
        const closeMatch = after.match(closeRe);
        if (closeMatch) {
          before = before.slice(0, before.length - openMatch[0].length);
          after = after.slice(closeMatch[0].length);
          changed = true;
        }
      }
    }

    // Además, quita cualquier etiqueta que haya quedado dentro de la selección.
    const stripped = inner.replace(/<[^>]+>/g, '');

    codeEditor.value = before + stripped + after;
    const finalStart = before.length;
    const finalEnd = finalStart + stripped.length;
    focusAndSelect(finalStart, finalEnd);
    syncPreview();
  }

  btnClean.addEventListener('click', stripSelectionFormatting);

  // ========================================
  //  BEAUTIFY (indentar, solo si el usuario lo pide)
  // ========================================
  btnBeautify.addEventListener('click', function () {
    codeEditor.value = formatHTML(codeEditor.value);
    syncPreview();
  });

  // ========================================
  //  COLOR POPOVERS  (punto 6: selector nativo + paleta + hex)
  // ========================================
  function buildSwatches(container, onPick) {
    container.innerHTML = '';
    PALETTE.forEach(function (hex) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'color-swatch';
      sw.style.backgroundColor = hex;
      sw.title = hex;
      sw.setAttribute('aria-label', 'Color ' + hex);
      sw.addEventListener('click', function () { onPick(hex); });
      container.appendChild(sw);
    });
  }

  function closeAllPopovers() {
    document.querySelectorAll('.color-popover').forEach(function (p) { p.hidden = true; });
  }

  function setupColorTool(opts) {
    const btn = document.getElementById(opts.btnId);
    const popover = document.getElementById(opts.popoverId);
    const picker = document.getElementById(opts.pickerId);
    const hexInput = document.getElementById(opts.hexId);
    const swatches = document.getElementById(opts.swatchesId);
    const applyBtn = document.getElementById(opts.applyId);
    const removeBtn = document.getElementById(opts.removeId);

    buildSwatches(swatches, function (hex) {
      picker.value = hex;
      hexInput.value = hex;
    });

    picker.addEventListener('input', function () { hexInput.value = picker.value; });
    hexInput.addEventListener('input', function () {
      if (HEX_RE.test(hexInput.value)) picker.value = hexInput.value;
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const willOpen = popover.hidden;
      closeAllPopovers();
      popover.hidden = !willOpen;
    });

    popover.addEventListener('click', function (e) { e.stopPropagation(); });

    applyBtn.addEventListener('click', function () {
      const hex = HEX_RE.test(hexInput.value) ? hexInput.value : picker.value;
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      const text = codeEditor.value.slice(start, end);
      if (!text) {
        alert('Selecciona primero el texto al que deseas aplicar el color.');
        return;
      }
      const newText = '<span style="' + opts.cssProp + ': ' + hex + ';">' + text + '</span>';
      replaceRange(start, end, newText, newText.length, newText.length);
      popover.hidden = true;
    });

    removeBtn.addEventListener('click', function () {
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      let text = codeEditor.value.slice(start, end);
      if (!text) { popover.hidden = true; return; }
      const re = new RegExp('<span style="\\s*' + opts.cssProp + '\\s*:[^;"]*;?\\s*">([\\s\\S]*?)<\\/span>', 'gi');
      text = text.replace(re, '$1');
      replaceRange(start, end, text, text.length, text.length);
      popover.hidden = true;
    });
  }

  setupColorTool({
    btnId: 'btn-text-color', popoverId: 'popover-text-color',
    pickerId: 'picker-text-color', hexId: 'hex-text-color',
    swatchesId: 'swatches-text-color', applyId: 'btn-apply-text-color',
    removeId: 'btn-remove-text-color', cssProp: 'color'
  });

  setupColorTool({
    btnId: 'btn-bg-color', popoverId: 'popover-bg-color',
    pickerId: 'picker-bg-color', hexId: 'hex-bg-color',
    swatchesId: 'swatches-bg-color', applyId: 'btn-apply-bg-color',
    removeId: 'btn-remove-bg-color', cssProp: 'background-color'
  });

  document.addEventListener('click', closeAllPopovers);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllPopovers();
  });

  // ========================================
  //  MODALS (genérico)
  // ========================================
  function openModal(modalEl) { modalEl.hidden = false; }
  function closeModal(modalEl) { modalEl.hidden = true; }

  [modalTable, modalLink].forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(modalTable); closeModal(modalLink); }
  });

  // ========================================
  //  TABLE INSERT  (punto 5: filas/columnas configurables)
  // ========================================
  function buildTableHTML(dataRows, cols, withHeader) {
    let html = '<table>\n';
    if (withHeader) {
      html += '  <thead>\n    <tr>\n';
      for (let c = 0; c < cols; c++) html += '      <th>Encabezado ' + (c + 1) + '</th>\n';
      html += '    </tr>\n  </thead>\n';
    }
    html += '  <tbody>\n';
    for (let r = 0; r < dataRows; r++) {
      html += '    <tr>\n';
      for (let c = 0; c < cols; c++) html += '      <td>Celda</td>\n';
      html += '    </tr>\n';
    }
    html += '  </tbody>\n</table>';
    return html;
  }

  btnTable.addEventListener('click', function () {
    openModal(modalTable);
    document.getElementById('input-rows').focus();
  });
  document.getElementById('btn-table-cancel').addEventListener('click', function () { closeModal(modalTable); });

  document.getElementById('btn-table-insert').addEventListener('click', function () {
    const rows = Math.max(1, Math.min(50, parseInt(document.getElementById('input-rows').value, 10) || 1));
    const cols = Math.max(1, Math.min(20, parseInt(document.getElementById('input-cols').value, 10) || 1));
    const withHeader = document.getElementById('input-header').checked;
    insertAtCursor(buildTableHTML(rows, cols, withHeader) + '\n');
    closeModal(modalTable);
  });

  // ========================================
  //  ADD ROW TO NEAREST TABLE  (punto 5: añadir fila sin rehacer la tabla)
  // ========================================
  btnTableRow.addEventListener('click', function () {
    const val = codeEditor.value;
    const pos = codeEditor.selectionStart;

    let closeIdx = val.indexOf('</table>', pos);
    if (closeIdx === -1) {
      const lastOpen = val.lastIndexOf('<table', pos);
      if (lastOpen === -1) {
        alert('No se encontró ninguna tabla cerca del cursor. Inserta una tabla primero con el botón "Tabla".');
        return;
      }
      closeIdx = val.indexOf('</table>', lastOpen);
      if (closeIdx === -1) {
        alert('No se encontró la etiqueta de cierre </table> de esa tabla.');
        return;
      }
    }

    const openIdx = val.lastIndexOf('<table', closeIdx);
    if (openIdx === -1) {
      alert('No se encontró la apertura <table> correspondiente.');
      return;
    }

    const tableChunk = val.slice(openIdx, closeIdx);
    const trMatch = tableChunk.match(/<tr[\s\S]*?<\/tr>/i);
    let cols = 3;
    if (trMatch) {
      const cellMatches = trMatch[0].match(/<t[dh][\s>]/gi);
      if (cellMatches && cellMatches.length) cols = cellMatches.length;
    }

    let newRow = '    <tr>\n';
    for (let c = 0; c < cols; c++) newRow += '      <td>Celda</td>\n';
    newRow += '    </tr>\n  ';

    replaceRange(closeIdx, closeIdx, newRow, newRow.length, newRow.length);
  });

  // ========================================
  //  LINK INSERT (con saneado básico de la URL)
  // ========================================
  btnLink.addEventListener('click', function () {
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const selected = codeEditor.value.slice(start, end);
    document.getElementById('input-link-text').value = selected;
    document.getElementById('input-link-text').disabled = !!selected;
    openModal(modalLink);
    document.getElementById('input-link-url').focus();
  });
  document.getElementById('btn-link-cancel').addEventListener('click', function () {
    closeModal(modalLink);
    document.getElementById('input-link-text').disabled = false;
  });

  document.getElementById('btn-link-insert').addEventListener('click', function () {
    let url = document.getElementById('input-link-url').value.trim();
    if (!url) { alert('Ingresa una URL.'); return; }

    // Seguridad: bloquear esquemas peligrosos como javascript: o data:
    if (/^\s*(javascript|data|vbscript):/i.test(url)) {
      alert('Ese tipo de enlace no está permitido por seguridad.');
      return;
    }
    // Si no trae esquema ni es relativo/ancla, asumimos https://
    if (!/^([a-zA-Z][a-zA-Z0-9+.-]*:|\/|#|\.)/.test(url)) {
      url = 'https://' + url;
    }

    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const selected = codeEditor.value.slice(start, end);
    const linkText = selected || document.getElementById('input-link-text').value.trim() || url;
    const safeUrl = url.replace(/"/g, '&quot;');
    const html = '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>';

    replaceRange(start, end, html, html.length, html.length);

    closeModal(modalLink);
    document.getElementById('input-link-url').value = '';
    document.getElementById('input-link-text').value = '';
    document.getElementById('input-link-text').disabled = false;
  });

  // ========================================
  //  KEYBOARD SHORTCUTS + TAB SUPPORT
  // ========================================
  codeEditor.addEventListener('keydown', function (e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') { e.preventDefault(); wrapSelection('<strong>', '</strong>'); return; }
      if (key === 'i') { e.preventDefault(); wrapSelection('<em>', '</em>'); return; }
      if (key === 'u') { e.preventDefault(); wrapSelection('<u>', '</u>'); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
    }
  });

  // ========================================
  //  DEVICE TOGGLE
  // ========================================
  function setDevice(mode) {
    if (mode === 'pc') {
      deviceContainer.className = 'device-container mode-pc';
      deviceLabel.textContent = '💻 PC — 100%';
      btnPC.classList.add('active');
      btnPC.setAttribute('aria-pressed', 'true');
      btnMobile.classList.remove('active');
      btnMobile.setAttribute('aria-pressed', 'false');
    } else {
      deviceContainer.className = 'device-container mode-mobile';
      deviceLabel.textContent = '📱 Móvil — 375 × 667';
      btnMobile.classList.add('active');
      btnMobile.setAttribute('aria-pressed', 'true');
      btnPC.classList.remove('active');
      btnPC.setAttribute('aria-pressed', 'false');
    }
  }

  btnPC.addEventListener('click', function () { setDevice('pc'); });
  btnMobile.addEventListener('click', function () { setDevice('mobile'); });

  // ========================================
  //  GLOBAL EVENT WIRING
  // ========================================
  codeEditor.addEventListener('input', scheduleSyncPreview);
  btnClearAll.addEventListener('click', clearAll);
  btnCopy.addEventListener('click', copyHTML);

  // ========================================
  //  INITIAL STATE
  // ========================================
  codeEditor.value = STARTER_HTML;
  syncPreview();

})();
