import os
import json
import re
from datetime import datetime
from bson.objectid import ObjectId
from config import CLAVE_API_OPENAI
import database as db
import services.cache_service as cs
from services.education_service import generar_trivia_desde_feedback

# --- CLIENTE DE INTELIGENCIA ARTIFICIAL (OPENAI / GEMINI COMPATIBLE) ---
USAR_GEMINI_DIRECTO = False
cliente_openai = None
MODELO_IA = "gpt-4o-mini"

if CLAVE_API_OPENAI:
    try:
        # Detectar si la clave pertenece a la API de Google Gemini (AI Studio o similar)
        if CLAVE_API_OPENAI.startswith("AQ.") or CLAVE_API_OPENAI.startswith("AIza"):
            USAR_GEMINI_DIRECTO = True
            print(">>> Servicio de traducción: Motor nativo Gemini configurado (100% compatible con claves AQ).")
        else:
            from openai import OpenAI
            cliente_openai = OpenAI(api_key=CLAVE_API_OPENAI)
            MODELO_IA = "gpt-4o-mini"
            print(">>> Servicio de traducción: Cliente OpenAI inicializado para traducción contextual.")
    except Exception as error:
        print(f">>> Advertencia: No se pudo inicializar el cliente de Inteligencia Artificial: {error}")

# --- DICCIONARIOS EN MEMORIA PARA EL MOTOR LOCAL ---
diccionario_quechua = []
diccionario_aymara = []

def cargar_diccionarios_desde_bd():
    """
    Carga los términos del glosario desde la colección 'dictionary' de MongoDB.
    Si la colección está vacía, lee los archivos JSON locales de respaldo.
    """
    global diccionario_quechua, diccionario_aymara
    try:
        # Intentar cargar datos desde MongoDB
        terminos_mongo = list(db.base_datos.dictionary.find())
        if terminos_mongo:
            diccionario_quechua = [termino for termino in terminos_mongo if termino.get("language") == "quechua"]
            diccionario_aymara = [termino for termino in terminos_mongo if termino.get("language") == "aymara"]
            print(f">>> Diccionarios cargados desde MongoDB. Quechua: {len(diccionario_quechua)} términos, Aymara: {len(diccionario_aymara)} términos.")
            return

        # Si no hay datos en MongoDB, cargar desde archivos JSON locales (fallback)
        print(">>> Colección 'dictionary' en MongoDB vacía. Cargando desde archivos JSON locales...")
        directorio_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ruta_quechua = os.path.join(directorio_base, "data", "dictionary_quechua.json")
        ruta_aymara = os.path.join(directorio_base, "data", "dictionary_aymara.json")

        if os.path.exists(ruta_quechua):
            with open(ruta_quechua, "r", encoding="utf-8") as archivo:
                datos = json.load(archivo)
                diccionario_quechua = datos.get("translations", [])
        if os.path.exists(ruta_aymara):
            with open(ruta_aymara, "r", encoding="utf-8") as archivo:
                datos = json.load(archivo)
                diccionario_aymara = datos.get("translations", [])
        print(f">>> Diccionarios locales cargados. Quechua: {len(diccionario_quechua)} términos, Aymara: {len(diccionario_aymara)} términos.")
    except Exception as error:
        print(f"Error cargando diccionarios de traducción: {error}")

# Cargar diccionarios al importar el módulo
cargar_diccionarios_desde_bd()

# --- FUNCIONES AUXILIARES DE TRADUCCIÓN ---

def normalizar_texto(texto):
    """
    Normaliza el texto de entrada para búsquedas limpias (remueve signos de puntuación e iniciales).
    """
    if not texto:
        return ""
    texto_normalizado = texto.lower().strip()
    texto_normalizado = re.sub(r'^[¿¡!?,.;:"]+|[¿¡!?,.;:"]+$', '', texto_normalizado)
    return texto_normalizado.strip()

