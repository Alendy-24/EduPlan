# Cómo ejecutar EduPlan con el asistente virtual

Guía para levantar el proyecto en un computador nuevo (Windows / PowerShell) con el chatbot funcionando.

## Requisitos

- Git
- Java 21 o superior
- Node.js `^20.19` o `>=22.12`
- PostgreSQL con una base de datos vacía llamada `eduplan_db`
- Una API key propia de Groq (se crea en <https://console.groq.com/keys>)

## 1. Clonar el repositorio

```powershell
git clone https://github.com/Alendy-24/EduPlan
cd EduPlan
git checkout <rama-del-asistente>
```

## 2. Terminal 1: backend (Spring Boot)

```powershell
cd backend\src
$env:DB_URL = 'jdbc:postgresql://localhost:5432/eduplan_db'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = '<TU_CLAVE_DE_POSTGRES>'
$env:DATA_SYNC_ADMIN_TOKEN = '<TOKEN_ADMIN_GENERADO>'
$env:JWT_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:GROQ_API_KEY = '<TU_API_KEY_DE_GROQ>'
.\mvnw.cmd spring-boot:run
```

Notas:

- `DATA_SYNC_ADMIN_TOKEN` se puede generar con `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.
- `JWT_SECRET` se genera nuevo en cada arranque con el comando de arriba. Si cambia, hay que volver a iniciar sesión en la app.
- Las tablas se crean solas al arrancar (Flyway).

## 3. Terminal 2: catálogo (data-integration)

```powershell
cd data-integration
npm install
$env:PORT = '3001'
npm run dev
```

El puerto `3001` debe coincidir con el proxy de `frontend/vite.config.js`. Para comprobar que responde: <http://127.0.0.1:3001/health>.

## 4. Terminal 3: frontend

```powershell
cd frontend
npm install
npm run dev
```

La app queda en <http://localhost:3005>.

## 5. Probar el asistente

1. Regístrate o inicia sesión (el asistente solo funciona con sesión iniciada).
2. Abre la burbuja de chat.
3. Pregunta algo, por ejemplo: "¿Cómo comparo dos programas?".

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Could not resolve placeholder 'JWT_SECRET'` (u otra variable) | La variable no está definida en esa terminal | Definirla antes de ejecutar `mvnw` |
| `Could not resolve placeholder 'assistant.*'` | Faltan las líneas del asistente en `application.properties` | Agregar `assistant.base-url`, `assistant.api-key` y `assistant.model` |
| 404 en `/api/assistant/chat` | Falta `/api/assistant` en el proxy de Vite | Agregarlo en `frontend/vite.config.js` y reiniciar el frontend |
| 502 en `/api/institutions` | `data-integration` no está corriendo | Ejecutar la Terminal 2 con `PORT = 3001` |
| "El asistente no está disponible" | Error de Groq (key, modelo o límite) | Revisar la consola del backend |
| 401 en el chat | Sesión vencida o no iniciada | Volver a iniciar sesión |

## Configuración del asistente

En `backend/src/main/resources/application.properties`:

```properties
assistant.base-url=https://api.groq.com/openai/v1
assistant.api-key=${GROQ_API_KEY}
assistant.model=openai/gpt-oss-20b
```

El manual que usa el asistente está en `backend/src/main/resources/assistant/manual.md`.

> Las variables de PowerShell se pierden al cerrar la terminal. Para no reescribirlas, guárdalas en un archivo local (por ejemplo `env-local.ps1`) incluido en `.gitignore`.
