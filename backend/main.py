from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Importaciones de configuración y dependencias de la nueva arquitectura
from config import TIPO_BASE_DATOS
import database as db
import services.translation_service as ts

# Importaciones de los enrutadores modulares de la API
from routers import translation, history, education, feedback, admin, auth

# ==========================================================================
# INICIALIZACIÓN DE LA APLICACIÓN FASTAPI
# ==========================================================================

app = FastAPI(
    title="RunaTranslate API",
    description=(
        "Backend estructurado y modularizado de traducción inteligente para lenguas "
        "regionales (Quechua y Aymara). Diseñado para inclusión digital y preservación cultural."
    ),
    version="2.0.0"
)

# --- CONFIGURACIÓN DE CORS (Cross-Origin Resource Sharing) ---
# Permite peticiones locales de desarrollo y cualquier despliegue de producción o preview en Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://runatranslate.vercel.app"
    ],
    allow_origin_regex=r"https://runatranslate-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================================
# MANEJADORES GLOBALES DE EXCEPCIONES (RESPUESTAS JSON ESTANDARIZADAS)
# ==========================================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Captura excepciones HTTP explícitas de FastAPI y devuelve un formato estándar.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "codigo": exc.status_code,
            "mensaje": exc.detail,
            "detalle": None
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Captura errores de validación de esquemas (Pydantic / FastAPI).
    """
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "codigo": 422,
            "mensaje": "Error de validación en los datos de entrada.",
            "detalle": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Captura errores inesperados del sistema y evita caídas no controladas del servidor.
    """
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "codigo": 500,
            "mensaje": "Error interno del servidor al procesar la solicitud.",
            "detalle": str(exc)
        }
    )

# --- REGISTRO DE ENRUTADORES MODULARES ---
app.include_router(translation.router)
app.include_router(history.router)
app.include_router(education.router)
app.include_router(feedback.router)
app.include_router(admin.router)
app.include_router(auth.router)

# --- ENDPOINTS RAÍZ Y ESTADO GENERAL ---

@app.get("/")
def read_root():
    """
    Ruta raíz de presentación del servicio API.
    """
    return {
        "status": "online",
        "app": "RunaTranslate",
        "version": "2.0.0",
        "database": TIPO_BASE_DATOS,
        "openai_integrated": ts.cliente_openai is not None
    }

@app.get("/api/status")
def read_status():
    """
    Endpoint para verificación rápida de latencia e información de estado.
    """
    return {
        "status": "online",
        "database": TIPO_BASE_DATOS,
        "openai_integrated": ts.cliente_openai is not None
    }