def traductor_local(texto, idioma_origen, idioma_destino):
    """
    Motor local de diccionario estructurado. Traduce frases completas o descompone palabra por palabra.
    """
    texto_original = texto.strip()
    texto_normalizado = normalizar_texto(texto_original)
    
    # Seleccionar el diccionario del idioma correspondiente
    es_quechua = (idioma_origen == "qu" or idioma_destino == "qu")
    diccionario_actual = diccionario_quechua if es_quechua else diccionario_aymara
    clave_nativa = "qu" if es_quechua else "ay"
    
    # 1. Intentar coincidencia exacta de toda la frase
    for entrada in diccionario_actual:
        if idioma_origen == "es":
            if normalizar_texto(entrada["es"]) == texto_normalizado:
                return entrada[clave_nativa], "Coincidencia exacta de frase en glosario local."
        else:
            if normalizar_texto(entrada[clave_nativa]) == texto_normalizado:
                return entrada["es"], "Coincidencia exacta de frase en glosario local."
                
    # 2. Traducción palabra por palabra
    palabras = re.findall(r'\b\w+\b|[^\w\s]', texto_original)
    palabras_traducidas = []
    cantidad_coincidencias = 0
    
    for palabra in palabras:
        if not re.match(r'\w+', palabra):
            palabras_traducidas.append(palabra)
            continue
            
        palabra_normalizada = normalizar_texto(palabra)
        encontrado = False
        
        for entrada in diccionario_actual:
            if idioma_origen == "es":
                if normalizar_texto(entrada["es"]) == palabra_normalizada:
                    traduccion = entrada[clave_nativa]
                    if palabra[0].isupper():
                        traduccion = traduccion.capitalize()
                    palabras_traducidas.append(traduccion)
                    cantidad_coincidencias += 1
                    encontrado = True
                    break
            else:
                if normalizar_texto(entrada[clave_nativa]) == palabra_normalizada:
                    traduccion = entrada["es"]
                    if palabra[0].isupper():
                        traduccion = traduccion.capitalize()
                    palabras_traducidas.append(traduccion)
                    cantidad_coincidencias += 1
                    encontrado = True
                    break
                    
        if not encontrado:
            palabras_traducidas.append(palabra)
            
    # Reensamblar las palabras traducidas
    texto_final = ""
    for pal in palabras_traducidas:
        if texto_final and re.match(r'\w+', pal):
            texto_final += " " + pal
        else:
            texto_final += pal
            
    if cantidad_coincidencias > 0:
        return texto_final.strip(), f"Traducción por diccionario ({cantidad_coincidencias}/{len(palabras)} palabras)."
    else:
        return texto_original, "Palabra o frase no encontrada en el corpus local. Se mantiene original."

