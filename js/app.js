/* ============================================
   LIENZO HTML
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
  const selDevicePreset = document.getElementById('sel-device-preset');

  const panelEditor   = document.getElementById('panel-editor');
  const panelResizer  = document.getElementById('panel-resizer');
  const mainEl        = document.querySelector('main');

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');

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

  const codeHighlight        = document.getElementById('code-highlight');
  const codeHighlightContent = document.getElementById('code-highlight-content');

  const previewCanvas      = document.getElementById('preview-canvas');
  const deviceScaleWrapper = document.getElementById('device-scale-wrapper');
  const zoomBar    = document.getElementById('zoom-bar');
  const zoomSlider = document.getElementById('zoom-slider');
  const zoomValue  = document.getElementById('zoom-value');
  const btnZoomIn  = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomFit = document.getElementById('btn-zoom-fit');

  const STORAGE_PREFIX = 'lienzo-html-';

  // Preset color palette (24 colors covering neutrals + a full hue wheel)
  const PALETTE = [
    '#000000', '#1e293b', '#475569', '#64748b', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78350f'
  ];

  const HEX_RE = /^#[0-9a-fA-F]{6}$/;

  // ========================================
  //  RESALTADO DE SINTAXIS (tipo Sublime/VS Code)
  // ========================================
  // Tokenizador simple, carácter por carácter (no es un parser HTML
  // completo, pero es suficiente para diferenciar visualmente etiquetas,
  // atributos, valores, comentarios y texto). Nunca modifica el HTML
  // real: solo genera una versión coloreada para pintarla detrás del
  // textarea real (ver .code-highlight en el CSS).
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightTag(tag) {
    if (/^<!doctype/i.test(tag)) {
      return '<span class="tok-doctype">' + escapeHtml(tag) + '</span>';
    }
    let out = '';
    let i = 0;
    const n = tag.length;

    const openMatch = tag.match(/^<\/?/);
    out += '<span class="tok-punct">' + escapeHtml(openMatch[0]) + '</span>';
    i += openMatch[0].length;

    const nameMatch = tag.slice(i).match(/^[a-zA-Z][a-zA-Z0-9-]*/);
    if (nameMatch) {
      out += '<span class="tok-tag">' + escapeHtml(nameMatch[0]) + '</span>';
      i += nameMatch[0].length;
    }

    while (i < n) {
      const rest = tag.slice(i);

      const closeMatch = rest.match(/^\s*\/?>$/);
      if (closeMatch) {
        const trimmed = closeMatch[0].replace(/^\s+/, '');
        const leadingWs = closeMatch[0].slice(0, closeMatch[0].length - trimmed.length);
        out += escapeHtml(leadingWs);
        out += '<span class="tok-punct">' + escapeHtml(trimmed) + '</span>';
        break;
      }

      const wsMatch = rest.match(/^\s+/);
      if (wsMatch) {
        out += escapeHtml(wsMatch[0]);
        i += wsMatch[0].length;
        continue;
      }

      const attrNameMatch = rest.match(/^[a-zA-Z_:][-a-zA-Z0-9_:.]*/);
      if (attrNameMatch) {
        out += '<span class="tok-attr-name">' + escapeHtml(attrNameMatch[0]) + '</span>';
        i += attrNameMatch[0].length;

        const afterName = tag.slice(i);
        const eqMatch = afterName.match(/^\s*=\s*/);
        if (eqMatch) {
          out += '<span class="tok-punct">' + escapeHtml(eqMatch[0]) + '</span>';
          i += eqMatch[0].length;

          const valMatch = tag.slice(i).match(/^"[^"]*"|^'[^']*'|^[^\s"'>/]+/);
          if (valMatch) {
            out += '<span class="tok-attr-value">' + escapeHtml(valMatch[0]) + '</span>';
            i += valMatch[0].length;
          }
        }
        continue;
      }

      // Carácter suelto que no reconocemos: lo dejamos pasar tal cual
      // para no quedarnos en un bucle infinito.
      out += escapeHtml(rest[0]);
      i += 1;
    }

    return out;
  }

  function highlightHTML(code) {
    let out = '';
    let i = 0;
    const n = code.length;

    while (i < n) {
      if (code.startsWith('<!--', i)) {
        let end = code.indexOf('-->', i);
        end = end === -1 ? n : end + 3;
        out += '<span class="tok-comment">' + escapeHtml(code.slice(i, end)) + '</span>';
        i = end;
        continue;
      }

      if (code[i] === '<' && /[a-zA-Z/!]/.test(code[i + 1] || '')) {
        let end = code.indexOf('>', i);
        end = end === -1 ? n - 1 : end;
        out += highlightTag(code.slice(i, end + 1));
        i = end + 1;
        continue;
      }

      if (code[i] === '<') {
        // '<' suelto que no abre una etiqueta reconocible (ej. "1 < 2")
        out += '<span class="tok-text">' + escapeHtml('<') + '</span>';
        i += 1;
        continue;
      }

      let next = code.indexOf('<', i);
      if (next === -1) next = n;
      out += '<span class="tok-text">' + escapeHtml(code.slice(i, next)) + '</span>';
      i = next;
    }

    return out;
  }

  function updateHighlight() {
    codeHighlightContent.innerHTML = highlightHTML(codeEditor.value) + '\n';
  }

  // ========================================
  //  STARTER CONTENT (fácil de borrar con "Limpiar todo")
  // ========================================
  const STARTER_HTML =
