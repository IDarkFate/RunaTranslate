from pymongo import MongoClient, TEXT
from config import URI_CONEXION_MONGO, NOMBRE_BASE_DATOS

# ==========================================================================
# CONEXIÓN A LA BASE DE DATOS E ÍNDICES (OPTIMIZADO PARA GRANDES DATOS)
# ==========================================================================

# Variables globales que contienen las referencias activas a la conexión
cliente_mongo = None
base_datos = None

try:
    # Inicializar el cliente oficial de MongoDB (PyMongo)
    cliente_mongo = MongoClient(URI_CONEXION_MONGO, serverSelectionTimeoutMS=5000)
    
    # Validar la conexión forzando una llamada al servidor
    cliente_mongo.server_info()
    
    # Obtener referencia a la base de datos
    base_datos = cliente_mongo.get_database(NOMBRE_BASE_DATOS)
    print(f">>> Conexión establecida con éxito a la base de datos: '{NOMBRE_BASE_DATOS}'.")

    # ==========================================================================
    # CREACIÓN DE ÍNDICES DE BASE DE DATOS (ESENCIAL PARA GRANDES DATOS / BIG DATA)
    # ==========================================================================
    print(">>> Inicializando creación de índices para optimización de consultas masivas...")

    # 1. Colección de Historial (history)
    # - Índice descendente en timestamp para consultas cronológicas veloces
    base_datos.history.create_index([("timestamp", -1)])
    # - Índice simple en is_starred para filtrado rápido de favoritos
    base_datos.history.create_index([("is_starred", 1)])
    # - Índice de texto compuesto en texto original y traducción para búsquedas a gran escala
    try:
        base_datos.history.create_index(
            [("source_text", TEXT), ("translated_text", TEXT)],
            name="busqueda_texto_historial",
            default_language="spanish",
            language_override="no_override"
        )
    except Exception as e:
        # Si hay un conflicto de opciones o de configuración, se elimina el índice viejo y se crea el nuevo
        base_datos.history.drop_index("busqueda_texto_historial")
        base_datos.history.create_index(
            [("source_text", TEXT), ("translated_text", TEXT)],
            name="busqueda_texto_historial",
            default_language="spanish",
            language_override="no_override"
        )

    # 2. Colección de Diccionario (dictionary)
    # - Índice en el campo idioma para discriminar rápidamente entre variantes
    base_datos.dictionary.create_index([("language", 1)])
    # - Índice de texto para búsquedas veloces en el diccionario
    try:
        base_datos.dictionary.create_index(
            [("es", TEXT), ("qu", TEXT), ("ay", TEXT)],
            name="busqueda_texto_diccionario",
            default_language="spanish",
            language_override="no_override"
        )
    except Exception as e:
        base_datos.dictionary.drop_index("busqueda_texto_diccionario")
        base_datos.dictionary.create_index(
            [("es", TEXT), ("qu", TEXT), ("ay", TEXT)],
            name="busqueda_texto_diccionario",
            default_language="spanish",
            language_override="no_override"
        )

    # 3. Colección de Retroalimentaciones (feedback)
    # - Índice descendente en fecha para auditoría en el panel administrativo
    base_datos.feedback.create_index([("timestamp", -1)])

    # 4. No crear administrador genérico predefinido por seguridad
    pass

    # 5. Migrar automáticamente usuarios heredados (legacy) que no tienen email o PIN
    usuarios_sin_campos = base_datos.users.find({
        "$or": [
            {"email": {"$exists": False}},
            {"recovery_pin": {"$exists": False}}
        ]
    })
    for usr in usuarios_sin_campos:
        updates = {}
        username = usr.get("username", "usuario")
        if "email" not in usr or usr["email"] is None:
            updates["email"] = f"{username}@runatranslate.com"
        if "recovery_pin" not in usr or usr["recovery_pin"] is None:
            import hashlib
            updates["recovery_pin"] = hashlib.sha256("9999".encode()).hexdigest()
        
        if updates:
            base_datos.users.update_one({"_id": usr["_id"]}, {"$set": updates})

    # 6. Promover automáticamente el usuario 'kenny' a administrador si existe en users
    usuario_kenny = base_datos.users.find_one({"username": "kenny"})
    if usuario_kenny:
        admin_kenny = base_datos.admins.find_one({"username": "kenny"})
        if not admin_kenny:
            from datetime import datetime
            base_datos.admins.insert_one({
                "username": "kenny",
                "password": usuario_kenny["password"],  # Mismo hash de contraseña
                "created_by": "system",
                "created_at": datetime.utcnow().isoformat()
            })
            print(">>>> Usuario 'kenny' promovido con éxito a Administrador del sistema.")

    print("OK: Todos los indices de base de datos fueron creados y optimizados con exito.")

except Exception as error:
    print(f"ERROR CRÍTICO: No se pudo conectar a MongoDB o configurar índices. Detalles: {error}")
    # Detener el arranque si no se puede garantizar el acceso a la base de datos
    raise error
