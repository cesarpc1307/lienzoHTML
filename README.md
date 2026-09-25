# Lienzo HTML

Editor de HTML con previsualización en vivo para **PC, tablet y celular**. Escribe o pega código HTML y velo renderizado al instante, respetando tu diseño tal cual es — sin reorganizar tu contenido, sin romper tus estilos.

100% del lado del cliente: no hay backend, no hay servidor que reciba tu código. Todo corre en tu navegador.

## ✨ Características

- **Editor de código con resaltado de sintaxis** (etiquetas, atributos, valores, comentarios), en tema claro y oscuro.
- **Barra de herramientas** que aplica formato envolviendo tu selección: negrita, cursiva, subrayado, tachado, encabezados, listas, color de texto/fondo (con selector nativo + paleta), enlaces y tablas configurables (filas/columnas a elegir, más un botón para añadir filas a una tabla existente).
- **Previsualización en tiempo real** para PC, y para celular/tablet con más de 15 resoluciones reales (iPhone, Samsung, Pixel, iPad, etc.).
- **Zoom + auto-ajuste** en la vista móvil, para que dispositivos altos (como el iPhone Pro Max) entren completos en la ventana, con control manual de zoom (25%–150%).
- **Panel redimensionable** entre el editor y la previsualización.
- **Tema claro / oscuro** para la interfaz (la previsualización siempre se mantiene en blanco, fiel al diseño real de tu HTML).
- **Instalable como aplicación** (PWA): en Chrome/Edge aparece el ícono de instalar en la barra de direcciones; funciona sin conexión una vez cargada.
- **Sin dependencias externas**: no usa ningún CDN ni librería de terceros. Todo el código es propio.

## 🚀 Cómo usarlo

Solo abre `index.html` en el navegador (doble clic) o publícalo en GitHub Pages — no requiere instalación, compilación ni servidor.

### Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a un repositorio de GitHub.
2. Ve a **Settings → Pages**.
3. En "Source", elige la rama (por ejemplo `main`) y la carpeta `/root`.
4. Guarda. GitHub te dará una URL tipo `https://tuusuario.github.io/turepo/`.

No necesitas ningún paso de build: son archivos estáticos.

## 📁 Estructura del proyecto

```
Lienzo HTML/
├── index.html          # La aplicación (editor + toolbar + previsualización)
├── manifest.json         # Metadatos para poder "instalar" la app
├── sw.js                  # Service worker (caché para uso sin conexión)
├── css/
│   └── styles.css         # Estilos de la interfaz (tema claro/oscuro incluido)
├── js/
│   └── app.js              # Toda la lógica: editor, resaltado, zoom, tema, etc.
└── icons/
    ├── favicon.svg
    ├── favicon-16.png / favicon-32.png
    ├── apple-touch-icon.png
    ├── icon-192.png / icon-512.png
    └── icon-512-maskable.png
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

## 🗒️ Notas

- Ningún dato de tu código se envía a ningún servidor. Las únicas cosas que se guardan en tu navegador (`localStorage`) son preferencias de interfaz: tema, ancho del panel, dispositivo y zoom elegidos. Nunca tu HTML.
- El botón "Indentar" solo reordena la sangría del código visualmente; nunca cambia el resultado ni el diseño.
- El botón "Formato" quita el formato (negrita, color, etc.) del texto seleccionado, incluida la etiqueta que lo envuelve, aunque no la hayas seleccionado literalmente.

---

Hecho con HTML, CSS y JavaScript puros. Sin frameworks, sin build, sin dependencias.
