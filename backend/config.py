import os
from dotenv import load_dotenv

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

# --- CONFIGURACIÓN DE BASE DE DATOS (MONGODB) ---
# URI de conexión para MongoDB Atlas (en la nube)
URI_CONEXION_MONGO = os.getenv("MONGODB_URI")

# Nombre de la base de datos que se creará en MongoDB
NOMBRE_BASE_DATOS = "runatranslate"

# Constante para identificar el tipo de base de datos activa
TIPO_BASE_DATOS = "mongodb"

# Validación preventiva: Se requiere obligatoriamente una URI para arrancar el servidor
if not URI_CONEXION_MONGO:
    raise ValueError(
        "ERROR CRÍTICO DE CONFIGURACIÓN: La variable de entorno 'MONGODB_URI' "
        "no está definida en el archivo .env. Configura tu clúster de MongoDB Atlas."
    )

# Clave de API opcional para habilitar el motor de traducción avanzado
CLAVE_API_OPENAI = os.getenv("OPENAI_API_KEY")
if CLAVE_API_OPENAI:
    CLAVE_API_OPENAI = CLAVE_API_OPENAI.strip().strip('"').strip("'")

# --- LÍMITES Y PARÁMETROS GLOBALES (OPTIMIZACIÓN GRANDES DATOS) ---
# Cantidad máxima predeterminada de registros por página en consultas de historial
LIMITE_HISTORIAL_DEFECTO = 10

