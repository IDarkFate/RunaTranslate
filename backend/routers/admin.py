import hashlib
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, EmailStr
from typing import List
import database as db
import services.admin_service as ads
from models import LoginRequest
from utils.jwt_helper import crear_token_acceso, validar_token_acceso

# Crear el enrutador administrativo
router = APIRouter(
    prefix="/api/admin",
    tags=["Administración"]
)

# --- MODELOS PYDANTIC ---

class QuizCreateRequest(BaseModel):
    question: str = Field(..., description="Pregunta de la trivia")
    options: List[str] = Field(..., min_items=2, max_items=6, description="Opciones de respuesta")
    correct_answer: int = Field(..., description="Índice de la respuesta correcta (1-based o 0-based, según convención frontend)")
    explanation: str = Field(..., description="Explicación detallada de la respuesta correcta")
    score: int = Field(10, description="Puntaje otorgado por responder correctamente")

class AdminCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, description="Nombre de usuario del nuevo admin")
    password: str = Field(..., min_length=4, description="Contraseña del nuevo admin")
    email: EmailStr = Field(..., description="Correo electrónico del nuevo admin")
    recovery_pin: str = Field(..., min_length=4, max_length=6, description="PIN de recuperación de 4 a 6 dígitos")

# --- UTILIDAD DE HASH DE CONTRASEÑA ---
def hashear_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# --- RUTAS ADMINISTRATIVAS ---

@router.post("/login")
def api_admin_login(req: LoginRequest):
    """
    Endpoint para autenticación de administradores.
    Consulta la colección 'admins' de MongoDB Atlas.
    """
    try:
        username_limpio = req.username.strip().lower()
        hash_password = hashear_password(req.password)
        
        # Buscar en la colección de administradores
        admin_user = db.base_datos.admins.find_one({
            "username": username_limpio,
            "password": hash_password
        })
        
        if admin_user:
            token = crear_token_acceso(username_limpio)
            return {"success": True, "token": token}
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el proceso de login administrativo: {e}"
        )

@router.get("/stats")
def api_admin_stats(administrador: str = Depends(validar_token_acceso)):
    """
    Obtiene métricas estadísticas globales del sistema de traducción.
    """
    try:
        return ads.get_admin_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas del panel administrativo: {e}"
        )

@router.get("/feedback")
def api_admin_feedback(limite: int = 50, salto: int = 0, administrador: str = Depends(validar_token_acceso)):
    """
    Recupera la lista de comentarios e ideas de corrección sugeridas por los usuarios.
    """
    try:
        return ads.get_admin_feedbacks(limit=limite, skip=salto)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo el buzón de correcciones: {e}"
        )

# --- 1. CRUD DE PREGUNTAS DE TRIVIA (CUESTIONARIOS) ---

@router.get("/quizzes")
def api_admin_get_quizzes(administrador: str = Depends(validar_token_acceso)):
    """
    Retorna la lista completa de preguntas de trivia registradas en el sistema.
    """
    try:
        quizzes = list(db.base_datos.quizzes.find())
        # Convertir ObjectId a string para serialización JSON
        for q in quizzes:
            q["id"] = str(q["_id"])
            del q["_id"]
        return quizzes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener cuestionarios de trivia: {e}"
        )

@router.post("/quizzes")
def api_admin_add_quiz(req: QuizCreateRequest, administrador: str = Depends(validar_token_acceso)):
    """
    Agrega una nueva pregunta de trivia al sistema.
    """
    try:
        nuevo_quiz = {
            "question": req.question.strip(),
            "options": [opt.strip() for opt in req.options],
            "correct_answer": req.correct_answer,
            "explanation": req.explanation.strip(),
            "score": req.score
        }
        resultado = db.base_datos.quizzes.insert_one(nuevo_quiz)
        nuevo_quiz["id"] = str(resultado.inserted_id)
        if "_id" in nuevo_quiz:
            del nuevo_quiz["_id"]
        return {"success": True, "message": "Pregunta agregada con éxito.", "quiz": nuevo_quiz}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al agregar la pregunta de trivia: {e}"
        )

@router.delete("/quizzes/{quiz_id}")
def api_admin_delete_quiz(quiz_id: str, administrador: str = Depends(validar_token_acceso)):
    """
    Elimina una pregunta de trivia por su ID único.
    """
    try:
        if not ObjectId.is_valid(quiz_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ID de la pregunta proporcionado no es válido."
            )
            
        resultado = db.base_datos.quizzes.delete_one({"_id": ObjectId(quiz_id)})
        
        if resultado.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La pregunta de trivia no fue encontrada."
            )
            
        return {"success": True, "message": "Pregunta de trivia eliminada exitosamente."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la pregunta de trivia: {e}"
        )

# --- 2. CREACIÓN DE NUEVOS ADMINISTRADORES ---

@router.post("/create-admin")
def api_admin_create_new_admin(req: AdminCreateRequest, administrador: str = Depends(validar_token_acceso)):
    """
    Permite que un administrador autenticado cree un nuevo usuario administrador en el sistema.
    Asocia también una cuenta de usuario normal para posibilitar el login regular y recuperación por PIN.
    """
    try:
        from datetime import datetime
        username_limpio = req.username.strip().lower()
        email_limpio = req.email.strip().lower()
        pin_limpio = req.recovery_pin.strip()
        
        # 1. Validar duplicados en admins
        admin_existente = db.base_datos.admins.find_one({"username": username_limpio})
        if admin_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de usuario administrador ya está registrado."
            )
            
        # 2. Validar duplicados en users
        email_existente = db.base_datos.users.find_one({"email": email_limpio})
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya se encuentra registrado por otro usuario."
            )
            
        hash_pass = hashear_password(req.password)
        hash_pin = hashear_password(pin_limpio)
        fecha_actual = datetime.utcnow().isoformat()
            
        # 3. Registrar en admins
        nuevo_admin = {
            "username": username_limpio,
            "email": email_limpio,
            "password": hash_pass,
            "recovery_pin": hash_pin,
            "created_by": administrador,
            "created_at": fecha_actual
        }
        db.base_datos.admins.insert_one(nuevo_admin)
        
        # 4. Registrar en users (para permitir login desde el modal público y recuperación por PIN)
        if not db.base_datos.users.find_one({"username": username_limpio}):
            nuevo_usuario = {
                "username": username_limpio,
                "email": email_limpio,
                "password": hash_pass,
                "recovery_pin": hash_pin,
                "created_at": fecha_actual
            }
            db.base_datos.users.insert_one(nuevo_usuario)
        
        return {"success": True, "message": f"Nuevo administrador '{username_limpio}' registrado con éxito por {administrador}."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear el nuevo administrador: {e}"
        )