`<h1>Bienvenido a Lienzo HTML</h1>
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
    'body{margin:0;background:#ffffff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;}' +
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
    updateHighlight();
    // srcdoc: sin política CSP en este documento, el HTML pegado (con sus
    // estilos e inline-scripts) se muestra tal cual. El sandbox del
    // iframe (sin allow-same-origin) sigue aislándolo del resto de la app.
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
  //  DEVICE TOGGLE + PRESETS DE RESOLUCIÓN + ZOOM
  // ========================================
  let currentDeviceWidth = 375;
  let currentDeviceHeight = 667;
  let currentZoom = 1;
  let autoFit = true; // true = el zoom se recalcula solo para que el dispositivo entre completo

  function isTabletWidth(width) {
    return width >= 600;
  }

  function computeFitZoom(width, height) {
    const availW = previewCanvas.clientWidth - 48;  // deja el padding del canvas
    const availH = previewCanvas.clientHeight - 48;
    const scale = Math.min(1, availW / width, availH / height);
    return Math.max(0.25, Math.min(1.5, scale));
  }

  function setZoomUI(zoom) {
    const pct = Math.round(zoom * 100);
    zoomSlider.value = pct;
    zoomValue.textContent = pct + '%';
  }

  function applyZoomToDOM(zoom) {
    currentZoom = zoom;
    deviceScaleWrapper.classList.remove('is-pc');
    deviceScaleWrapper.style.width = (currentDeviceWidth * zoom) + 'px';
    deviceScaleWrapper.style.height = (currentDeviceHeight * zoom) + 'px';
    deviceContainer.style.width = currentDeviceWidth + 'px';
    deviceContainer.style.height = currentDeviceHeight + 'px';
    deviceContainer.style.transform = 'scale(' + zoom + ')';
    setZoomUI(zoom);
  }

  function applyDevicePreset() {
    const raw = selDevicePreset.value; // "375x667"
    const [wStr, hStr] = raw.split('x');
    currentDeviceWidth = parseInt(wStr, 10);
    currentDeviceHeight = parseInt(hStr, 10);
    const tablet = isTabletWidth(currentDeviceWidth);
    const optionText = selDevicePreset.options[selDevicePreset.selectedIndex].text;
    const deviceName = optionText.split('—')[0].trim();

    deviceContainer.className = 'device-container mode-mobile' + (tablet ? ' is-tablet' : '');
    deviceLabel.textContent = '📱 ' + deviceName + ' — ' + currentDeviceWidth + '×' + currentDeviceHeight;

    const zoom = autoFit ? computeFitZoom(currentDeviceWidth, currentDeviceHeight) : currentZoom;
    applyZoomToDOM(zoom);

    localStorage.setItem(STORAGE_PREFIX + 'device-preset', raw);
  }

  function setDevice(mode) {
    if (mode === 'pc') {
      deviceContainer.className = 'device-container mode-pc';
      deviceContainer.style.width = '';
      deviceContainer.style.height = '';
      deviceContainer.style.transform = '';
      deviceScaleWrapper.classList.add('is-pc');
      deviceScaleWrapper.style.width = '';
      deviceScaleWrapper.style.height = '';
      deviceLabel.textContent = '💻 PC — 100%';
      selDevicePreset.hidden = true;
      zoomBar.hidden = true;
      btnPC.classList.add('active');
      btnPC.setAttribute('aria-pressed', 'true');
      btnMobile.classList.remove('active');
      btnMobile.setAttribute('aria-pressed', 'false');
    } else {
      selDevicePreset.hidden = false;
      zoomBar.hidden = false;
      applyDevicePreset();
      btnMobile.classList.add('active');
      btnMobile.setAttribute('aria-pressed', 'true');
      btnPC.classList.remove('active');
      btnPC.setAttribute('aria-pressed', 'false');
    }
    localStorage.setItem(STORAGE_PREFIX + 'device-mode', mode);
  }

  btnPC.addEventListener('click', function () { setDevice('pc'); });
  btnMobile.addEventListener('click', function () { setDevice('mobile'); });

  selDevicePreset.addEventListener('change', function () {
    autoFit = true; // al cambiar de dispositivo, recalculamos el ajuste automático
    applyDevicePreset();
  });

  zoomSlider.addEventListener('input', function () {
    autoFit = false;
    applyZoomToDOM(parseInt(zoomSlider.value, 10) / 100);
  });

  btnZoomIn.addEventListener('click', function () {
    autoFit = false;
    applyZoomToDOM(Math.min(1.5, currentZoom + 0.1));
  });

  btnZoomOut.addEventListener('click', function () {
    autoFit = false;
    applyZoomToDOM(Math.max(0.25, currentZoom - 0.1));
  });

  btnZoomFit.addEventListener('click', function () {
    autoFit = true;
    applyZoomToDOM(computeFitZoom(currentDeviceWidth, currentDeviceHeight));
  });

  // Si cambia el tamaño de la ventana y el auto-ajuste sigue activo,
  // recalculamos el zoom para que el dispositivo siga entrando completo.
  window.addEventListener('resize', function () {
    if (!zoomBar.hidden && autoFit) {
      applyZoomToDOM(computeFitZoom(currentDeviceWidth, currentDeviceHeight));
    }
  });

  // ========================================
  //  PANEL RESIZABLE (editor ↔ previsualización)
  // ========================================
  (function setupResizer() {
    let dragging = false;

    function clampWidth(px) {
      const min = 320;
      const max = mainEl.clientWidth - 320; // deja espacio mínimo a la previsualización
      return Math.max(min, Math.min(max, px));
    }

    function onMove(clientX) {
      const mainRect = mainEl.getBoundingClientRect();
      const newWidth = clampWidth(clientX - mainRect.left);
      panelEditor.style.flexBasis = newWidth + 'px';
    }

    function stopDragging() {
      if (!dragging) return;
      dragging = false;
      panelResizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(STORAGE_PREFIX + 'editor-width', panelEditor.getBoundingClientRect().width);
    }

    panelResizer.addEventListener('mousedown', function (e) {
      e.preventDefault();
      dragging = true;
      panelResizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      onMove(e.clientX);
    });

    document.addEventListener('mouseup', stopDragging);

    // Soporte táctil (tablets con teclado, pantallas grandes táctiles, etc.)
    panelResizer.addEventListener('touchstart', function () {
      dragging = true;
      panelResizer.classList.add('dragging');
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!dragging || !e.touches[0]) return;
      onMove(e.touches[0].clientX);
    }, { passive: true });

    document.addEventListener('touchend', stopDragging);

    // Accesibilidad por teclado: flechas izquierda/derecha con el separador enfocado
    panelResizer.addEventListener('keydown', function (e) {
      const current = panelEditor.getBoundingClientRect().width;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        panelEditor.style.flexBasis = clampWidth(current - 20) + 'px';
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        panelEditor.style.flexBasis = clampWidth(current + 20) + 'px';
      }
    });

    // Restaurar el último ancho usado
    const savedWidth = parseFloat(localStorage.getItem(STORAGE_PREFIX + 'editor-width'));
    if (savedWidth) {
      panelEditor.style.flexBasis = clampWidth(savedWidth) + 'px';
    }
  })();

  // ========================================
  //  TEMA CLARO / OSCURO
  //  (la previsualización siempre se fuerza en blanco, ver
  //  MINIMAL_PREVIEW_CSS e isFullDocument más arriba: esto solo
  //  cambia la interfaz del editor.)
  // ========================================
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggleIcon.textContent = '☀️';
      btnThemeToggle.title = 'Cambiar a tema claro (la previsualización siempre queda en blanco)';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggleIcon.textContent = '🌙';
      btnThemeToggle.title = 'Cambiar a tema oscuro (la previsualización siempre queda en blanco)';
    }
    localStorage.setItem(STORAGE_PREFIX + 'theme', theme);
  }

  btnThemeToggle.addEventListener('click', function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  });

  // ========================================
  //  GLOBAL EVENT WIRING
  // ========================================
  codeEditor.addEventListener('input', function () {
    updateHighlight();
    scheduleSyncPreview();
  });

  // Las dos capas (resaltado decorativo + textarea real) deben desplazarse
  // juntas siempre, o el color se desalinearía del texto real al hacer scroll.
  codeEditor.addEventListener('scroll', function () {
    codeHighlight.scrollTop = codeEditor.scrollTop;
    codeHighlight.scrollLeft = codeEditor.scrollLeft;
  });

  btnClearAll.addEventListener('click', clearAll);
  btnCopy.addEventListener('click', copyHTML);

  // ========================================
  //  INSTALACIÓN COMO APP (PWA)
  // ========================================
  // A propósito NO interceptamos 'beforeinstallprompt' ni mostramos un
  // botón propio: así el navegador (Chrome/Edge) muestra su ícono nativo
  // de "Instalar" en la barra de direcciones por su cuenta, en cuanto el
  // manifest.json y el service worker cumplen sus requisitos. Esa es la
  // manera en la que pediste que apareciera.

  // ========================================
  //  SERVICE WORKER (permite instalar y funcionar sin internet)
  // ========================================
  // Solo se registra sobre http(s): en file:// (abrir el .html con doble
  // clic) los service workers no están disponibles, así que la app sigue
  // funcionando igual, simplemente sin esta capa extra.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('No se pudo registrar el service worker:', err);
      });
    });
  }

  // ========================================
  //  INITIAL STATE
  // ========================================
  codeEditor.value = STARTER_HTML;
  syncPreview();

  const savedTheme = localStorage.getItem(STORAGE_PREFIX + 'theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

  const savedPreset = localStorage.getItem(STORAGE_PREFIX + 'device-preset');
  if (savedPreset && [...selDevicePreset.options].some(function (o) { return o.value === savedPreset; })) {
    selDevicePreset.value = savedPreset;
  }
  const savedMode = localStorage.getItem(STORAGE_PREFIX + 'device-mode');
  setDevice(savedMode === 'mobile' ? 'mobile' : 'pc');

})();

