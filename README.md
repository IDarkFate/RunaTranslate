# RunaTranslate - Traductor Inteligente de Lenguas Regionales

**RunaTranslate** es una plataforma web inteligente diseñada para la traducción bidireccional y la preservación cultural de lenguas originarias del Perú: **Quechua** y **Aymara**.

El proyecto promueve la inclusión digital y educativa mediante tecnologías emergentes, permitiendo a los usuarios interactuar a través de texto y voz, evaluar la precisión de las traducciones mediante un bucle de retroalimentación de IA, estudiar vocabulario bilingüe, jugar desafíos lingüísticos y monitorear el sistema en un panel administrativo.

---

## 🚀 Características Clave

1. **Traducción Inteligente Multimodal**:
   - Traducción Español ↔ Quechua y Español ↔ Aymara.
   - **Reconocimiento de Voz (Speech to Text - STT)** y **Lectura en Voz Alta (Text to Speech - TTS)** nativos de navegador sin costos de API adicionales.
2. **Motor de IA Adaptativo (Dual)**:
   - **Local**: Motor basado en diccionarios estructurados y reglas gramaticales para alta velocidad fuera de línea.
   - **Avanzado (OpenAI)**: Integración con modelos de lenguaje masivos (`gpt-4o-mini`) para traducciones conscientes del contexto cuando se configura una API Key.
3. **Persistencia de Datos Dual Híbrida**:
   - Funciona de forma predeterminada con una base de datos local **SQLite** (cero configuración).
   - Soporte listo para conectar a **MongoDB Atlas en la nube** mediante variables de entorno con fallback automático si falla la red.
4. **Centro de Preservación Cultural**:
   - **Diccionario Interactivo**: Consulta de vocabulario por categorías con pronunciación de audio.
   - **Trivia / Quizzes**: Minijuegos interactivos de opción múltiple con sistema de puntajes y explicaciones gramaticales para incentivar el aprendizaje.
5. **Panel Administrativo y Analítica**:
   - Visualización de volumen de traducción, ratings promedios y distribución por idiomas.
   - Bandeja de entrada de **Correcciones Sugeridas** enviadas por los usuarios para optimizar el motor lingüístico de IA de forma continua.

---

## 🛠️ Requisitos del Sistema

* **Python 3.10+** (Probado en Python 3.14)
* **Node.js 18+** y **npm** (Probado en Node 22)
* Un navegador moderno (se recomienda **Google Chrome** para el soporte completo de voz STT/TTS).

---

## 📦 Estructura del Proyecto

```
runatranslate/
├── README.md               # Este archivo de documentación
├── backend/                # Servidor FastAPI (Python)
│   ├── .venv/              # Entorno virtual de Python
│   ├── data/               # Archivos JSON (Diccionarios y Quizzes)
│   ├── database.py         # Capa de datos (SQLite / MongoDB Atlas)
│   ├── translator.py       # Algoritmos de traducción (Local / OpenAI)
│   ├── main.py             # Rutas y controladores de la API
│   ├── requirements.txt    # Dependencias de Python
│   └── test_main.py        # Pruebas unitarias de backend
└── frontend/               # Cliente React SPA (Vite)
    ├── index.html          # Plantilla HTML
    ├── vite.config.js      # Configuración de proxy para desarrollo
    ├── src/
    │   ├── main.jsx        # Punto de entrada de React
    │   ├── App.jsx         # Integración y navegación de pestañas
    │   ├── index.css       # Estilos globales (Glassmorphic Premium Theme)
    │   └── components/     # Componentes del cliente (Translator, LearnHub, etc.)
```

---

## 🔌 Configuración de Variables de Entorno

Para habilitar la IA avanzada de OpenAI y guardar los datos en MongoDB Atlas en la nube, crea un archivo `.env` en el directorio de la carpeta **`backend/`** con las siguientes variables:

```env
# Clave de API de OpenAI para traducciones avanzadas por IA (Opcional)
OPENAI_API_KEY=tu_api_key_aqui

# Cadena de conexión de MongoDB Atlas en la nube (Opcional, si no se especifica usa SQLite local)
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.xxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## 🌐 Guía de Configuración de MongoDB Atlas en la Nube

Si deseas almacenar el historial de traducción y el feedback en la nube usando MongoDB Atlas:
1. Regístrate de forma gratuita en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Crea un nuevo clúster compartido gratuito (M0 Sandbox) y selecciona tu proveedor (ej. AWS) y región preferida.
3. En la sección **Database Access**, crea un usuario con rol de lectura y escritura (`Read and write to any database`).
4. En **Network Access**, agrega una regla para permitir accesos desde tu IP o selecciona `0.0.0.0/0` (permitir acceso desde cualquier lugar durante desarrollo).
5. Ve a **Database** -> Haz clic en **Connect** -> Selecciona **Drivers** (Python).
6. Copia la cadena de conexión generada, reemplaza `<password>` con la contraseña de tu usuario creado y configúrala como `MONGODB_URI` en tu archivo `.env`.

---

## 🚀 Instrucciones para Iniciar

### 1. Iniciar el Servidor Backend (FastAPI)

Desde el directorio raíz del proyecto:

```powershell
# Entrar a la carpeta del backend
cd backend

# (Ya creado en instalación) Activar entorno virtual
.venv\Scripts\Activate.ps1

# Ejecutar el servidor uvicorn
uvicorn main:app --reload
```

El backend se iniciará en `http://127.0.0.1:8000`. Puedes explorar la documentación interactiva de la API en `http://127.0.0.1:8000/docs`.

### 2. Iniciar el Cliente Frontend (React)

En otra consola de terminal, desde el directorio raíz del proyecto:

```powershell
# Entrar a la carpeta del frontend
cd frontend

# Iniciar servidor de desarrollo
npm run dev
```

El cliente se iniciará en `http://localhost:5173`. Abre esa dirección en tu navegador (se recomienda usar Google Chrome) para probar RunaTranslate.

---

## 🧪 Pruebas Unitarias

Para comprobar de forma automatizada que el motor de traducción y la capa de base de datos están funcionando correctamente, ejecuta el siguiente comando dentro de la carpeta `backend`:

```powershell
.venv\Scripts\python test_main.py
```
