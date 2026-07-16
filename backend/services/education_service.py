import os
import json
import random
import database as db

def get_quizzes_from_db(limit=5):
    """
    Recupera preguntas aleatorias de la colección 'quizzes' en MongoDB.
    Si la colección está vacía, lee el archivo quizzes.json local y lo siembra en la base de datos.
    """
    try:
        todos_los_cuestionarios = list(db.base_datos.quizzes.find())
        
        # Fallback a archivo JSON si la colección está vacía
        if not todos_los_cuestionarios:
            print(">>> Colección 'quizzes' vacía. Cargando desde el archivo JSON local...")
            directorio_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ruta_cuestionarios = os.path.join(directorio_base, "data", "quizzes.json")
            if os.path.exists(ruta_cuestionarios):
                with open(ruta_cuestionarios, "r", encoding="utf-8") as f:
                    todos_los_cuestionarios = json.load(f)
                # Sembrar en la base de datos para futuras consultas
                db.base_datos.quizzes.insert_many(todos_los_cuestionarios)
                # Volver a consultar para obtener los ObjectIds mapeados
                todos_los_cuestionarios = list(db.base_datos.quizzes.find())

        for cuestionario in todos_los_cuestionarios:
            cuestionario["id"] = str(cuestionario.pop("_id"))

        # Seleccionar subconjunto aleatorio
        if len(todos_los_cuestionarios) > limit:
            seleccionados = random.sample(todos_los_cuestionarios, limit)
        else:
            seleccionados = todos_los_cuestionarios
            random.shuffle(seleccionados)
            
        return seleccionados
    except Exception as e:
        print(f"Error recuperando cuestionarios: {e}")
        # En caso de error, devolver lista vacía
        return []

def get_vocabulary_by_language(lang: str):
    """
    Obtiene todos los términos de vocabulario bilingües de la colección 'dictionary' en MongoDB filtrados por idioma.
    """
    try:
        filtro_idioma = lang.lower().strip()
        elementos = list(db.base_datos.dictionary.find({"language": filtro_idioma}))
        
        for item in elementos:
            item["id"] = str(item.pop("_id"))
            
        return elementos
    except Exception as e:
        print(f"Error consultando vocabulario para '{lang}': {e}")
        return []

def generar_trivia_desde_feedback(texto_origen, texto_incorrecto, texto_corregido, idioma_destino, comentarios=None):
    """
    Genera dinámicamente una pregunta de trivia (quiz) a partir de una propuesta de corrección de la comunidad,
    permitiendo a otros usuarios evaluar la traducción correcta de forma didáctica.
    """
    if not texto_origen or not texto_incorrecto or not texto_corregido or not idioma_destino:
        return False
        
    idioma_destino_nombre = "Quechua" if idioma_destino == "qu" else "Aymara"
    
    # 1. Diseñar la pregunta
    pregunta = f"¿Cuál es la traducción más natural y contextual de la frase en español '{texto_origen}' al {idioma_destino_nombre}?"
    
    # 2. Diseñar las opciones de respuesta (La corregida es la correcta, la original incorrecta es el distractor principal)
    opciones = [
        texto_corregido.strip(),  # Correcto
        texto_incorrecto.strip()  # Distractor
    ]
    
    # Añadir otros distractores dinámicos basados en otros términos del glosario
    try:
        # Buscar palabras del diccionario para usarlas como distractores
        glosario = list(db.base_datos.dictionary.find({"language": "quechua" if idioma_destino == "qu" else "aymara"}).limit(10))
        distractores_posibles = []
        for item in glosario:
            val = item.get("qu") if idioma_destino == "qu" else item.get("ay")
            if val and val.strip() != texto_corregido.strip() and val.strip() != texto_incorrecto.strip():
                distractores_posibles.append(val.strip())
                
        # Mezclar y tomar 2 distractores
        if len(distractores_posibles) >= 2:
            distractores = random.sample(distractores_posibles, 2)
            opciones.extend(distractores)
        else:
            # Distractores genéricos si el glosario no tiene suficientes
            opciones.extend(["Frase alternativa no relacionada", "Variación gramatical incorrecta"])
    except Exception:
        opciones.extend(["Opción de relleno A", "Opción de relleno B"])
        
    # Barajar las opciones para que la correcta no siempre sea la primera, y guardar el índice de la correcta
    correct_val = texto_corregido.strip()
    # Limitar opciones a valores únicos
    opciones = list(dict.fromkeys(opciones))[:4] # max 4 opciones
    # Si por alguna razón quitó la correcta, re-agregarla
    if correct_val not in opciones:
        opciones[0] = correct_val
        
    # Barajar
    random.shuffle(opciones)
    answer_index = opciones.index(correct_val)
    
    # 3. Explicación didáctica (Usar el comentario del usuario)
    explicacion = "Sugerencia del usuario: " + comentarios.strip() if comentarios and comentarios.strip() else "Explicación: Aporte colaborativo sugerido por un hablante nativo para mejorar la precisión de la traducción."
    
    # 4. Insertar en MongoDB
    cuestionario = {
        "question": pregunta,
        "options": opciones,
        "answerIndex": answer_index,
        "explanation": explicacion,
        "score": 10
    }
    
    try:
        db.base_datos.quizzes.insert_one(cuestionario)
        print(f">>> Trivia Dinámica RunaTranslate: Se generó nueva pregunta de trivia sobre '{texto_origen}'.")
        return True
    except Exception as e:
        print(f"Error insertando trivia dinámica: {e}")
        return False
