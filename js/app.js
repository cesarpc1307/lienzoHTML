/* ============================================
   LIENZO HTML  v2.0
   Application Logic — CodeMirror 6 Edition
   ============================================
   Arquitectura: una sola fuente de verdad (la instancia
   EditorView de CodeMirror 6). La barra de herramientas
   manipula el documento mediante transacciones de CM6
   (dispatch), por lo que el HTML nunca se reescribe ni
   reorganiza a tus espaldas: lo que ves en el editor es
   exactamente lo que se previsualiza, con undo/redo
   completo (Ctrl+Z / Ctrl+Y).
   ============================================ */

(function () {
  'use strict';

  // ========================================
  //  CM6 IMPORTS (from standalone bundle)
  // ========================================
  var CM = window.CM;
  var EditorView      = CM.EditorView;
  var EditorState     = CM.EditorState;
  var Compartment     = CM.Compartment;
  var basicSetup      = CM.basicSetup;
  var htmlLang        = CM.html;
  var keymap          = CM.keymap;
  var cmPlaceholder   = CM.placeholder;
  var indentWithTab   = CM.indentWithTab;
  var tags            = CM.tags;
  var HighlightStyle  = CM.HighlightStyle;
  var syntaxHighlighting = CM.syntaxHighlighting;

  // ========================================
  //  DOM REFERENCES
  // ========================================
  var editorParent    = document.getElementById('code-editor');
  var previewFrame    = document.getElementById('preview-frame');
  var deviceContainer = document.getElementById('device-container');
  var deviceLabel     = document.getElementById('device-label');
  var btnPC           = document.getElementById('btn-pc');
  var btnMobile       = document.getElementById('btn-mobile');
  var selDevicePreset = document.getElementById('sel-device-preset');

  var panelEditor   = document.getElementById('panel-editor');
  var panelResizer  = document.getElementById('panel-resizer');
  var mainEl        = document.querySelector('main');

  var btnThemeToggle  = document.getElementById('btn-theme-toggle');
  var themeToggleIcon = document.getElementById('theme-toggle-icon');

  var btnCopy      = document.getElementById('btn-copy');
  var btnClearAll  = document.getElementById('btn-clear-all');
  var btnBeautify  = document.getElementById('btn-beautify');
  var btnClean     = document.getElementById('btn-clean');
  var selHeading   = document.getElementById('sel-heading');
  var btnBold      = document.getElementById('btn-bold');
  var btnItalic    = document.getElementById('btn-italic');
  var btnUnderline = document.getElementById('btn-underline');
  var btnStrike    = document.getElementById('btn-strike');
  var btnUl        = document.getElementById('btn-ul');
  var btnOl        = document.getElementById('btn-ol');
  var btnLink      = document.getElementById('btn-link');
  var btnTable     = document.getElementById('btn-table');
  var btnTableRow  = document.getElementById('btn-table-row');

  var modalTable  = document.getElementById('modal-table');
  var modalLink   = document.getElementById('modal-link');
  var modalInfo   = document.getElementById('modal-info');
  var btnInfo     = document.getElementById('btn-info');
  var btnInfoClose = document.getElementById('btn-info-close');

  var previewCanvas      = document.getElementById('preview-canvas');
  var deviceScaleWrapper = document.getElementById('device-scale-wrapper');
  var zoomBar    = document.getElementById('zoom-bar');
  var zoomSlider = document.getElementById('zoom-slider');
  var zoomValue  = document.getElementById('zoom-value');
  var btnZoomIn  = document.getElementById('btn-zoom-in');
  var btnZoomOut = document.getElementById('btn-zoom-out');
  var btnZoomFit = document.getElementById('btn-zoom-fit');

  var STORAGE_PREFIX = 'lienzo-html-';

  // Preset color palette (24 colors covering neutrals + a full hue wheel)
  var PALETTE = [
    '#000000', '#1e293b', '#475569', '#64748b', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78350f'
  ];

  var HEX_RE = /^#[0-9a-fA-F]{6}$/;

  // ========================================
  //  CM6 THEMES (claro + oscuro)
  // ========================================
  var EDITOR_FONT = "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace";
  var themeCompartment = new Compartment();

  // ---------- Tema claro ----------
  var lienzoLightTheme = EditorView.theme({
    '&': {
      fontSize: '13px',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily: EDITOR_FONT,
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '18px 0',
      caretColor: '#1e293b',
    },
    '.cm-gutters': {
      backgroundColor: '#fafbfc',
      color: '#b0b8c4',
      borderRight: '1px solid #e2e8f0',
      minWidth: '48px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      paddingLeft: '12px',
      paddingRight: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(99, 102, 241, .08)',
      color: '#6366f1',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(99, 102, 241, .04)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(99, 102, 241, .15) !important',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(99, 102, 241, .10)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#1e293b',
      borderLeftWidth: '2px',
    },
    '.cm-foldGutter .cm-gutterElement': {
      color: '#94a3b8',
    },
    '.cm-tooltip': {
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(99, 102, 241, .12)',
        color: '#1e293b',
      },
    },
    '.cm-panels': {
      backgroundColor: '#fafbfc',
      borderBottom: '1px solid #e2e8f0',
      color: '#1e293b',
    },
    '.cm-panels button': {
      backgroundImage: 'none',
      backgroundColor: '#e2e8f0',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    '.cm-panels input, .cm-panels button': {
      fontSize: '12px',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(249, 115, 22, .2)',
      outline: '1px solid rgba(249, 115, 22, .4)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(249, 115, 22, .4)',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(99, 102, 241, .15)',
      outline: '1px solid rgba(99, 102, 241, .5)',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(99, 102, 241, .08)',
      border: '1px solid #e2e8f0',
      color: '#6366f1',
    },
  });

  var lienzoLightHighlight = syntaxHighlighting(HighlightStyle.define([
    { tag: tags.tagName,                     color: '#be185d', fontWeight: '600' },
    { tag: tags.attributeName,               color: '#b45309' },
    { tag: [tags.attributeValue, tags.string], color: '#15803d' },
    { tag: [tags.angleBracket, tags.bracket], color: '#64748b' },
    { tag: tags.comment,                     color: '#94a3b8', fontStyle: 'italic' },
    { tag: tags.documentMeta,                color: '#6366f1' },
    { tag: tags.content,                     color: '#1e293b' },
    { tag: tags.keyword,                     color: '#6366f1', fontWeight: '600' },
    { tag: tags.number,                      color: '#b45309' },
    { tag: tags.operator,                    color: '#64748b' },
    { tag: tags.definition(tags.variableName), color: '#1e40af' },
    { tag: tags.variableName,                color: '#1e293b' },
    { tag: tags.propertyName,                color: '#b45309' },
    { tag: tags.typeName,                    color: '#be185d' },
    { tag: tags.className,                   color: '#be185d' },
    { tag: tags.function(tags.variableName), color: '#6366f1' },
    { tag: tags.bool,                        color: '#6366f1' },
    { tag: tags.null,                        color: '#6366f1' },
    { tag: tags.meta,                        color: '#6366f1' },
  ]));

  // ---------- Tema oscuro ----------
  var lienzoDarkTheme = EditorView.theme({
    '&': {
      fontSize: '13px',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily: EDITOR_FONT,
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '18px 0',
      caretColor: '#e5e7eb',
    },
    '.cm-gutters': {
      backgroundColor: '#1b1c2a',
      color: '#5b6072',
      borderRight: '1px solid #2f3242',
      minWidth: '48px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      paddingLeft: '12px',
      paddingRight: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(129, 140, 248, .12)',
      color: '#818cf8',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(129, 140, 248, .06)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(129, 140, 248, .20) !important',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(129, 140, 248, .12)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#e5e7eb',
      borderLeftWidth: '2px',
    },
    '.cm-foldGutter .cm-gutterElement': {
      color: '#5b6072',
    },
    '.cm-tooltip': {
      border: '1px solid #2f3242',
      backgroundColor: '#1b1c2a',
      color: '#e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 14px rgba(0,0,0,.4)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(129, 140, 248, .18)',
        color: '#e5e7eb',
      },
    },
    '.cm-panels': {
      backgroundColor: '#20222f',
      borderBottom: '1px solid #2f3242',
      color: '#e5e7eb',
    },
    '.cm-panels button': {
      backgroundImage: 'none',
      backgroundColor: '#2f3242',
      color: '#e5e7eb',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    '.cm-panels input, .cm-panels button': {
      fontSize: '12px',
    },
    '.cm-panels input': {
      color: '#e5e7eb',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(249, 115, 22, .25)',
      outline: '1px solid rgba(249, 115, 22, .5)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(249, 115, 22, .45)',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(129, 140, 248, .2)',
      outline: '1px solid rgba(129, 140, 248, .6)',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(129, 140, 248, .12)',
      border: '1px solid #2f3242',
      color: '#818cf8',
    },
  }, { dark: true });

  var lienzoDarkHighlight = syntaxHighlighting(HighlightStyle.define([
    { tag: tags.tagName,                     color: '#f472b6', fontWeight: '600' },
    { tag: tags.attributeName,               color: '#fbbf24' },
    { tag: [tags.attributeValue, tags.string], color: '#34d399' },
    { tag: [tags.angleBracket, tags.bracket], color: '#94a3b8' },
    { tag: tags.comment,                     color: '#6b7280', fontStyle: 'italic' },
    { tag: tags.documentMeta,                color: '#a5b4fc' },
    { tag: tags.content,                     color: '#e5e7eb' },
    { tag: tags.keyword,                     color: '#a5b4fc', fontWeight: '600' },
    { tag: tags.number,                      color: '#fbbf24' },
    { tag: tags.operator,                    color: '#94a3b8' },
    { tag: tags.definition(tags.variableName), color: '#93c5fd' },
    { tag: tags.variableName,                color: '#e5e7eb' },
    { tag: tags.propertyName,                color: '#fbbf24' },
    { tag: tags.typeName,                    color: '#f472b6' },
    { tag: tags.className,                   color: '#f472b6' },
    { tag: tags.function(tags.variableName), color: '#a5b4fc' },
    { tag: tags.bool,                        color: '#a5b4fc' },
    { tag: tags.null,                        color: '#a5b4fc' },
    { tag: tags.meta,                        color: '#a5b4fc' },
  ]));

  // ========================================
  //  STARTER CONTENT (fácil de borrar con "Limpiar todo")
  // ========================================
  var STARTER_HTML =
'<h1>Bienvenido a Lienzo HTML</h1>\n\
<p>Escribe o pega tu código HTML aquí. Selecciona texto y usa la barra de\n\
herramientas para aplicar <strong>negrita</strong>, <em>cursiva</em> o\n\
<span style="color: #6366f1;">color</span>.</p>\n\
<ul>\n\
  <li>Lo que escribes es exactamente lo que se previsualiza.</li>\n\
  <li>Puedes pegar una página completa (con &lt;html&gt;, &lt;head&gt; y\n\
  estilos propios) y se respetará tal cual.</li>\n\
</ul>';

  // ========================================
  //  PREVIEW
  // ========================================
  // Estilos mínimos: solo un reset de box-sizing y un fallback de
  // tipografía. No forzamos márgenes, colores ni tamaños de encabezado,
  // para no pisar el diseño que ya trae tu HTML.
  var MINIMAL_PREVIEW_CSS =
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

  var debounceTimer = null;
  function syncPreview() {
    // srcdoc: sin política CSP en este documento, el HTML pegado (con sus
    // estilos e inline-scripts) se muestra tal cual. El sandbox del
    // iframe (sin allow-same-origin) sigue aislándolo del resto de la app.
    previewFrame.srcdoc = buildPreviewDocument(view.state.doc.toString());
  }

  function scheduleSyncPreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncPreview, 150);
  }

  // ========================================
  //  CM6 EDITOR INSTANCE
  // ========================================
  var savedTheme = localStorage.getItem(STORAGE_PREFIX + 'theme');
  var initialIsDark = savedTheme === 'dark';

  function getThemeExtensions(isDark) {
    return isDark
      ? [lienzoDarkTheme, lienzoDarkHighlight]
      : [lienzoLightTheme, lienzoLightHighlight];
  }

  var view = new EditorView({
    state: EditorState.create({
      doc: STARTER_HTML,
      extensions: [
        basicSetup,
        htmlLang(),
        keymap.of([indentWithTab]),
        themeCompartment.of(getThemeExtensions(initialIsDark)),
        cmPlaceholder('Escribe o pega tu código HTML aquí. Se previsualizará tal cual, respetando tu diseño…'),
        EditorView.updateListener.of(function (update) {
          if (update.docChanged) {
            scheduleSyncPreview();
          }
        }),
        // Atajos de formato de la toolbar
        keymap.of([
          { key: 'Mod-b', run: function () { wrapSelection('<strong>', '</strong>'); return true; }, preventDefault: true },
          { key: 'Mod-i', run: function () { wrapSelection('<em>', '</em>'); return true; }, preventDefault: true },
          { key: 'Mod-u', run: function () { wrapSelection('<u>', '</u>'); return true; }, preventDefault: true },
        ]),
        EditorView.lineWrapping,
      ],
    }),
    parent: editorParent,
  });

  // ========================================
  //  SELECTION / TEXT HELPERS (CM6 API)
  // ========================================
  function getDoc() {
    return view.state.doc.toString();
  }

  function getSel() {
    var sel = view.state.selection.main;
    return { from: sel.from, to: sel.to };
  }

  function replaceRange(start, end, newText, cursorStart, cursorEnd) {
    var cs = start + (cursorStart != null ? cursorStart : newText.length);
    var ce = start + (cursorEnd != null ? cursorEnd : (cursorStart != null ? cursorStart : newText.length));
    view.dispatch({
      changes: { from: start, to: end, insert: newText },
      selection: { anchor: cs, head: ce },
      scrollIntoView: true,
    });
    view.focus();
  }

  function wrapSelection(openTag, closeTag) {
    var sel = getSel();
    var inner = view.state.sliceDoc(sel.from, sel.to);
    var newText = openTag + inner + closeTag;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: newText },
      selection: { anchor: sel.from + openTag.length, head: sel.from + openTag.length + inner.length },
      scrollIntoView: true,
    });
    view.focus();
  }

  function insertAtCursor(text) {
    var sel = getSel();
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: text },
      selection: { anchor: sel.from + text.length },
      scrollIntoView: true,
    });
    view.focus();
  }

  function getCurrentLineRange() {
    var sel = getSel();
    var lineStart = view.state.doc.lineAt(sel.from);
    var lineEnd   = view.state.doc.lineAt(sel.to);
    return { lineStart: lineStart.from, lineEnd: lineEnd.to };
  }

  function setDoc(newContent) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newContent },
    });
  }

  // ========================================
  //  HTML FORMATTER / BEAUTIFIER (solo bajo demanda)
  // ========================================
  function formatHTML(html) {
    if (!html || html.trim() === '') return '';

    var clean = html.replace(/>\s+</g, '><').trim();

    var formatted = '';
    var indent = 0;
    var tab = '  ';

    var reg = /(<[^>]+>)/g;
    var parts = clean.split(reg).filter(Boolean);

    var parentContainerTags = new Set([
      'html', 'head', 'body', 'div', 'section', 'article', 'ul', 'ol',
      'table', 'thead', 'tbody', 'tr', 'blockquote', 'main', 'header', 'footer', 'nav'
    ]);

    var blockTextTags = new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'th', 'td', 'dt', 'dd', 'title', 'style', 'script'
    ]);

    var voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

    parts.forEach(function (part) {
      if (part.startsWith('<!')) {
        formatted += (formatted ? '\n' : '') + part;
        return;
      }
      if (part.startsWith('</')) {
        var tag = (part.match(/^<\/([\\w-]+)/) || [])[1];
        var tagLower = tag ? tag.toLowerCase() : '';
        if (parentContainerTags.has(tagLower)) {
          indent = Math.max(0, indent - 1);
          formatted += '\n' + tab.repeat(indent) + part;
        } else {
          formatted += part;
        }
      } else if (part.startsWith('<')) {
        var tag2 = (part.match(/^<([\w-]+)/) || [])[1];
        var tagLower2 = tag2 ? tag2.toLowerCase() : '';
        var isSelfClosing = part.endsWith('/>') || voidTags.has(tagLower2);

        if (parentContainerTags.has(tagLower2)) {
          if (formatted && !formatted.endsWith('\n')) formatted += '\n';
          formatted += tab.repeat(indent) + part;
          if (!isSelfClosing) indent++;
        } else if (blockTextTags.has(tagLower2)) {
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
  //  CLEAR ALL
  // ========================================
  function clearAll() {
    if (!confirm('¿Estás seguro de que deseas borrar todo el contenido? Esta acción no se puede deshacer.')) {
      return;
    }
    setDoc('');
    view.focus();
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
    var ta = document.createElement('textarea');
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
    var text = getDoc();
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
    var tag = selHeading.value;
    if (!tag) return;

    var sel = getSel();
    var start = sel.from;
    var end   = sel.to;
    if (start === end) {
      var range = getCurrentLineRange();
      start = range.lineStart;
      end = range.lineEnd;
    }

    var original = view.state.sliceDoc(start, end);
    var match = original.trim().match(/^<(h[1-6]|p)>([\s\S]*)<\/\1>$/i);
    var inner = match ? match[2] : original.trim();
    var newText = '<' + tag + '>' + inner + '</' + tag + '>';

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
    var sel = getSel();
    var start = sel.from;
    var end   = sel.to;
    if (start === end) {
      var range = getCurrentLineRange();
      start = range.lineStart;
      end = range.lineEnd;
    }
    var original = view.state.sliceDoc(start, end);
    var lines = original.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var source = lines.length ? lines : [''];
    var items = source.map(function (l) {
      return '  <li>' + l.replace(/^<li>/i, '').replace(/<\/li>$/i, '') + '</li>';
    }).join('\n');
    var tag = ordered ? 'ol' : 'ul';
    var newText = '<' + tag + '>\n' + items + '\n</' + tag + '>';
    replaceRange(start, end, newText, newText.length, newText.length);
  }

  btnUl.addEventListener('click', function () { applyList(false); });
  btnOl.addEventListener('click', function () { applyList(true); });

  // ========================================
  //  CLEAN FORMATTING (quitar etiquetas de la selección)
  // ========================================
  function stripSelectionFormatting() {
    var sel = getSel();
    if (sel.from === sel.to) {
      alert('Selecciona primero el texto del que deseas quitar el formato.');
      return;
    }
    var doc = getDoc();
    var before = doc.slice(0, sel.from);
    var inner  = doc.slice(sel.from, sel.to);
    var after  = doc.slice(sel.to);

    // Capa por capa: si lo que seleccionaste está justo envuelto por una
    // etiqueta (aunque no hayas incluido la etiqueta en tu selección),
    // se detecta y también se quita. Por ejemplo, seleccionar solo "hola"
    // dentro de <strong>hola</strong> ahora sí le quita la negrita.
    var changed = true;
    while (changed) {
      changed = false;
      var openMatch = before.match(/<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>$/);
      if (openMatch) {
        var closeRe = new RegExp('^</' + openMatch[1] + '>', 'i');
        var closeMatch = after.match(closeRe);
        if (closeMatch) {
          before = before.slice(0, before.length - openMatch[0].length);
          after = after.slice(closeMatch[0].length);
          changed = true;
        }
      }
    }

    // Además, quita cualquier etiqueta que haya quedado dentro de la selección.
    var stripped = inner.replace(/<[^>]+>/g, '');

    var changeFrom = before.length;
    var changeTo   = doc.length - after.length;

    view.dispatch({
      changes: { from: changeFrom, to: changeTo, insert: stripped },
      selection: { anchor: changeFrom, head: changeFrom + stripped.length },
      scrollIntoView: true,
    });
    view.focus();
  }

  btnClean.addEventListener('click', stripSelectionFormatting);

  // ========================================
  //  BEAUTIFY (indentar, solo si el usuario lo pide)
  // ========================================
  btnBeautify.addEventListener('click', function () {
    setDoc(formatHTML(getDoc()));
  });

  // ========================================
  //  COLOR POPOVERS  (selector nativo + paleta + hex)
  // ========================================
  function buildSwatches(container, onPick) {
    container.innerHTML = '';
    PALETTE.forEach(function (hex) {
      var sw = document.createElement('button');
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
    var btn = document.getElementById(opts.btnId);
    var popover = document.getElementById(opts.popoverId);
    var picker = document.getElementById(opts.pickerId);
    var hexInput = document.getElementById(opts.hexId);
    var swatches = document.getElementById(opts.swatchesId);
    var applyBtn = document.getElementById(opts.applyId);
    var removeBtn = document.getElementById(opts.removeId);

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
      var willOpen = popover.hidden;
      closeAllPopovers();
      popover.hidden = !willOpen;
    });

    popover.addEventListener('click', function (e) { e.stopPropagation(); });

    applyBtn.addEventListener('click', function () {
      var hex = HEX_RE.test(hexInput.value) ? hexInput.value : picker.value;
      var sel = getSel();
      var text = view.state.sliceDoc(sel.from, sel.to);
      if (!text) {
        alert('Selecciona primero el texto al que deseas aplicar el color.');
        return;
      }
      var newText = '<span style="' + opts.cssProp + ': ' + hex + ';">' + text + '</span>';
      replaceRange(sel.from, sel.to, newText, newText.length, newText.length);
      popover.hidden = true;
    });

    removeBtn.addEventListener('click', function () {
      var sel = getSel();
      var text = view.state.sliceDoc(sel.from, sel.to);
      if (!text) { popover.hidden = true; return; }
      var re = new RegExp('<span style="\\s*' + opts.cssProp + '\\s*:[^;"]*;?\\s*">([\\s\\S]*?)<\\/span>', 'gi');
      text = text.replace(re, '$1');
      replaceRange(sel.from, sel.to, text, text.length, text.length);
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

  [modalTable, modalLink, modalInfo].forEach(function (overlay) {
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal(overlay);
      });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(modalTable); closeModal(modalLink); closeModal(modalInfo); }
  });

  if (btnInfo && modalInfo) {
    btnInfo.addEventListener('click', function () { openModal(modalInfo); });
  }
  if (btnInfoClose && modalInfo) {
    btnInfoClose.addEventListener('click', function () { closeModal(modalInfo); });
  }

  // ========================================
  //  TABLE INSERT (filas/columnas configurables)
  // ========================================
  function buildTableHTML(dataRows, cols, withHeader) {
    var html = '<table>\n';
    if (withHeader) {
      html += '  <thead>\n    <tr>\n';
      for (var c = 0; c < cols; c++) html += '      <th>Encabezado ' + (c + 1) + '</th>\n';
      html += '    </tr>\n  </thead>\n';
    }
    html += '  <tbody>\n';
    for (var r = 0; r < dataRows; r++) {
      html += '    <tr>\n';
      for (var c2 = 0; c2 < cols; c2++) html += '      <td>Celda</td>\n';
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
    var rows = Math.max(1, Math.min(50, parseInt(document.getElementById('input-rows').value, 10) || 1));
    var cols = Math.max(1, Math.min(20, parseInt(document.getElementById('input-cols').value, 10) || 1));
    var withHeader = document.getElementById('input-header').checked;
    insertAtCursor(buildTableHTML(rows, cols, withHeader) + '\n');
    closeModal(modalTable);
  });

  // ========================================
  //  ADD ROW TO NEAREST TABLE (añadir fila sin rehacer la tabla)
  // ========================================
  btnTableRow.addEventListener('click', function () {
    var val = getDoc();
    var pos = getSel().from;

    var closeIdx = val.indexOf('</table>', pos);
    if (closeIdx === -1) {
      var lastOpen = val.lastIndexOf('<table', pos);
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

    var openIdx = val.lastIndexOf('<table', closeIdx);
    if (openIdx === -1) {
      alert('No se encontró la apertura <table> correspondiente.');
      return;
    }

    var tableChunk = val.slice(openIdx, closeIdx);
    var trMatch = tableChunk.match(/<tr[\s\S]*?<\/tr>/i);
    var cols = 3;
    if (trMatch) {
      var cellMatches = trMatch[0].match(/<t[dh][\s>]/gi);
      if (cellMatches && cellMatches.length) cols = cellMatches.length;
    }

    var newRow = '    <tr>\n';
    for (var c = 0; c < cols; c++) newRow += '      <td>Celda</td>\n';
    newRow += '    </tr>\n  ';

    replaceRange(closeIdx, closeIdx, newRow, newRow.length, newRow.length);
  });

  // ========================================
  //  LINK INSERT (con saneado básico de la URL)
  // ========================================
  btnLink.addEventListener('click', function () {
    var sel = getSel();
    var selected = view.state.sliceDoc(sel.from, sel.to);
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
    var url = document.getElementById('input-link-url').value.trim();
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

    var sel = getSel();
    var selected = view.state.sliceDoc(sel.from, sel.to);
    var linkText = selected || document.getElementById('input-link-text').value.trim() || url;
    var safeUrl = url.replace(/"/g, '&quot;');
    var html = '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>';

    replaceRange(sel.from, sel.to, html, html.length, html.length);

    closeModal(modalLink);
    document.getElementById('input-link-url').value = '';
    document.getElementById('input-link-text').value = '';
    document.getElementById('input-link-text').disabled = false;
  });

  // ========================================
  //  DEVICE TOGGLE + PRESETS DE RESOLUCIÓN + ZOOM
  // ========================================
  var currentDeviceWidth = 375;
  var currentDeviceHeight = 667;
  var currentZoom = 1;
  var autoFit = true; // true = el zoom se recalcula solo para que el dispositivo entre completo

  function isTabletWidth(width) {
    return width >= 600;
  }

  function computeFitZoom(width, height) {
    var availW = previewCanvas.clientWidth - 48;  // deja el padding del canvas
    var availH = previewCanvas.clientHeight - 48;
    var scale = Math.min(1, availW / width, availH / height);
    return Math.max(0.25, Math.min(1.5, scale));
  }

  function setZoomUI(zoom) {
    var pct = Math.round(zoom * 100);
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
    var raw = selDevicePreset.value; // "375x667"
    var parts = raw.split('x');
    currentDeviceWidth = parseInt(parts[0], 10);
    currentDeviceHeight = parseInt(parts[1], 10);
    var tablet = isTabletWidth(currentDeviceWidth);
    var optionText = selDevicePreset.options[selDevicePreset.selectedIndex].text;
    var deviceName = optionText.split('—')[0].trim();

    deviceContainer.className = 'device-container mode-mobile' + (tablet ? ' is-tablet' : '');
    deviceLabel.textContent = '📱 ' + deviceName + ' — ' + currentDeviceWidth + '×' + currentDeviceHeight;

    var zoom = autoFit ? computeFitZoom(currentDeviceWidth, currentDeviceHeight) : currentZoom;
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
    var dragging = false;

    function clampWidth(px) {
      var min = 320;
      var max = mainEl.clientWidth - 320; // deja espacio mínimo a la previsualización
      return Math.max(min, Math.min(max, px));
    }

    function onMove(clientX) {
      var mainRect = mainEl.getBoundingClientRect();
      var newWidth = clampWidth(clientX - mainRect.left);
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
      var current = panelEditor.getBoundingClientRect().width;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        panelEditor.style.flexBasis = clampWidth(current - 20) + 'px';
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        panelEditor.style.flexBasis = clampWidth(current + 20) + 'px';
      }
    });

    // Restaurar el último ancho usado
    var savedWidth = parseFloat(localStorage.getItem(STORAGE_PREFIX + 'editor-width'));
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
    var isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggleIcon.textContent = '☀️';
      btnThemeToggle.title = 'Cambiar a tema claro (la previsualización siempre queda en blanco)';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggleIcon.textContent = '🌙';
      btnThemeToggle.title = 'Cambiar a tema oscuro (la previsualización siempre queda en blanco)';
    }
    // Cambiar el tema de CodeMirror dinámicamente
    view.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtensions(isDark)),
    });
    localStorage.setItem(STORAGE_PREFIX + 'theme', theme);
  }

  btnThemeToggle.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  });

  // ========================================
  //  GLOBAL EVENT WIRING
  // ========================================
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
  syncPreview();

  applyTheme(initialIsDark ? 'dark' : 'light');

  var savedPreset = localStorage.getItem(STORAGE_PREFIX + 'device-preset');
  if (savedPreset && Array.from(selDevicePreset.options).some(function (o) { return o.value === savedPreset; })) {
    selDevicePreset.value = savedPreset;
  }
  var savedMode = localStorage.getItem(STORAGE_PREFIX + 'device-mode');
  setDevice(savedMode === 'mobile' ? 'mobile' : 'pc');

})();