def traducir_con_openai(texto, idioma_origen, idioma_destino):
    """
    Realiza la traducción del texto llamando a la API de OpenAI / Gemini.
    Si idioma_origen es 'auto', detecta el idioma y devuelve un JSON.
    """
    if not cliente_openai and not USAR_GEMINI_DIRECTO:
        return None
        
    nombres_idiomas = {
        "es": "Español",
        "qu": "Quechua Collao / Cusco-Collao",
        "ay": "Aymara altiplánico"
    }
    
    destino_nombre = nombres_idiomas.get(idioma_destino, idioma_destino)

    if idioma_origen == "auto":
        system_content = f"""Eres un traductor profesional y detector de idiomas especializado en español, quechua y aimara.
Tu tarea consiste en:
1. Identificar el idioma de origen del texto (debe ser 'es' para español, 'qu' para quechua o 'ay' para aimara).
2. Traducir el texto al idioma de destino: {destino_nombre}.

Reglas de traducción:
- Conserva el significado original.
- No agregues ni elimines información.
- Evita traducciones literales cuando afecten la naturalidad.
- Mantén la gramática correcta del idioma de destino (pon especial atención a la gramática y morfología de sufijos del aymara).
- Conserva nombres propios, números, correos, URLs y fechas.
- Los términos técnicos que no tengan una traducción ampliamente aceptada deben mantenerse en el idioma original.
- No escribas explicaciones, comentarios ni notas.

Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{{
  "detected_lang": "código_del_idioma_detectado_que_debe_ser_es_qu_o_ay",
  "translated_text": "traducción_limpia_aquí"
}}"""
        user_content = f"""Idioma destino: {destino_nombre}
Texto: "{texto}" """
    else:
        origen_nombre = nombres_idiomas.get(idioma_origen, idioma_origen)
        system_content = f"""Eres un traductor profesional especializado en español, quechua y aimara.
Tu única tarea es traducir textos de forma fluida, precisa y natural.

Reglas de Oro:
1. Conserva el significado original de forma exacta.
2. No agregues explicaciones, comentarios, notas de traducción ni listas de vocabulario.
3. Evita traducciones literales si afectan la naturalidad del idioma destino.
4. Aplica correctamente la gramática, morfología y el uso de sufijos nativos (quechua y aimara).
5. Devuelve ÚNICAMENTE el texto traducido limpio, sin ningún carácter adicional, sin asteriscos, sin pasos intermedios y sin explicaciones."""

        user_content = f"""Idioma origen: {origen_nombre}
Idioma destino: {destino_nombre}
Texto: "{texto}" """

    # --- FLUJO NATIVO GEMINI (DIRECTO POR HTTP) ---
    if USAR_GEMINI_DIRECTO:
        import urllib.request
        import urllib.parse
        import json

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={CLAVE_API_OPENAI}"
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_content}]
            },
            "contents": [
                {
                    "parts": [{"text": user_content}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 500
            }
        }
        
        if idioma_origen == "auto":
            payload["generationConfig"]["responseMimeType"] = "application/json"
            
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5.0) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                
                try:
                    contenido = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except (KeyError, IndexError):
                    print(f"Estructura de respuesta inesperada en Gemini API: {res_data}")
                    return None
                    
                if idioma_origen == "auto":
                    if contenido.startswith("```"):
                        lineas = contenido.split("\n")
                        if lineas[0].startswith("```"):
                            lineas = lineas[1:]
                        if lineas and lineas[-1].strip() == "```":
                            lineas = lineas[:-1]
                        contenido = "\n".join(lineas).strip()
                        
                    try:
                        datos = json.loads(contenido)
                    except Exception:
                        import re
                        detected_match = re.search(r'"detected_lang"\s*:\s*"([^"]+)"', contenido)
                        translated_match = re.search(r'"translated_text"\s*:\s*"([^"]+)"', contenido)
                        if detected_match and translated_match:
                            datos = {
                                "detected_lang": detected_match.group(1),
                                "translated_text": translated_match.group(1)
                            }
                        else:
                            raise ValueError("JSON no parseable en Gemini directo")
                            
                    detected = datos.get("detected_lang", "es").strip().lower()
                    if detected not in ["es", "qu", "ay"]:
                        detected = "es"
                    translated = datos.get("translated_text", "").strip()
                    
                    return {
                        "translated_text": translated,
                        "detected_lang": detected,
                        "engine": "Traducción por IA nativa (gemini-1.5-flash)"
                    }
                else:
                    if contenido.startswith('"') and contenido.endswith('"'):
                        contenido = contenido[1:-1]
                    return {
                        "translated_text": contenido.strip(),
                        "detected_lang": idioma_origen,
                        "engine": "Traducción por IA nativa (gemini-1.5-flash)"
                    }
        except Exception as error:
            print(f"Error en Gemini API Nativa: {error}")
            return None

    # --- FLUJO OPENAI SDK ---
    try:
        if idioma_origen == "auto":
            respuesta = cliente_openai.chat.completions.create(
                model=MODELO_IA,
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.2,
                max_tokens=500,
                response_format={"type": "json_object"},
                timeout=4.0
            )
        else:
            respuesta = cliente_openai.chat.completions.create(
                model=MODELO_IA,
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.2,
                max_tokens=500,
                timeout=4.0
            )
            
        contenido = respuesta.choices[0].message.content.strip()
        
        if idioma_origen == "auto":
            # Limpiar posibles bloques markdown
            if contenido.startswith("```"):
                lineas = contenido.split("\n")
                if lineas[0].startswith("```"):
                    lineas = lineas[1:]
                if lineas and lineas[-1].strip() == "```":
                    lineas = lineas[:-1]
                contenido = "\n".join(lineas).strip()
            
            import json
            import re
            
            try:
                datos = json.loads(contenido)
            except Exception:
                # Intento de extracción por regex ante caracteres de control inválidos
                detected_match = re.search(r'"detected_lang"\s*:\s*"([^"]+)"', contenido)
                translated_match = re.search(r'"translated_text"\s*:\s*"([^"]+)"', contenido)
                if detected_match and translated_match:
                    datos = {
                        "detected_lang": detected_match.group(1),
                        "translated_text": translated_match.group(1)
                    }
                else:
                    raise ValueError("JSON no parseable y regex falló")
                    
            detected = datos.get("detected_lang", "es").strip().lower()
            if detected not in ["es", "qu", "ay"]:
                detected = "es"
            translated = datos.get("translated_text", "").strip()
            return {
                "translated_text": translated,
                "detected_lang": detected,
                "engine": f"Traducción por IA avanzada ({MODELO_IA})"
            }
        else:
            if contenido.startswith('"') and contenido.endswith('"'):
                contenido = contenido[1:-1]
            return {
                "translated_text": contenido.strip(),
                "detected_lang": idioma_origen,
                "engine": f"Traducción por IA avanzada ({MODELO_IA})"
            }
    except Exception as error:
        print(f"Error en OpenAI/Gemini API: {error}")
        return None

