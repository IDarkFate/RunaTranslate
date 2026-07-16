from fastapi import APIRouter, HTTPException, status, Depends
from models import StarRequest
import services.translation_service as ts
from config import LIMITE_HISTORIAL_DEFECTO
from utils.jwt_helper import validar_token_acceso

# Crear el enrutador de historial
router = APIRouter(
    prefix="/api",
    tags=["Historial"]
)

@router.get("/history")
def api_get_history(
    limite: int = LIMITE_HISTORIAL_DEFECTO, 
    salto: int = 0, 
    username: str = Depends(validar_token_acceso)
):
    """
    Recupera el historial de consultas de traducción de MongoDB de forma paginada.
    Solo accesible para usuarios autenticados. Retorna únicamente el historial del usuario activo.
    """
    try:
        # Llamar al servicio con variables en español y filtrar por usuario
        return ts.obtener_historial(limite=limite, salto=salto, username=username)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error consultando la base de datos de historial: {e}"
        )

@router.put("/history/{item_id}/star")
def api_toggle_star(item_id: str, req: StarRequest):
    """
    Marca o desmarca una traducción específica del historial como favorita.
    """
    try:
        # Invocar la función traducida (alternar_favorito)
        exito = ts.alternar_favorito(item_id, req.is_starred)
        if not exito:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Traducción no encontrada en el historial"
            )
        return {"success": True, "is_starred": req.is_starred}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar estado de favorito: {e}"
        )

@router.delete("/history/{item_id}")
def api_delete_history(item_id: str):
    """
    Elimina permanentemente una traducción específica del historial de MongoDB.
    """
    try:
        # Invocar la función traducida (eliminar_item_historial)
        exito = ts.eliminar_item_historial(item_id)
        if not exito:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Traducción no encontrada en el historial"
            )
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar traducción de la base de datos: {e}"
        )
