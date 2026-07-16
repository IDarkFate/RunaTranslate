from pydantic import BaseModel, Field
from typing import Optional

# ==========================================================================
# ESQUEMAS DE VALIDACIÓN DE ENTRADA Y SALIDA (MODELOS PYDANTIC)
# ==========================================================================

class TranslationRequest(BaseModel):
    """
    Representa el cuerpo de la solicitud para traducir un texto.
    """
    text: str = Field(
        ..., 
        min_length=1, 
        description="Texto original en el idioma de origen que se desea traducir"
    )
    source_lang: str = Field(
        ..., 
        max_length=4, 
        description="Código del idioma origen (es, qu, ay o auto)"
    )
    target_lang: str = Field(
        ..., 
        max_length=2, 
        description="Código del idioma destino (es, qu, ay)"
    )


class TranslationResponse(BaseModel):
    """
    Representa la respuesta devuelta al cliente tras una traducción exitosa.
    """
    id: Optional[str] = Field(
        None, 
        description="ID único del documento generado en la colección history de MongoDB"
    )
    original_text: str = Field(
        ..., 
        description="El texto original enviado por el usuario"
    )
    translated_text: str = Field(
        ..., 
        description="El resultado de la traducción generada por el motor"
    )
    source_lang: str = Field(
        ..., 
        description="Código del idioma original"
    )
    target_lang: str = Field(
        ..., 
        description="Código del idioma de destino"
    )
    engine: str = Field(
        ..., 
        description="Tipo de motor que procesó la solicitud (Diccionario Local o OpenAI AI)"
    )
    explanation: str = Field(
        ..., 
        description="Detalle o pista filológica sobre el proceso de traducción"
    )
    detected_lang: Optional[str] = Field(
        None, 
        description="Código del idioma de origen detectado automáticamente"
    )


class StarRequest(BaseModel):
    """
    Esquema para marcar o desmarcar una traducción como favorita (starred).
    """
    is_starred: bool = Field(
        ..., 
        description="Verdadero (true) para guardar en favoritos, falso (false) para remover"
    )


class FeedbackRequest(BaseModel):
    """
    Esquema que representa la sugerencia de corrección o calificación de una traducción.
    """
    rating: int = Field(
        ..., 
        ge=1, 
        le=5, 
        description="Calificación de la calidad otorgada por el usuario (1 a 5 estrellas)"
    )
    source_text: Optional[str] = Field(
        None, 
        description="Texto de origen que fue traducido"
    )
    translated_text: Optional[str] = Field(
        None, 
        description="Traducción errónea o inexacta devuelta por el sistema"
    )
    source_lang: Optional[str] = Field(
        None, 
        description="Idioma de origen de la consulta"
    )
    target_lang: Optional[str] = Field(
        None, 
        description="Idioma de destino de la consulta"
    )
    corrected_text: Optional[str] = Field(
        None, 
        description="Texto alternativo y correcto propuesto por el usuario (corrección contextual)"
    )
    comments: Optional[str] = Field(
        None, 
        description="Notas lingüísticas adicionales sobre el dialecto o contexto gramatical"
    )


class LoginRequest(BaseModel):
    """
    Representa el cuerpo de la solicitud para el inicio de sesión administrativo.
    """
    username: str = Field(..., description="Nombre de usuario administrador")
    password: str = Field(..., description="Contraseña de acceso del administrador")