def traducir_con_ia_auxiliar(texto, idioma_origen, idioma_destino):
    """
    Motor de IA Auxiliar de respaldo (MyMemory Neural API) para traducciones complejas 
    cuando el plan de OpenAI está agotado o fuera de línea.
    """
    import urllib.request
    import urllib.parse
    import json
    
    langpair = f"{idioma_origen.lower().strip()}|{idioma_destino.lower().strip()}"
    url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(texto)}&langpair={langpair}"
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=4.0) as response:
            data = json.loads(response.read().decode('utf-8'))
            translation = data.get("responseData", {}).get("translatedText")
            if translation and translation.strip() and not translation.startswith("MYMEMORY WARNING"):
                return translation.strip(), "Traducción por Red Neuronal de IA Auxiliar"
    except Exception as e:
        print(f"Error en IA Auxiliar: {e}")
        
    return None, "Fallo en IA Auxiliar"

# --- AUXILIAR DE DETECCION DE IDIOMA LOCAL (OFFLINE) ---

def detectar_idioma_local(texto: str) -> str:
    """
    Analiza las palabras del texto de entrada contra los diccionarios locales
    para identificar si pertenece a Quechua ('qu'), Aymara ('ay') o Español ('es').
    """
    texto_normalizado = texto.lower()
    # Separar palabras
    palabras = re.findall(r'\b\w+\b', texto_normalizado)
    if not palabras:
        return "es"
        
    coincidencias_qu = 0
    coincidencias_ay = 0
    
    # Construir sets de palabras de referencia
    palabras_qu = set()
    for item in diccionario_quechua:
        if "qu" in item:
            palabras_qu.update(re.findall(r'\b\w+\b', item["qu"].lower()))
            
    palabras_ay = set()
    for item in diccionario_aymara:
        if "ay" in item:
            palabras_ay.update(re.findall(r'\b\w+\b', item["ay"].lower()))
            
    for pal in palabras:
        if pal in palabras_qu:
            coincidencias_qu += 1
        if pal in palabras_ay:
            coincidencias_ay += 1
            
    if coincidencias_qu > coincidencias_ay and coincidencias_qu > 0:
        return "qu"
    elif coincidencias_ay > coincidencias_qu and coincidencias_ay > 0:
        return "ay"
    else:
        return "es"

# --- AUXILIAR DE DETECCION DE TRADUCCION TRUNCADA ---

