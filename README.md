# Lienzo HTML

Editor de HTML con previsualización en vivo para **PC, tablet y celular**. Escribe o pega código HTML y velo renderizado al instante, respetando tu diseño tal cual es — sin reorganizar tu contenido, sin romper tus estilos.

100% del lado del cliente: no hay backend, no hay servidor que reciba tu código. Todo corre en tu navegador.

## ✨ Características

- **Editor de código profesional** con [CodeMirror 6](https://codemirror.net/): resaltado de sintaxis real para HTML/CSS/JS, números de línea, plegado de código, matcheo de paréntesis/etiquetas, auto-cierre de brackets y búsqueda (Ctrl+F).
- **Undo / Redo completo** (Ctrl+Z / Ctrl+Y): cada cambio se registra en el historial, incluyendo los que se hacen desde la barra de herramientas.
- **Barra de herramientas** que aplica formato envolviendo tu selección: negrita, cursiva, subrayado, tachado, encabezados, listas, color de texto/fondo (con selector nativo + paleta), enlaces y tablas configurables (filas/columnas a elegir, más un botón para añadir filas a una tabla existente).
- **Previsualización en tiempo real** para PC, y para celular/tablet con más de 15 resoluciones reales (iPhone, Samsung, Pixel, iPad, etc.).
- **Zoom + auto-ajuste** en la vista móvil, para que dispositivos altos (como el iPhone Pro Max) entren completos en la ventana, con control manual de zoom (25%–150%).
- **Panel redimensionable** entre el editor y la previsualización.
- **Tema claro / oscuro** para la interfaz (la previsualización siempre se mantiene en blanco, fiel al diseño real de tu HTML).
- **Instalable como aplicación** (PWA): en Chrome/Edge aparece el ícono de instalar en la barra de direcciones; funciona sin conexión una vez cargada.
- **Sin CDN ni dependencias externas en tiempo de ejecución**: CodeMirror 6 se incluye como un bundle standalone (`js/codemirror-bundle.js`), generado una sola vez con esbuild. La app es 100% autocontenida.

## 🚀 Cómo usarlo

Solo abre `index.html` en el navegador (doble clic) o publícalo en GitHub Pages — no requiere instalación, compilación ni servidor.

### Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a un repositorio de GitHub.
2. Ve a **Settings → Pages**.
3. En "Source", elige la rama (por ejemplo `main`) y la carpeta `/root`.
4. Guarda. GitHub te dará una URL tipo `https://tuusuario.github.io/turepo/`.

No necesitas ningún paso de build: son archivos estáticos.

## ⌨️ Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Rehacer |
| `Ctrl+B` | Negrita (`<strong>`) |
| `Ctrl+I` | Cursiva (`<em>`) |
| `Ctrl+U` | Subrayado (`<u>`) |
| `Ctrl+F` | Buscar y reemplazar |
| `Tab` | Indentar |
| `Shift+Tab` | Des-indentar |
| `Ctrl+/` | Comentar/descomentar |

## 📁 Estructura del proyecto

```
Lienzo HTML/
├── index.html                # La aplicación (editor + toolbar + previsualización)
├── manifest.json             # Metadatos para poder "instalar" la app
├── sw.js                     # Service worker (caché para uso sin conexión)
├── css/
│   └── styles.css            # Estilos de la interfaz (tema claro/oscuro incluido)
├── js/
│   ├── codemirror-bundle.js  # CodeMirror 6 standalone (generado con esbuild)
│   └── app.js                # Toda la lógica: editor CM6, toolbar, zoom, tema, etc.
└── icons/
    ├── favicon.svg
    ├── favicon-16.png / favicon-32.png
    ├── apple-touch-icon.png
    ├── icon-192.png / icon-512.png
    └── icon-512-maskable.png
```

## 🔧 Regenerar el bundle de CodeMirror (solo si necesitas actualizar la versión)

En circunstancias normales **no necesitas hacer esto**. El bundle ya está incluido en el repositorio. Solo es necesario si quieres actualizar CodeMirror a una versión más reciente.

```bash
# En un directorio temporal
mkdir cm6build && cd cm6build
npm init -y
npm install codemirror @codemirror/lang-html @codemirror/state @codemirror/view \
            @codemirror/commands @codemirror/language @lezer/highlight esbuild

# Crear cm-entry.js con las importaciones necesarias (ver el archivo
# que se usó en el build original, o el comentario al inicio de app.js)

npx esbuild cm-entry.js --bundle --format=iife --minify --target=es2018 \
    --outfile=../js/codemirror-bundle.js

# Limpiar
cd .. && rm -rf cm6build

# No olvidar subir CACHE_VERSION en sw.js
```

## 🔒 Notas de seguridad

La ventana de previsualización carga tu HTML dentro de un `<iframe sandbox="allow-scripts">`, **sin** el permiso `allow-same-origin`. Esto significa que cualquier HTML o script que pegues ahí:

- No puede acceder a la página principal, a tus datos guardados (`localStorage`) ni a cookies.
- No puede navegar la pestaña ni hacerse pasar por el sitio real.
- Sí puede ejecutar su propio JavaScript y aplicar sus propios estilos — para eso sirve la herramienta.

Este documento (`index.html`) **a propósito no incluye una política CSP** (`Content-Security-Policy`). Se probó agregar una, pero cualquier política puesta en este documento se hereda automáticamente dentro del iframe de previsualización (así funciona `srcdoc` en los navegadores) y terminaba bloqueando los estilos en línea (`style="..."`) del HTML pegado — justo lo que la herramienta necesita mostrar tal cual es. El aislamiento real de seguridad lo da el `sandbox` del iframe, no una CSP, así que quitarla no reduce la protección real contra el HTML que pegas.

Si vas a integrar esta herramienta en un sitio más grande con más páginas, sí puedes (y deberías) agregar una CSP en esas otras páginas — solo evita ponerla en el documento que contiene el editor.

## 📲 Instalar como aplicación

Si tu navegador lo soporta (Chrome, Edge, y la mayoría de navegadores basados en Chromium), verás un ícono de instalación en la barra de direcciones una vez que el sitio esté publicado en HTTPS (GitHub Pages ya lo es). Al instalarla:

- Se abre en su propia ventana, sin la barra del navegador.
- Queda con su propio ícono en el sistema.
- Sigue funcionando sin conexión gracias al service worker.

Safari (iOS/macOS) no dispara este ícono automático; ahí se instala manualmente desde **Compartir → Agregar a pantalla de inicio**, y también quedará con el ícono correcto.

Si actualizas `index.html`, `css/styles.css` o `js/app.js`, sube el número de versión en la primera línea útil de `sw.js` (`CACHE_VERSION`) para que los navegadores descarten la versión vieja cacheada y todos vean los cambios.

## 📝 Historial de versiones

### v2.0 — CodeMirror 6
- Editor reemplazado por CodeMirror 6 (bundle standalone, sin CDN).
- **Undo/Redo completo** con Ctrl+Z / Ctrl+Y.
- Números de línea, plegado de código, matcheo de paréntesis.
- Búsqueda y reemplazo integrados (Ctrl+F).
- Auto-cierre de brackets y etiquetas.
- Resaltado de sintaxis real (parser HTML con soporte CSS/JS embebido).
- Línea activa resaltada visualmente.
- Comentar/descomentar con Ctrl+/.
- Toda la barra de herramientas conservada y funcional.

### v1.0 — Editor original
- Editor basado en textarea con resaltado de sintaxis propio.
- Barra de herramientas con formato, colores, listas, tablas, enlaces.
- Previsualización en tiempo real con soporte de dispositivos móviles.
- Tema claro/oscuro, panel redimensionable, PWA.

## 🗒️ Notas

- Ningún dato de tu código se envía a ningún servidor. Las únicas cosas que se guardan en tu navegador (`localStorage`) son preferencias de interfaz: tema, ancho del panel, dispositivo y zoom elegidos. Nunca tu HTML.
- El botón "Indentar" solo reordena la sangría del código visualmente; nunca cambia el resultado ni el diseño.
- El botón "Formato" quita el formato (negrita, color, etc.) del texto seleccionado, incluida la etiqueta que lo envuelve, aunque no la hayas seleccionado literalmente.

---

## 👨‍💻 Créditos y Autoría

- **Desarrollado por:** Ing. César Pineda ([github.com/cesarpc1307](https://github.com/cesarpc1307))
- **Metodología:** Proyecto libre desarrollado mediante **Vibe Coding** y Asistencia de **Inteligencia Artificial**.
- **Tecnologías:** HTML5, CSS3, JavaScript ES6+ y [CodeMirror 6](https://codemirror.net/). Sin frameworks pesados, 100% libre y ejecutable de forma local.
