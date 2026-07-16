import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- CONFIGURACIÓN DE SEGURIDAD JWT ---
LLAVE_SECRETA_JWT = "RunaTranslateSecretKey2026"
ALGORITMO_FIRMA = "HS256"
MINUTOS_EXPIRACION = 60

portador_token = HTTPBearer()

def crear_token_acceso(usuario: str) -> str:
    """
    Genera un token JWT firmado para el usuario administrador.
    Expiración configurada a 60 minutos.
    """
    carga_datos = {
        "sub": usuario,
        "exp": datetime.utcnow() + timedelta(minutes=MINUTOS_EXPIRACION),
        "iat": datetime.utcnow()
    }
    return jwt.encode(carga_datos, LLAVE_SECRETA_JWT, algorithm=ALGORITMO_FIRMA)

def validar_token_acceso(credenciales: HTTPAuthorizationCredentials = Security(portador_token)) -> str:
    """
    Valida las credenciales HTTPBearer (Header Authorization Bearer <token>).
    Lanza una excepción HTTP 401 si el token es inválido o ha expirado.
    """
    token = credenciales.credentials
    try:
        carga_datos = jwt.decode(token, LLAVE_SECRETA_JWT, algorithms=[ALGORITMO_FIRMA])
        return carga_datos.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ha expirado. Inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
