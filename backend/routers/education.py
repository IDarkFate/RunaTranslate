from fastapi import APIRouter, HTTPException, status
import services.education_service as eds

# Crear el enrutador de preservación cultural y aprendizaje
router = APIRouter(
    prefix="/api/learn",
    tags=["Educación & Preservación"]
)

@router.get("/quiz")
def api_get_quiz(limit: int = 5):
    """
    Entrega una lista aleatoria de trivias o preguntas didácticas 
    para evaluar los conocimientos de Quechua y Aymara.
    """
    try:
        quizzes = eds.get_quizzes_from_db(limit=limit)
        if not quizzes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron cuestionarios disponibles en la base de datos."
            )
        return quizzes
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cargando preguntas didácticas: {e}"
        )

@router.get("/dictionary/{lang}")
def api_get_dictionary(lang: str):
    """
    Devuelve los términos de vocabulario bilingües del corpus 
    almacenado en MongoDB filtrados por el idioma indicado (quechua o aymara).
    """
    valid_langs = ["quechua", "aymara"]
    if lang.lower().strip() not in valid_langs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Idioma de vocabulario no soportado. Usa: {', '.join(valid_langs)}"
        )
        
    try:
        return eds.get_vocabulary_by_language(lang)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error consultando los glosarios del sistema: {e}"
        )
