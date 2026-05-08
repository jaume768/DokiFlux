# Guía de configuración de Meta Ads Tracking para Dokiflux

Esta guía explica cómo conseguir y configurar las variables necesarias para medir campañas de Meta/Facebook Ads en Dokiflux usando Meta Pixel en frontend y Conversions API en backend.

## Variables necesarias

```env
META_PIXEL_ID=your-meta-pixel-id
META_CAPI_TOKEN=your-meta-capi-token
NEXT_PUBLIC_META_PIXEL_ID=your-meta-pixel-id
META_CAPI_TEST_EVENT_CODE=
```

## Qué hace cada variable

### `META_PIXEL_ID`

ID del Pixel/Dataset de Meta.

Lo usa el backend para enviar eventos server-side mediante Conversions API.

### `NEXT_PUBLIC_META_PIXEL_ID`

Mismo ID que `META_PIXEL_ID`, pero expuesto al frontend de Next.js.

Lo usa el navegador para cargar Meta Pixel y disparar eventos browser-side.

### `META_CAPI_TOKEN`

Token secreto de Conversions API.

Lo usa solo el backend. Nunca debe exponerse al navegador ni tener prefijo `NEXT_PUBLIC_`.

### `META_CAPI_TEST_EVENT_CODE`

Código temporal para probar eventos en `Events Manager → Test Events`.

En producción final normalmente debe quedar vacío.

---

## 1. Crear o entrar en Meta Business Manager

1. Ve a:

```txt
https://business.facebook.com/
```

2. Entra con tu cuenta de Facebook.
3. Crea una cuenta empresarial si todavía no tienes una.
4. Asegúrate de tener permisos de administrador.

Necesitas tener configurado:

- Cuenta empresarial.
- Cuenta publicitaria.
- Método de pago si vas a lanzar anuncios.
- Dominio principal de Dokiflux.

---

## 2. Abrir Events Manager

1. En Meta Business Suite, abre el menú de herramientas.
2. Entra en:

```txt
Events Manager
```

También puedes entrar directamente desde:

```txt
https://business.facebook.com/events_manager
```

---

## 3. Crear un Pixel/Dataset

1. Dentro de Events Manager, pulsa:

```txt
Connect data sources
```

2. Selecciona:

```txt
Web
```

3. Elige:

```txt
Meta Pixel
```

O, si Meta lo muestra con la interfaz nueva:

```txt
Dataset
```

4. Pon un nombre reconocible, por ejemplo:

```txt
Dokiflux Website
```

5. Introduce el dominio:

```txt
dokiflux.com
```

6. Finaliza la creación.

---

## 4. Conseguir `META_PIXEL_ID`

1. Entra en `Events Manager`.
2. Selecciona el dataset/pixel que acabas de crear.
3. Busca el identificador numérico llamado:

```txt
Dataset ID
```

O en algunas interfaces:

```txt
Pixel ID
```

Será un número similar a:

```txt
123456789012345
```

Ese valor va en:

