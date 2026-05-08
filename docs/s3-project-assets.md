# Configuración de AWS S3 para imágenes de proyectos

Esta guía configura S3 para que Dokiflux pueda guardar imágenes subidas por el usuario y pasarlas al generador de IA como assets del proyecto.

## 1. Crear el bucket

1. Entra en AWS Console.
2. Ve a `S3`.
3. Pulsa `Create bucket`.
4. Usa un nombre único, por ejemplo:

```txt
dokiflux-project-assets-prod
```

5. Elige la región, por ejemplo:

```txt
eu-west-1
```

6. En `Object Ownership`, selecciona:

```txt
ACLs disabled (recommended)
```

7. En `Block Public Access`, para el MVP con imágenes accesibles desde la preview, desactiva:

```txt
Block all public access
```

8. Confirma el aviso de AWS.
9. Crea el bucket.

## 2. Añadir política pública de lectura

Entra en el bucket y ve a:

```txt
Permissions → Bucket policy
```

Pega esta política, cambiando el nombre del bucket si usaste otro:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadProjectAssets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::dokiflux-project-assets-prod/media/*"
    }
  ]
}
```

Esto permite leer públicamente solo los objetos bajo `media/*`, que es donde Django subirá las imágenes.

## 3. Configurar CORS del bucket

En el bucket, ve a:

```txt
Permissions → Cross-origin resource sharing (CORS)
```

Pega:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://dokiflux.com",
      "https://www.dokiflux.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Si usas otro dominio de producción, añádelo en `AllowedOrigins`.

## 4. Crear usuario IAM para subidas

1. Ve a `IAM`.
2. Crea un usuario, por ejemplo:

```txt
dokiflux-s3-assets-prod
```

3. Selecciona acceso programático mediante access key.
4. Crea una policy inline o administrada con permisos mínimos.

Policy recomendada:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowProjectAssetUploads",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::dokiflux-project-assets-prod/media/*"
    },
    {
      "Sid": "AllowBucketLocation",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::dokiflux-project-assets-prod"
    }
  ]
}
```

No des permisos globales como `s3:*` sobre todos los buckets.

## 5. Variables de entorno

Añade estas variables a `.env.production` y al `.env.production.example`:

```env
# === AWS S3 — Project image assets ===
AWS_ACCESS_KEY_ID=AKIA-your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_STORAGE_BUCKET_NAME=dokiflux-project-assets-prod
AWS_S3_REGION_NAME=eu-west-1
AWS_S3_CUSTOM_DOMAIN=
AWS_S3_ENDPOINT_URL=
AWS_LOCATION=media
```

Si usas CloudFront o un dominio propio para assets:

```env
AWS_S3_CUSTOM_DOMAIN=assets.dokiflux.com
```

Si usas AWS S3 normal, deja `AWS_S3_ENDPOINT_URL` vacío.

## 6. Ejecutar migraciones

Después de desplegar los cambios, instala dependencias y ejecuta migraciones en backend.

En Docker Compose de producción:

```bash
sudo docker compose -f docker-compose.prod.yml build backend
sudo docker compose -f docker-compose.prod.yml run --rm backend python manage.py migrate
sudo docker compose -f docker-compose.prod.yml up -d
```

En desarrollo local:

```bash
pip install -r backend/requirements.txt
python backend/manage.py migrate
```

## 7. Validar subida

1. Abre un proyecto en Dokiflux.
2. En el input del chat, pulsa `Subir imágenes`.
3. Selecciona el tipo de asset:
   - `Logo`
   - `Hero`
   - `Producto`
   - `Galería`
   - `Fondo`
   - `Otro`
4. Sube una imagen JPG, PNG, WebP o GIF.
5. Comprueba que aparece la miniatura.
6. Genera un proyecto o pide una modificación como:

```txt
Usa mi logo en el navbar y la imagen hero como visual principal de la landing.
```

La IA recibirá una lista de assets con sus URLs y reglas para priorizarlos frente a Unsplash.

## 8. Reglas de seguridad recomendadas

- No guardes `AWS_SECRET_ACCESS_KEY` en el frontend.
- No subas imágenes directamente desde el navegador a S3 usando estas credenciales.
- Usa permisos IAM mínimos.
- Limita el bucket policy público únicamente a `media/*`.
- Mantén validación de MIME y tamaño en backend.
- Evita aceptar SVG sin sanitización.
- Usa nombres de archivo generados, no el nombre original como path final.
- Revisa costes y lifecycle policies para borrar assets antiguos si hace falta.

## 9. Lifecycle policy opcional

Si quieres limpiar imágenes de proyectos eliminados o assets antiguos, configura una lifecycle rule.

Para MVP no es obligatorio, porque al borrar un `ProjectAsset` Django elimina la referencia y puede borrar el objeto si se añade limpieza adicional. Para producción avanzada, se recomienda una tarea periódica que detecte objetos huérfanos en S3.

## 10. Posibles problemas

### La imagen no carga en la preview

Revisa:

- Bucket policy pública de lectura.
- CORS del bucket.
- URL generada por Django.
- `AWS_LOCATION` coincide con la policy `media/*`.

### Error `AccessDenied` al subir

Revisa:

- `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`.
- Policy IAM con `s3:PutObject` sobre `arn:aws:s3:::bucket/media/*`.
- Región correcta en `AWS_S3_REGION_NAME`.

### La IA sigue usando Unsplash

Recomendaciones:

- En el prompt del usuario, mencionar explícitamente `usa las imágenes subidas`.
- Etiquetar bien los assets como `logo`, `hero`, `product`, etc.
- Añadir más adelante una validación post-generación para detectar `images.unsplash.com` cuando hay assets adecuados.
