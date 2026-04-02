# DokiFlux — Guía de Despliegue en AWS EC2

Guía paso a paso para desplegar DokiFlux en producción con Docker Compose, Caddy (HTTPS automático) y CI/CD desde GitHub Actions.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear la instancia EC2](#2-crear-la-instancia-ec2)
3. [Configurar el servidor](#3-configurar-el-servidor)
4. [Primer despliegue](#4-primer-despliegue)
5. [Configurar el dominio (DNS)](#5-configurar-el-dominio-dns)
6. [Configurar CI/CD con GitHub Actions](#6-configurar-cicd-con-github-actions)
7. [Comandos útiles](#7-comandos-útiles)
8. [Backups](#8-backups)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Requisitos previos

- Cuenta de AWS con acceso a EC2
- Dominio `dokiflux.com` con acceso al panel DNS de tu registrador
- Repositorio en GitHub con el código de DokiFlux
- Claves de API (OpenAI, Anthropic, Gemini, Stripe, Brevo, Google OAuth)

---

## 2. Crear la instancia EC2

### 2.1 Lanzar la instancia

1. Ve a **AWS Console → EC2 → Launch Instance**
2. Configuración:
   - **Nombre**: `dokiflux-prod`
   - **AMI**: Ubuntu Server 24.04 LTS (HVM, SSD)
   - **Tipo de instancia**: `t3.medium` (2 vCPU, 4 GB RAM)
   - **Key pair**: Crear o seleccionar un par de claves (.pem). **Guárdalo bien.**
   - **Almacenamiento**: 30 GB gp3 (mínimo recomendado)

### 2.2 Security Group

Crea un Security Group con estas reglas de entrada (Inbound):

| Tipo  | Puerto | Origen    | Descripción       |
|-------|--------|-----------|--------------------|
| SSH   | 22     | Tu IP     | Acceso SSH         |
| HTTP  | 80     | 0.0.0.0/0 | Redirect a HTTPS  |
| HTTPS | 443    | 0.0.0.0/0 | Tráfico web       |

> **Importante**: Restringe SSH (puerto 22) solo a tu IP. Nunca lo dejes abierto a `0.0.0.0/0`.

### 2.3 Elastic IP

1. Ve a **EC2 → Elastic IPs → Allocate Elastic IP address**
2. Asocia la Elastic IP a tu instancia
3. Anota la IP — la necesitarás para el DNS

---

## 3. Configurar el servidor

### 3.1 Conectar por SSH

```bash
ssh -i tu-clave.pem ubuntu@<ELASTIC_IP>
```

### 3.2 Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sudo sh

# Añadir tu usuario al grupo docker (evita usar sudo)
sudo usermod -aG docker $USER

# Aplicar cambios de grupo (o cierra y abre sesión SSH)
newgrp docker

# Verificar
docker --version
docker compose version
```

### 3.4 Configurar swap (recomendado para t3.medium)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
```

### 3.5 Clonar el repositorio

```bash
sudo mkdir -p /opt/dokiflux
sudo chown $USER:$USER /opt/dokiflux
git clone https://github.com/TU_USUARIO/DokiFlux.git /opt/dokiflux
cd /opt/dokiflux
```

> Si el repo es privado, configura un **deploy key** o usa un **Personal Access Token**:
> ```bash
> git clone https://<TOKEN>@github.com/TU_USUARIO/DokiFlux.git /opt/dokiflux
> ```

### 3.6 Crear el archivo de entorno de producción

```bash
cd /opt/dokiflux
cp .env.production.example .env.production
nano .env.production
```

Rellena **todas** las variables. Las más críticas:

```bash
# Generar DJANGO_SECRET_KEY:
docker run --rm python:3.12-slim python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Generar POSTGRES_PASSWORD:
openssl rand -base64 32

# Generar REDIS_PASSWORD:
openssl rand -base64 24
```

**Recuerda** actualizar `REDIS_URL` con la contraseña generada:
```
REDIS_URL=redis://:TU_REDIS_PASSWORD@redis:6379/0
REDIS_PASSWORD=TU_REDIS_PASSWORD
```

---

## 4. Primer despliegue

### 4.1 Dar permisos al script de deploy

```bash
chmod +x deploy.sh
```

### 4.2 Build y arranque

```bash
cd /opt/dokiflux
docker compose -f docker-compose.prod.yml build --parallel
docker compose -f docker-compose.prod.yml up -d
```

### 4.3 Ejecutar migraciones

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### 4.4 Crear superusuario (opcional)

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 4.5 Verificar que todo funciona

```bash
# Ver estado de todos los servicios
docker compose -f docker-compose.prod.yml ps

# Ver logs (todos)
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy
```

> **Nota**: Caddy no podrá obtener certificados HTTPS hasta que el dominio apunte a la IP del servidor. Si aún no has configurado el DNS, verás errores de TLS en los logs de Caddy — es normal.

---

## 5. Configurar el dominio (DNS)

En el panel DNS de tu registrador de dominio, crea estos registros:

| Tipo | Nombre | Valor            | TTL  |
|------|--------|------------------|------|
| A    | @      | `<ELASTIC_IP>`   | 300  |
| A    | www    | `<ELASTIC_IP>`   | 300  |

### Verificar propagación DNS

```bash
# Desde tu máquina local
nslookup dokiflux.com
dig dokiflux.com +short

# O usa https://dnschecker.org
```

Una vez el DNS apunte a tu servidor, Caddy obtendrá automáticamente los certificados SSL de Let's Encrypt. Puede tardar 1-2 minutos.

### Verificar HTTPS

```bash
curl -I https://dokiflux.com
```

Deberías ver `HTTP/2 200` y headers de seguridad.

---

## 6. Configurar CI/CD con GitHub Actions

### 6.1 Generar clave SSH para deploy

En el servidor EC2:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Añadir la clave pública a authorized_keys
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys

# Copiar la clave privada (la necesitas para GitHub)
cat ~/.ssh/deploy_key
```

### 6.2 Configurar secrets en GitHub

Ve a tu repositorio en GitHub → **Settings → Secrets and variables → Actions → New repository secret**

Crea estos 3 secrets:

| Secret Name    | Valor                                      |
|----------------|--------------------------------------------|
| `EC2_HOST`     | La Elastic IP de tu instancia (ej: `3.120.45.67`) |
| `EC2_USER`     | `ubuntu` (usuario por defecto de Ubuntu AMI) |
| `EC2_SSH_KEY`  | El contenido completo de `~/.ssh/deploy_key` (clave privada) |

### 6.3 Probar el despliegue automático

1. Haz un cambio en el código
2. Commitea y haz push a `main`:
   ```bash
   git add .
   git commit -m "test: verify CI/CD pipeline"
   git push origin main
   ```
3. Ve a GitHub → **Actions** → Verás el workflow "Deploy to Production" ejecutándose
4. Si todo va bien, el deploy se completará en ~2-3 minutos

### 6.4 Flujo de trabajo recomendado

```
feature-branch → PR → merge a main → auto-deploy
```

- Trabaja en ramas (`feature/xxx`, `fix/xxx`)
- Crea Pull Requests a `main`
- Al hacer merge, GitHub Actions despliega automáticamente
- Si algo falla, revisa logs en GitHub Actions o en el servidor

---

## 7. Comandos útiles

### Servicios

```bash
cd /opt/dokiflux

# Ver estado
docker compose -f docker-compose.prod.yml ps

# Reiniciar todo
docker compose -f docker-compose.prod.yml restart

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Parar todo
docker compose -f docker-compose.prod.yml down

# Parar y eliminar volúmenes (⚠️ BORRA DATOS)
docker compose -f docker-compose.prod.yml down -v
```

### Logs

```bash
# Todos los logs
docker compose -f docker-compose.prod.yml logs -f

# Solo backend
docker compose -f docker-compose.prod.yml logs -f backend

# Solo errores de Caddy
docker compose -f docker-compose.prod.yml logs caddy | grep ERR

# Últimas 100 líneas de celery
docker compose -f docker-compose.prod.yml logs --tail=100 celery_worker
```

### Django management

```bash
# Shell interactivo
docker compose -f docker-compose.prod.yml exec backend python manage.py shell

# Migraciones
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Base de datos

```bash
# Acceder a PostgreSQL
docker compose -f docker-compose.prod.yml exec db psql -U dokiflux -d dokiflux

# Dump de la base de datos
docker compose -f docker-compose.prod.yml exec db pg_dump -U dokiflux dokiflux > backup_$(date +%Y%m%d).sql
```

### Limpieza

```bash
# Limpiar imágenes sin usar
docker image prune -f

# Limpiar todo (imágenes, contenedores parados, redes, caché)
docker system prune -af
```

---

## 8. Backups

### Backup manual de PostgreSQL

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U dokiflux dokiflux | gzip > /opt/backups/dokiflux_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Backup automático (cron)

```bash
# Crear directorio de backups
sudo mkdir -p /opt/backups

# Editar crontab
crontab -e

# Añadir esta línea para backup diario a las 3:00 AM
0 3 * * * cd /opt/dokiflux && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U dokiflux dokiflux | gzip > /opt/backups/dokiflux_$(date +\%Y\%m\%d).sql.gz && find /opt/backups -name "*.sql.gz" -mtime +7 -delete
```

Esto hace backup cada noche y elimina backups de más de 7 días.

### Restaurar un backup

```bash
gunzip -c /opt/backups/dokiflux_20260401.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U dokiflux -d dokiflux
```

---

## 9. Troubleshooting

### Caddy no obtiene certificado SSL

- Verifica que el DNS apunta a la IP correcta: `dig dokiflux.com +short`
- Verifica que los puertos 80 y 443 están abiertos en el Security Group
- Revisa logs: `docker compose -f docker-compose.prod.yml logs caddy`
- Caddy usa Let's Encrypt y necesita que el dominio resuelva a tu IP **antes** de emitir el certificado

### Backend devuelve 502 Bad Gateway

- Verifica que el backend está corriendo: `docker compose -f docker-compose.prod.yml ps`
- Revisa logs del backend: `docker compose -f docker-compose.prod.yml logs backend`
- Causa común: la DB no está lista. Espera a que el healthcheck de PostgreSQL pase

### Errores CORS

- Verifica que `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` en `.env.production` incluyen `https://dokiflux.com`
- Verifica que `FRONTEND_URL` es `https://dokiflux.com`

### Celery no procesa tareas

- Revisa logs: `docker compose -f docker-compose.prod.yml logs celery_worker`
- Verifica que Redis está corriendo y la contraseña es correcta
- Verifica `REDIS_URL` en `.env.production`

### El frontend no carga / muestra API errors

- Verifica que `NEXT_PUBLIC_API_URL=https://dokiflux.com/api` está configurado
- **Importante**: `NEXT_PUBLIC_*` se inyectan en build-time. Si cambias estas variables, necesitas **reconstruir** el frontend:
  ```bash
  docker compose -f docker-compose.prod.yml build frontend
  docker compose -f docker-compose.prod.yml up -d frontend
  ```

### Memoria insuficiente

- Verifica swap: `free -h`
- Si no tienes swap configurado, mira la sección 3.4
- Revisa consumo: `docker stats`

### Stripe webhooks no llegan

1. En [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), crea un endpoint:
   - URL: `https://dokiflux.com/api/billing/webhook/`
   - Eventos: selecciona los relevantes (checkout.session.completed, etc.)
2. Copia el **Signing secret** (`whsec_...`) y ponlo en `STRIPE_WEBHOOK_SECRET` en `.env.production`
3. Reinicia el backend:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

---

## Arquitectura de producción

```
Internet
    │
    ▼
┌─────────────────────────────────────────────┐
│  EC2 t3.medium (Ubuntu 24.04)               │
│                                             │
│  ┌─────────┐                                │
│  │  Caddy   │ :80 / :443 (HTTPS auto)      │
│  └────┬─────┘                                │
│       │                                      │
│  ┌────┴──────────────┐                       │
│  │                    │                       │
│  │  /api/*  /admin/*  │  /*                  │
│  │       │            │   │                  │
│  │  ┌────▼────┐  ┌───▼────┐                 │
│  │  │ Django  │  │Next.js │                  │
│  │  │ uvicorn │  │standalone│                │
│  │  │  :8000  │  │  :3000 │                 │
│  │  └────┬────┘  └────────┘                  │
│  │       │                                    │
│  │  ┌────┼────────┐                           │
│  │  │    │         │                          │
│  │  ▼    ▼         ▼                          │
│  │ PG16 Redis7  Celery                       │
│  └───────────────────────────────────────────┘
│                                               │
└───────────────────────────────────────────────┘
```

**Caddy** gestiona HTTPS automáticamente con Let's Encrypt. No necesitas renovar certificados manualmente.
