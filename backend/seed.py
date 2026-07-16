import os
import json
from dotenv import load_dotenv
from pymongo import MongoClient

# Cargar variables de entorno
load_dotenv()

# URI de conexión de MongoDB
URI_CONEXION_MONGO = os.getenv("MONGODB_URI")
if not URI_CONEXION_MONGO:
    print("ERROR: MONGODB_URI no configurado en el archivo .env")
    exit(1)

# Rutas de los archivos JSON de datos
DIRECTORIO_BASE = os.path.dirname(os.path.abspath(__file__))
RUTA_QUECHUA = os.path.join(DIRECTORIO_BASE, "data", "dictionary_quechua.json")
RUTA_AYMARA = os.path.join(DIRECTORIO_BASE, "data", "dictionary_aymara.json")
RUTA_CUESTIONARIOS = os.path.join(DIRECTORIO_BASE, "data", "quizzes.json")

def sembrar_base_datos():
    try:
        # Conectar a MongoDB
        cliente_mongo = MongoClient(URI_CONEXION_MONGO)
        base_datos = cliente_mongo.get_database("runatranslate")
        print(">>> Conectado exitosamente a MongoDB Atlas.")

        # --- 1. Cargar y sembrar diccionario de Quechua ---
        print("\nCargando diccionario Quechua...")
        with open(RUTA_QUECHUA, "r", encoding="utf-8") as f:
            datos_quechua = json.load(f)
            terminos_quechua = datos_quechua.get("translations", [])
            for termino in terminos_quechua:
                termino["language"] = "quechua"

        # --- 2. Cargar y sembrar diccionario de Aymara ---
        print("Cargando diccionario Aymara...")
        with open(RUTA_AYMARA, "r", encoding="utf-8") as f:
            datos_aymara = json.load(f)
            terminos_aymara = datos_aymara.get("translations", [])
            for termino in terminos_aymara:
                termino["language"] = "aymara"

        # Unificar todos los términos
        todos_los_terminos = terminos_quechua + terminos_aymara

        # Limpiar colección e insertar los términos
        base_datos.dictionary.delete_many({})
        if todos_los_terminos:
            base_datos.dictionary.insert_many(todos_los_terminos)
            print(f"OK: Diccionario sembrado en MongoDB: {len(todos_los_terminos)} terminos cargados.")

        # --- 3. Cargar y sembrar cuestionarios (Quizzes) ---
        print("\nCargando cuestionarios (quizzes)...")
        with open(RUTA_CUESTIONARIOS, "r", encoding="utf-8") as f:
            cuestionarios = json.load(f)

        base_datos.quizzes.delete_many({})
        if cuestionarios:
            base_datos.quizzes.insert_many(cuestionarios)
            print(f"OK: Cuestionarios sembrados en MongoDB: {len(cuestionarios)} preguntas cargadas.")

        # --- 4. Limpiar caché de traducciones viejas ---
        base_datos.cache.delete_many({})
        print("OK: Caché de traducciones limpiada en MongoDB Atlas.")

        print("\n*** ¡Sembrado de base de datos finalizado con exito en MongoDB Atlas! ***")

    except Exception as e:
        print(f"ERROR durante el sembrado de base de datos: {e}")

if __name__ == "__main__":
    sembrar_base_datos()