```env
META_PIXEL_ID=123456789012345
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

Ambas variables deben tener el mismo valor.

---

## 5. Conseguir `META_CAPI_TOKEN`

1. En `Events Manager`, selecciona tu Dataset/Pixel.
2. Ve a:

```txt
Settings
```

3. Busca la sección:

```txt
Conversions API
```

4. Pulsa una opción similar a:

```txt
Generate access token
```

O:

```txt
Set up manually → Generate token
```

5. Copia el token generado.

Será un valor largo parecido a:

```txt
EAABsbCS1iHgBO...
```

Configúralo solo en backend:

```env
META_CAPI_TOKEN=EAABsbCS1iHgBO...
```

No lo pongas nunca en una variable `NEXT_PUBLIC_*`.

---

## 6. Conseguir `META_CAPI_TEST_EVENT_CODE`

Este código sirve para probar que los eventos llegan correctamente a Meta.

1. Entra en `Events Manager`.
2. Selecciona tu Dataset/Pixel.
3. Ve a:

```txt
Test Events
```

4. Busca la sección de pruebas de servidor o navegador.
5. Copia el código de test.

Meta suele mostrar un código parecido a:

```txt
TEST12345
```

Configúralo temporalmente:

```env
META_CAPI_TEST_EVENT_CODE=TEST12345
```

Cuando termines las pruebas, déjalo vacío:

```env
META_CAPI_TEST_EVENT_CODE=
```

---

## 7. Configurar `.env.production`

En producción, el bloque debería quedar así:

```env
META_PIXEL_ID=123456789012345
META_CAPI_TOKEN=EAABsbCS1iHgBO-your-real-token
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
META_CAPI_TEST_EVENT_CODE=
```

Para pruebas temporales:

```env
META_PIXEL_ID=123456789012345
META_CAPI_TOKEN=EAABsbCS1iHgBO-your-real-token
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
META_CAPI_TEST_EVENT_CODE=TEST12345
```

Después de cambiar estas variables, reinicia frontend y backend.

---

## 8. Verificar el dominio en Meta

Para campañas reales es recomendable verificar el dominio.

1. En Meta Business Settings, ve a:

```txt
Brand Safety → Domains
```

O:

```txt
Business Settings → Brand Safety → Domains
```

2. Añade:

```txt
dokiflux.com
```

3. Meta te ofrecerá varios métodos:

- DNS TXT.
- Archivo HTML.
- Meta tag.

Recomendación: usar DNS TXT.

4. Copia el registro TXT que te da Meta.
5. Añádelo en tu proveedor DNS.
6. Espera la propagación.
7. Pulsa `Verify` en Meta.

---

## 9. Configurar eventos web priorizados

En Meta, ve a:

```txt
Events Manager → Aggregated Event Measurement
```

O en algunas interfaces:

```txt
Web Event Configurations
```

Configura los eventos que quieres optimizar.

Para Dokiflux, orden recomendado:

1. `Purchase`
2. `Subscribe`
3. `StartTrial`
4. `CompleteRegistration`
5. `Lead`
6. `PageView`

Actualmente Dokiflux ya trackea:

- `PageView`
- `StartTrial`
- `CompleteRegistration`
- `Lead`

Cuando Stripe esté completamente integrado para pagos reales, conviene añadir:

- `Purchase`
- `Subscribe`

---

## 10. Probar eventos en Meta

Con `META_CAPI_TEST_EVENT_CODE` configurado:

```env
META_CAPI_TEST_EVENT_CODE=TEST12345
```

Reinicia servicios y prueba estas acciones:

### Probar `PageView`

1. Abre la landing de Dokiflux.
2. En Meta, ve a:

```txt
Events Manager → Test Events
```

3. Deberías ver:

```txt
PageView
```

### Probar `StartTrial`

1. Inicia una demo desde la landing.
2. Deberías ver:

```txt
StartTrial
```

### Probar `CompleteRegistration`

1. Registra un usuario nuevo por email.
2. Deberías ver:

```txt
CompleteRegistration
```

3. También puedes probar registro con Google.

### Probar `Lead`

1. Envía el formulario de contacto.
2. Deberías ver:

```txt
Lead
```

---

## 11. Comprobar deduplicación Pixel + CAPI

Dokiflux dispara algunos eventos por dos vías:

- Browser Pixel.
- Backend Conversions API.

Ambos comparten un mismo `event_id`.

Meta debería mostrar que los eventos están deduplicados, no duplicados.

En Events Manager revisa:

```txt
Event Match Quality
```

Y detalles del evento:

```txt
Received from Browser
Received from Server
Deduplicated
```

Si Meta muestra eventos duplicados, revisa que el frontend esté enviando el header:

```txt
X-Meta-Event-Id
```

Y que backend esté recibiéndolo correctamente.

---

## 12. Instalar Meta Pixel Helper

Para validar el navegador, instala la extensión:

```txt
Meta Pixel Helper
```

En Chrome:

```txt
https://chromewebstore.google.com/
```

Después:

1. Abre `dokiflux.com`.
2. Pulsa la extensión.
3. Comprueba que aparece tu Pixel ID.
4. Comprueba que se dispara `PageView`.
5. Realiza acciones como registro o demo.

---

## 13. Checklist final

Antes de lanzar campañas, comprueba:

- `META_PIXEL_ID` configurado en backend.
- `NEXT_PUBLIC_META_PIXEL_ID` configurado en frontend.
- Ambos IDs son iguales.
- `META_CAPI_TOKEN` configurado solo en backend.
- `META_CAPI_TEST_EVENT_CODE` vacío en producción final.
- Dominio `dokiflux.com` verificado en Meta.
- Pixel Helper detecta el Pixel.
- Events Manager recibe eventos de navegador.
- Events Manager recibe eventos de servidor.
- No hay duplicación incorrecta de eventos.
- `StartTrial`, `CompleteRegistration` y `Lead` aparecen correctamente.

---

## 14. Problemas comunes

### No aparece `PageView`

Revisa:

- `NEXT_PUBLIC_META_PIXEL_ID` está definido.
- Frontend fue reconstruido después de cambiar `.env.production`.
- No hay bloqueador de anuncios activo.
- El componente `MetaPixel` está montado en el layout.

### No aparecen eventos de servidor

Revisa:

- `META_PIXEL_ID` está definido en backend.
- `META_CAPI_TOKEN` es correcto.
- Backend fue reiniciado.
- El token no expiró o fue revocado.
- Logs del backend para errores `Meta CAPI`.

### Eventos aparecen en Test Events pero no en producción

Revisa:

- `META_CAPI_TEST_EVENT_CODE` sigue configurado.
- Déjalo vacío para producción final.

### Meta muestra baja calidad de coincidencia

Puede mejorar enviando más datos válidos:

- email hasheado
- external ID hasheado
- `_fbp`
- `_fbc`
- IP
- User Agent

Dokiflux ya envía estos datos cuando están disponibles.

### Eventos duplicados

Revisa que el `event_id` sea el mismo en Pixel y CAPI.

Dokiflux ya lo implementa mediante:

- `X-Meta-Event-Id`
- `trackMetaEvent(..., eventId, ...)`
- `track_from_request(...)`

---

## 15. Seguridad

- No subas `META_CAPI_TOKEN` al frontend.
- No uses `NEXT_PUBLIC_META_CAPI_TOKEN`.
- No publiques tokens reales en GitHub.
- Guarda tokens reales solo en `.env.production` o en secretos del proveedor de deploy.
- Rota el token si sospechas que se filtró.

---

## 16. Nota legal para Europa

Meta Pixel y CAPI pueden requerir consentimiento de marketing bajo GDPR/ePrivacy.

Para producción en Europa, lo recomendable es:

1. Mostrar banner de cookies.
2. No cargar Meta Pixel hasta consentimiento.
3. No enviar eventos CAPI de marketing sin consentimiento.
4. Registrar el consentimiento del usuario.

La integración actual funciona técnicamente, pero conviene añadir una capa de consentimiento antes de escalar campañas.