def es_traduccion_truncada(texto_origen: str, texto_traducido: str) -> bool:
    """
    Identifica de forma defensiva si la traducción devuelta por la IA está
    incompleta, cortada o truncada por límites de tokens de salida.
    """
# --- MIDDLEWARE DE VALIDACIÓN Y SANEAMIENTO DE TRADUCCIÓN ---

def validar_y_sanear_traduccion(texto_origen: str, texto_traducido: str) -> tuple[bool, str]:
    """
    Realiza una validación y saneamiento profundo de la traducción.
    Retorna una tupla (es_valida, texto_saneado).
    Si no es válida, la traducción se considera corrupta o con fugas de instrucciones y se descarta.
    """
    if not texto_traducido:
        return False, ""
        
    texto_limpio = texto_traducido.strip()
    
    # 1. Eliminar comillas envolventes innecesarias
    if (texto_limpio.startswith('"') and texto_limpio.endswith('"')) or (texto_limpio.startswith("'") and texto_limpio.endswith("'")):
        texto_limpio = texto_limpio[1:-1].strip()
        
    # 2. Limpiar bloques de código Markdown
    if texto_limpio.startswith("```"):
        lineas = texto_limpio.split("\n")
        if lineas[0].startswith("```"):
            lineas = lineas[1:]
        if lineas and lineas[-1].strip() == "```":
            lineas = lineas[:-1]
        texto_limpio = "\n".join(lineas).strip()
        
    # 3. DETECTAR CORRUPCIÓN / LISTAS DE VOCABULARIO / FUGAS DE PROMPT:
    # A) Patrones de flechas, numeración y prefijos de verificación típicos
    patrones_corruptos = [
        r"->",                       # Flechas de relación de vocabulario
        r"\*\s*Let's verify",        # Cadenas de verificación de Gemini
        r"verify\s*:",
        r"Antes de responder",
        r"1\.\s*Identifica",
        r"2\.\s*Traduce",
        r"3\.\s*Revisa",
        r"4\.\s*Devuelve"
    ]
    import re
    for patron in patrones_corruptos:
        if re.search(patron, texto_limpio, re.IGNORECASE):
            print(f">>> Middleware de Calidad: Se detectó patrón corrupto/fuga '{patron}' en la salida de IA.")
            return False, texto_limpio
            
    # B) Si el texto original no tiene asteriscos pero el traducido tiene múltiples asteriscos (indicando listas)
    if "*" in texto_limpio and "*" not in texto_origen:
        if texto_limpio.count("*") > 2:
            print(">>> Middleware de Calidad: Exceso de asteriscos indicativos de lista de vocabulario/pasos.")
            return False, texto_limpio
            
    # C) Proporción de longitud (Previene truncamientos severos)
    if len(texto_origen) > 60 and len(texto_limpio) < (len(texto_origen) * 0.15):
        print(f">>> Middleware de Calidad: Traducción demasiado corta ({len(texto_limpio)} vs {len(texto_origen)} chars). Posible truncamiento.")
        return False, texto_limpio
        
    return True, texto_limpio

# --- LOGICA PRINCIPAL DE SERVICIO ---

