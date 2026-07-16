import database as db

def get_admin_stats():
    """
    Realiza agregaciones en las colecciones 'history' y 'feedback' de MongoDB 
    para calcular métricas administrativas y estadísticas globales de uso.
    """
    try:
        total_traducciones = db.base_datos.history.count_documents({})
        cantidad_feedback = db.base_datos.feedback.count_documents({})
        
        # Agrupación por sentido de traducción
        idiomas = {
            "es_qu": db.base_datos.history.count_documents({"source_lang": "es", "target_lang": "qu"}),
            "qu_es": db.base_datos.history.count_documents({"source_lang": "qu", "target_lang": "es"}),
            "es_ay": db.base_datos.history.count_documents({"source_lang": "es", "target_lang": "ay"}),
            "ay_es": db.base_datos.history.count_documents({"source_lang": "ay", "target_lang": "es"}),
        }
        
        # Calcular promedio de calificación (rating)
        calificacion_promedio = 0.0
        pipeline = [
            {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
        ]
        resultado_agregacion = list(db.base_datos.feedback.aggregate(pipeline))
        if resultado_agregacion and resultado_agregacion[0]["avg_rating"] is not None:
            calificacion_promedio = round(resultado_agregacion[0]["avg_rating"], 1)
            
        return {
            "total_translations": total_traducciones,
            "languages": idiomas,
            "average_rating": calificacion_promedio,
            "feedback_count": cantidad_feedback,
            "database_type": "mongodb"
        }
    except Exception as e:
        print(f"Error calculando métricas de administración: {e}")
        return {
            "total_translations": 0,
            "languages": {"es_qu": 0, "qu_es": 0, "es_ay": 0, "ay_es": 0},
            "average_rating": 0.0,
            "feedback_count": 0,
            "database_type": "mongodb"
        }

def get_admin_feedbacks(limit=50, skip=0):
    """
    Recupera la lista de comentarios y correcciones sugeridas de la colección 'feedback'.
    Optimizado para paginación de grandes datos con skip y limit.
    """
    try:
        elementos = list(db.base_datos.feedback.find().sort("timestamp", -1).skip(skip).limit(limit))
        for item in elementos:
            item["id"] = str(item.pop("_id"))
        return elementos
    except Exception as e:
        print(f"Error recuperando retroalimentación para admin: {e}")
        return []
