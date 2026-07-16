from fastapi import APIRouter, HTTPException, status, Depends, Request
from bson import ObjectId
from models import FeedbackRequest
import services.translation_service as ts
import database as db
from utils.jwt_helper import validar_token_acceso

# Crear el enrutador de retroalimentación
router = APIRouter(
    prefix="/api",
    tags=["Retroalimentación"]
)

@router.post("/feedback")
def api_post_feedback(req: FeedbackRequest, request: Request):
    """
    Registra la retroalimentación del usuario sobre una traducción.
    """
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

        exito = ts.guardar_feedback(
            calificacion=req.rating,
            texto_origen=req.source_text,
            texto_traducido=req.translated_text,
            idioma_origen=req.source_lang,
            idioma_destino=req.target_lang,
            texto_corregido=req.corrected_text,
            comentarios=req.comments
        )
        if not exito:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo procesar la retroalimentación."
            )
            
        # Si el usuario está autenticado, registrar automáticamente la traducción calificada en su historial
        db_id = None
        if username:
            db_id = ts.guardar_traduccion(
                req.source_text.strip(),
                req.translated_text.strip(),
                req.source_lang.strip(),
                req.target_lang.strip(),
                username=username
            )

        return {
            "success": True, 
            "id": db_id,
            "message": "Muchas gracias por tu retroalimentación. Tu sugerencia ayuda a re-entrenar la IA."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al registrar tu retroalimentación: {e}"
        )

@router.get("/public/feedback")
def api_get_public_feedbacks():
    """
    Retorna la lista de sugerencias de correcciones públicas hechas por la comunidad.
    """
    try:
        # Recuperar solo los feedbacks que tengan texto corregido sugerido
        feedbacks = list(db.base_datos.feedback.find(
            {"corrected_text": {"$exists": True, "$ne": None, "$ne": ""}}
        ).sort("timestamp", -1))
        
        # Formatear IDs y campos por defecto
        resultado = []
        for fb in feedbacks:
            fb_formatted = {
                "id": str(fb["_id"]),
                "source_text": fb.get("source_text", ""),
                "translated_text": fb.get("translated_text", ""),
                "corrected_text": fb.get("corrected_text", ""),
                "source_lang": fb.get("source_lang", ""),
                "target_lang": fb.get("target_lang", ""),
                "comments": fb.get("comments", ""),
                "rating": fb.get("rating", 0),
                "likes": fb.get("likes", 0),
                "liked_by": fb.get("liked_by", []),
                "timestamp": fb.get("timestamp", "")
            }
            resultado.append(fb_formatted)
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener las sugerencias de la comunidad: {e}"
        )

@router.post("/public/feedback/{feedback_id}/like")
def api_toggle_like_feedback(feedback_id: str, username: str = Depends(validar_token_acceso)):
    """
    Agrega o quita un "me gusta" a una sugerencia de la comunidad.
    Evita votos dobles controlando el listado 'liked_by'.
    """
    try:
        if not ObjectId.is_valid(feedback_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ID de sugerencia proporcionado no es válido."
            )
            
        obj_id = ObjectId(feedback_id)
        fb = db.base_datos.feedback.find_one({"_id": obj_id})
        if not fb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La sugerencia de corrección no existe."
            )
            
        liked_by = fb.get("liked_by", [])
        likes_count = fb.get("likes", 0)
        
        if username in liked_by:
            # Ya le dio like -> Quitar el like
            db.base_datos.feedback.update_one(
                {"_id": obj_id},
                {
                    "$pull": {"liked_by": username},
                    "$set": {"likes": max(0, likes_count - 1)}
                }
            )
            liked = False
            nuevos_likes = max(0, likes_count - 1)
        else:
            # No le ha dado like -> Agregar like
            db.base_datos.feedback.update_one(
                {"_id": obj_id},
                {
                    "$push": {"liked_by": username},
                    "$set": {"likes": likes_count + 1}
                }
            )
            liked = True
            nuevos_likes = likes_count + 1
            
        return {
            "success": True,
            "liked": liked,
            "likes": nuevos_likes
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el voto: {e}"
        )
