# HR Influence Strategy — Landing con Brief Builder

Prototipo de validación (TFG · NBL RRHH 2025).

## Qué hay adentro

- `index.html` — la landing completa, autocontenida (HTML + CSS + JS).
- `api/generate-brief.js` — función serverless que recibe el input del formulario, llama a la API de Anthropic y devuelve el brief en JSON.
- `package.json` — configuración mínima de Node.
- `README.md` — este archivo.

## Deploy en Vercel (paso a paso)

### 1. Obtener una clave de la API de Anthropic

- Entrá en https://console.anthropic.com
- Creá una cuenta (gratis, viene con USD 5 de crédito inicial)
- Andá a **Settings → API Keys** y generá una clave nueva
- Copiala y guardala — la vas a pegar en Vercel

### 2. Subir el proyecto a Vercel

- Entrá en https://vercel.com y creá una cuenta (podés usar GitHub o email)
- Hacé click en **Add New → Project**
- Elegí la opción **Upload a folder** (drag and drop) y subí la carpeta `hris-landing`
- En la pantalla de configuración, expandí la sección **Environment Variables** y agregá:
  - Nombre: `ANTHROPIC_API_KEY`
  - Valor: tu clave de Anthropic (la que copiaste en el paso 1)
- Hacé click en **Deploy**

### 3. Personalizar los mails de contacto

El sitio tiene dos lugares donde se abren clientes de email con `mailto:`. Editá `index.html` y buscá las dos apariciones de `CONTACTO@TU-DOMINIO.COM`. Reemplazalas por tu email real (puede ser tu email personal para validación). Después hacé **Deploy → Redeploy** en Vercel.

### 4. Compartir la URL

Vercel te da una URL pública automáticamente, algo como `hris-landing-xyz.vercel.app`. Esa es la URL que podés compartir en entrevistas de validación, con tus mentores, o incluir en el Demo Day.

## Costo esperado

El tier gratuito de Vercel alcanza de sobra. La API de Anthropic cuesta aproximadamente USD 0.02 por brief generado — con el crédito inicial de USD 5 tenés ~250 briefs gratis, más que suficiente para toda la validación.

## Logs y datos capturados

Cada vez que alguien genera un brief, el evento se loguea en Vercel (dashboard → Functions → Logs). Ahí podés ver qué roles y seniorities se están usando más, aunque no guarda los briefs completos por defecto. Si querés persistencia real, la próxima iteración puede agregar una base de datos (Vercel KV o Supabase, ambas tienen tier gratuito).