def traducir(texto, idioma_origen, idioma_destino):
    """
    Función de traducción que orquesta el fallback de OpenAI/Gemini a la IA Auxiliar o diccionario local.
    Busca coincidencias exactas en el diccionario local para ahorrar cuota de IA.
    Retorna una tupla: (texto_traducido, explicacion, motor, idioma_origen_detectado)
    """
    if not texto:
        return "", "Texto vacío", "Local", "es"

    # --- 1. SI ES AUTO-DETECCIÓN, ATACAR DIRECTAMENTE CON LA IA SI ESTÁ ACTIVA ---
    if idioma_origen == "auto":
        if cliente_openai or USAR_GEMINI_DIRECTO:
            res_ia = traducir_con_openai(texto, "auto", idioma_destino)
            if res_ia:
                es_valida, texto_saneado = validar_y_sanear_traduccion(texto, res_ia["translated_text"])
                if es_valida:
                    # Guardar en la caché de MongoDB usando el idioma detectado
                    cs.guardar_en_cache(
                        texto, 
                        res_ia["detected_lang"], 
                        idioma_destino, 
                        texto_saneado, 
                        "IA Avanzada", 
                        res_ia["engine"]
                    )
                    return texto_saneado, res_ia["engine"], "IA Avanzada", res_ia["detected_lang"]

        # Si no hay IA o falla, hacer detección local
        idioma_origen = detectar_idioma_local(texto)

    # --- 2. FLUJO DE TRADUCCIÓN CON IDIOMA DEFINIDO ---
    if idioma_origen == idioma_destino:
        return texto, "Mismo idioma de origen y destino", "Directo", idioma_origen

    # 2.0. Intentar coincidencia exacta de frase en el diccionario local (Ahorro de recursos y precisión)
    traduccion_loc, desc_loc = traductor_local(texto, idioma_origen, idioma_destino)
    if desc_loc == "Coincidencia exacta de frase en glosario local.":
        return traduccion_loc, desc_loc, "Diccionario Local", idioma_origen

    # 2.1. Intentar buscar en la caché de MongoDB (Optimización Grandes Datos)
    resultado_cache = cs.buscar_en_cache(texto, idioma_origen, idioma_destino)
    if resultado_cache:
        return resultado_cache["translated_text"], resultado_cache["explanation"], resultado_cache["engine"], idioma_origen

    # 2.2. Intentar traducción con IA Avanzada (OpenAI / Gemini)
    if cliente_openai or USAR_GEMINI_DIRECTO:
        res_ia = traducir_con_openai(texto, idioma_origen, idioma_destino)
        if res_ia:
            es_valida, texto_saneado = validar_y_sanear_traduccion(texto, res_ia["translated_text"])
            if es_valida:
                cs.guardar_en_cache(texto, idioma_origen, idioma_destino, texto_saneado, "IA Avanzada", res_ia["engine"])
                return texto_saneado, res_ia["engine"], "IA Avanzada", idioma_origen

    # 2.3. Intentar traducción con IA Auxiliar (MyMemory Neural Translator Fallback)
    texto_traducido, descripcion_motor = traducir_con_ia_auxiliar(texto, idioma_origen, idioma_destino)
    if texto_traducido:
        es_valida, texto_saneado = validar_y_sanear_traduccion(texto, texto_traducido)
        if es_valida:
            cs.guardar_en_cache(texto, idioma_origen, idioma_destino, texto_saneado, "IA Auxiliar", descripcion_motor)
            return texto_saneado, descripcion_motor, "IA Auxiliar", idioma_origen

    # 2.4. Usar traductor local palabra por palabra si falla todo lo demás
    cs.guardar_en_cache(texto, idioma_origen, idioma_destino, traduccion_loc, "Diccionario Local", desc_loc)
    return traduccion_loc, desc_loc, "Diccionario Local", idioma_origen

# --- OPERACIONES CRUD DE HISTORIAL DE TRADUCCIÓN ---

def guardar_traduccion(texto_origen, texto_traducido, idioma_origen, idioma_destino, username=None):
    """
    Guarda una traducción en la colección 'history' de MongoDB.
    """
    fecha_actual = datetime.utcnow().isoformat()
    registro = {
        "source_text": texto_origen,
        "translated_text": texto_traducido,
        "source_lang": idioma_origen,
        "target_lang": idioma_destino,
        "is_starred": False,
        "timestamp": fecha_actual,
        "username": username
    }
    resultado = db.base_datos.history.insert_one(registro)
    return str(resultado.inserted_id)

def obtener_historial(limite=50, salto=0, username=None):
    """
    Retorna el historial de traducciones paginado de MongoDB.
    Optimizado para grandes datos utilizando cursores de skip y limit.
    """
    filtro = {}
    if username:
        filtro["username"] = username
        
    elementos = list(db.base_datos.history.find(filtro).sort("timestamp", -1).skip(salto).limit(limite))
    for elemento in elementos:
        elemento["id"] = str(elemento.pop("_id"))
    return elementos

