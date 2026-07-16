import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
import database as db
from utils.jwt_helper import crear_token_acceso

# Crear el enrutador para la autenticación de usuarios normales
router = APIRouter(
    prefix="/api/auth",
    tags=["Autenticación de Usuarios"]
)

# --- MODELOS PYDANTIC ---

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, description="Nombre de usuario")
    password: str = Field(..., min_length=4, description="Contraseña")
    email: EmailStr = Field(..., description="Correo electrónico del usuario (Obligatorio)")
    recovery_pin: str = Field(..., min_length=4, max_length=6, description="PIN de recuperación de 4 a 6 dígitos")

class LoginRequest(BaseModel):
    username: str = Field(..., description="Nombre de usuario")
    password: str = Field(..., description="Contraseña")

class RecoveryRequest(BaseModel):
    username: str = Field(..., description="Nombre de usuario")
    recovery_pin: str = Field(..., description="PIN de recuperación registrado")
    new_password: str = Field(..., min_length=4, description="Nueva contraseña del usuario")

# --- UTILIDAD DE HASH ---
def hashear_texto(texto: str) -> str:
    """
    Genera un hash SHA-256 seguro del texto (contraseñas y PINs).
    """
    return hashlib.sha256(texto.encode()).hexdigest()

# --- RUTAS DE AUTENTICACIÓN ---

@router.post("/register")
def api_register_user(req: RegisterRequest):
    """
    Registra un nuevo usuario con su usuario, correo, contraseña y PIN de recuperación.
    El registro se realiza directamente sin envíos de confirmación por correo externo.
    """
    try:
        username_limpio = req.username.strip().lower()
        email_limpio = req.email.strip().lower()
        pin_limpio = req.recovery_pin.strip()
        
        # 1. Validar que el usuario no exista
        usuario_existente = db.base_datos.users.find_one({"username": username_limpio})
        if usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de usuario ya se encuentra registrado."
            )
            
        # 2. Validar que el correo no esté registrado por otro usuario
        email_existente = db.base_datos.users.find_one({"email": email_limpio})
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está registrado por otro usuario."
            )
            
        # 3. Insertar nuevo usuario en MongoDB
        nuevo_usuario = {
            "username": username_limpio,
            "email": email_limpio,
            "password": hashear_texto(req.password),
            "recovery_pin": hashear_texto(pin_limpio),
            "created_at": datetime.utcnow().isoformat()
        }
        db.base_datos.users.insert_one(nuevo_usuario)
        
        return {"success": True, "message": "Cuenta creada con éxito. Ya puedes iniciar sesión."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el usuario: {e}"
        )

@router.post("/login")
def api_login_user(req: LoginRequest):
    """
    Autentica un usuario registrado mediante su nombre de usuario y contraseña.
    Si el usuario también es administrador en la colección 'admins', retorna is_admin=True.
    """
    try:
        username_limpio = req.username.strip().lower()
        hash_password = hashear_texto(req.password)
        
        # Buscar usuario en MongoDB
        usuario = db.base_datos.users.find_one({
            "username": username_limpio,
            "password": hash_password
        })
        
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="El nombre de usuario o contraseña ingresados son incorrectos."
            )
            
        # Verificar si también está registrado como administrador
        admin_check = db.base_datos.admins.find_one({"username": username_limpio})
        es_admin = admin_check is not None
            
        # Generar token JWT
        token = crear_token_acceso(username_limpio)
        return {
            "success": True, 
            "token": token, 
            "username": username_limpio,
            "is_admin": es_admin
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el inicio de sesión: {e}"
        )

@router.post("/recover")
def api_recover_password(req: RecoveryRequest):
    """
    Restablece la contraseña validando el PIN de recuperación de seguridad del usuario.
    """
    try:
        username_limpio = req.username.strip().lower()
        pin_limpio = req.recovery_pin.strip()
        
        # 1. Buscar usuario
        usuario = db.base_datos.users.find_one({"username": username_limpio})
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario ingresado no existe."
            )
            
        # 2. Validar PIN
        pin_guardado = usuario.get("recovery_pin")
        if not pin_guardado or pin_guardado != hashear_texto(pin_limpio):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El PIN de recuperación ingresado es incorrecto."
            )
            
        # 3. Actualizar contraseña
        nueva_clave_hash = hashear_texto(req.new_password)
        db.base_datos.users.update_one(
            {"username": username_limpio},
            {"$set": {"password": nueva_clave_hash}}
        )
        
        return {"success": True, "message": "Contraseña restablecida con éxito. Ya puedes iniciar sesión."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al restablecer la contraseña: {e}"
        )
