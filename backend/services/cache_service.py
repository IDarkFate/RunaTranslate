from datetime import datetime
import database as db

# ==========================================================================
# SERVICIO DE CACHÉ DE TRADUCCIONES EN MONGODB (OPTIMIZACIÓN GRANDES DATOS)
# ==========================================================================

def buscar_en_cache(texto: str, idioma_origen: str, idioma_destino: str):
    """
    Busca si una traducción idéntica ya fue resuelta previamente en MongoDB.
    
    Evita llamadas costosas a la API de OpenAI para textos repetidos frecuentemente.
    """
    try:
        texto_limpio = texto.strip().lower()
        registro_cache = db.base_datos.cache.find_one({
            "source_text_lower": texto_limpio,
            "source_lang": idioma_origen,
            "target_lang": idioma_destino
        })
        if registro_cache:
            print(f">>> Caché Hit: Traducción encontrada en caché para '{texto[:20]}...'")
            return {
                "translated_text": registro_cache["translated_text"],
                "engine": registro_cache.get("engine", "Caché de MongoDB"),
                "explanation": registro_cache.get("explanation", "Traducción recuperada de la memoria caché")
            }
        return None
    except Exception as e:
        print(f"Error consultando caché en MongoDB: {e}")
        return None

def guardar_en_cache(texto: str, idioma_origen: str, idioma_destino: str, texto_traducido: str, motor: str, descripcion: str):
    """
    Almacena una traducción resuelta en la caché de MongoDB.
    """
    try:
        texto_limpio = texto.strip().lower()
        registro = {
            "source_text_lower": texto_limpio,
            "source_text": texto,
            "translated_text": texto_traducido,
            "source_lang": idioma_origen,
            "target_lang": idioma_destino,
            "engine": motor,
            "explanation": descripcion,
            "timestamp": datetime.utcnow().isoformat()
        }
        # Evitar duplicados haciendo un upsert
        db.base_datos.cache.update_one(
            {
                "source_text_lower": texto_limpio,
                "source_lang": idioma_origen,
                "target_lang": idioma_destino
            },
            {"$set": registro},
            upsert=True
        )
    except Exception as e:
        print(f"Error guardando en caché en MongoDB: {e}")
