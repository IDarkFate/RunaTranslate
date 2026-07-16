import time
from fastapi import APIRouter, HTTPException, status, Request
from models import TranslationRequest, TranslationResponse
import services.translation_service as ts

# Crear el enrutador con su prefijo y etiquetas descriptivas
router = APIRouter(
    prefix="/api",
    tags=["Traducción"]
)

# --- CONFIGURACIÓN DE LIMITADOR DE PETICIONES (RATE LIMITING) ---
# Almacenamiento en memoria para rastrear IPs y tiempos
registro_limites = {}

# Límite configurado a un máximo de 30 consultas por minuto por cliente
LIMITE_PETICIONES = 30
VENTANA_TIEMPO_SEGUNDOS = 60

@router.post("/translate", response_model=TranslationResponse)
def api_translate(req: TranslationRequest, request: Request):
    """
    Endpoint principal para realizar traducciones de texto.
    
    Incluye un limitador de peticiones (Rate Limiter) basado en IP para evitar
    el abuso de cuotas en la API de OpenAI y garantizar la estabilidad.
    """
    # --- APLICAR RATE LIMITING ---
    ip_cliente = request.client.host if request.client else "127.0.0.1"
    ahora = time.time()
    
    if ip_cliente not in registro_limites:
        registro_limites[ip_cliente] = []
        
    # Limpiar marcas de tiempo que ya expiraron fuera de la ventana de un minuto
    registro_limites[ip_cliente] = [
        marca_tiempo for marca_tiempo in registro_limites[ip_cliente] 
        if ahora - marca_tiempo < VENTANA_TIEMPO_SEGUNDOS
    ]
    
    # Validar si la IP ha excedido el límite
    if len(registro_limites[ip_cliente]) >= LIMITE_PETICIONES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Límite de peticiones excedido (Máximo 30 por minuto). Por favor, intenta de nuevo más tarde."
        )
        
    # Registrar la petición actual
    registro_limites[ip_cliente].append(ahora)
    
    # --- EJECUTAR TRADUCCIÓN ---
    try:
        # Intentar obtener usuario desde cabecera de autenticación opcional
        username = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                import jwt
                from utils.jwt_helper import LLAVE_SECRETA_JWT, ALGORITMO_FIRMA
                carga_datos = jwt.decode(token, LLAVE_SECRETA_JWT, algorithms=[ALGORITMO_FIRMA])
                username = carga_datos.get("sub")
            except Exception:
                pass
                
        # Llamar al servicio principal de traducción (traducir)
        texto_traducido, descripcion_motor, motor, detected_lang = ts.traducir(
            req.text, req.source_lang, req.target_lang
        )
        
        # Registrar la traducción en el historial de MongoDB asociado al usuario con el idioma detectado
        db_id = ts.guardar_traduccion(
            req.text, texto_traducido, detected_lang, req.target_lang, username=username
        )
        
        # Retornar el esquema estructurado
        return TranslationResponse(
            id=db_id,
            original_text=req.text,
            translated_text=texto_traducido,
            source_lang=detected_lang,
            target_lang=req.target_lang,
            engine=motor,
            explanation=descripcion_motor,
            detected_lang=detected_lang
        )
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el servidor al realizar la traducción: {e}"
        )