def alternar_favorito(id_elemento, es_favorito):
    """
    Marca o desmarca una traducción específica como favorita.
    """
    resultado = db.base_datos.history.update_one(
        {"_id": ObjectId(id_elemento)},
        {"$set": {"is_starred": es_favorito}}
    )
    return resultado.modified_count > 0 or resultado.matched_count > 0

def eliminar_item_historial(id_elemento):
    """
    Elimina permanentemente un registro de traducción del historial en MongoDB.
    """
    resultado = db.base_datos.history.delete_one({"_id": ObjectId(id_elemento)})
    return resultado.deleted_count > 0

# --- SISTEMA DE APRENDIZAJE AUTOMÁTICO (GLOSARIO LOCAL) ---

def agregar_a_glosario_local(es_text, native_text, lang_destino, es_aporte=False):
    """
    Inserta de forma segura un nuevo término en la colección 'dictionary'
    de MongoDB y recarga los diccionarios en memoria.
    """
    if not es_text or not native_text or not lang_destino:
        return False
        
    language_val = "quechua" if lang_destino == "qu" else "aymara"
    
    # Formatear el registro
    registro = {
        "es": es_text.strip(),
        "language": language_val,
        "category": "Aportes de la Comunidad" if es_aporte else "Aprendizaje Automatizado (IA)",
        "context": "Validado por retroalimentación" if es_aporte else "Validado por alta puntuación"
    }
    
    if lang_destino == "qu":
        registro["qu"] = native_text.strip()
    else:
        registro["ay"] = native_text.strip()
        
    try:
        # Evitar duplicados exactos en base de datos
        filtro = {
            "es": es_text.strip(),
            "language": language_val
        }
        if not db.base_datos.dictionary.find_one(filtro):
            db.base_datos.dictionary.insert_one(registro)
            cargar_diccionarios_desde_bd()
            print(f">>> Aprendizaje RunaTranslate: Se agregó nuevo término al glosario local: '{es_text}' -> '{native_text}'")
            return True
    except Exception as e:
        print(f"Error al guardar término en glosario local: {e}")
        
    return False

# --- OPERACIONES CRUD DE RETROALIMENTACIÓN ---

def guardar_feedback(calificacion, texto_origen=None, texto_traducido=None, idioma_origen=None, idioma_destino=None, texto_corregido=None, comentarios=None):
    """
    Registra el reporte de corrección sugerida por el usuario en la colección 'feedback' de MongoDB.
    Si la traducción es altamente valorada o se envía una corrección, se agrega al diccionario local para
    evitar futuras llamadas repetitivas a la API externa.
    """
    fecha_actual = datetime.utcnow().isoformat()
    registro = {
        "source_text": texto_origen,
        "translated_text": texto_traducido,
        "source_lang": idioma_origen,
        "target_lang": idioma_destino,
        "rating": calificacion,
        "corrected_text": texto_corregido,
        "comments": comentarios,
        "likes": 0,
        "liked_by": [],
        "timestamp": fecha_actual
    }
    db.base_datos.feedback.insert_one(registro)
    
    # --- PROCESO DE APRENDIZAJE PARA EL DICCIONARIO LOCAL ---
    # 1. Si el usuario califica con 4 o 5 estrellas, guardamos la traducción original como término correcto
    if calificacion >= 4 and texto_origen and texto_traducido and idioma_destino:
        agregar_a_glosario_local(texto_origen, texto_traducido, idioma_destino, es_aporte=False)
        
    # 2. Si el usuario propone una corrección explícita, la agregamos como aporte al diccionario y creamos una trivia
    if texto_corregido and texto_corregido.strip() and texto_origen and idioma_destino:
        agregar_a_glosario_local(texto_origen, texto_corregido, idioma_destino, es_aporte=True)
        # Generar trivia para que otros usuarios voten y verifiquen
        generar_trivia_desde_feedback(
            texto_origen, 
            texto_traducido or "Traducción errónea", 
            texto_corregido, 
            idioma_destino, 
            comentarios=comentarios
        )
        
    return True
