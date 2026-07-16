import os
import sys

# Asegurar que el directorio actual esté en la ruta para las importaciones locales
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importar la capa de servicios de la nueva arquitectura modular
import services.translation_service as ts
import services.admin_service as ads

def test_translation_engine():
    print("--- Probando Motor de Traduccion (Servicios) ---")
    
    # 1. Test español a quechua exacto en diccionario (traducir)
    res, note, engine, det = ts.traducir("hola", "es", "qu")
    print(f"Traduccion 'hola' (es -> qu): '{res}' | Nota: {note} | Motor: {engine}")
    assert res == "allianllachu", "Error en traduccion exacta de 'hola'"
    
    # 2. Test español a aymara exacto en diccionario (traducir)
    res, note, engine, det = ts.traducir("agua", "es", "ay")
    print(f"Traduccion 'agua' (es -> ay): '{res}' | Nota: {note} | Motor: {engine}")
    assert res == "uma", "Error en traduccion exacta de 'agua'"
    
    # 3. Test traducción palabra por palabra (saludo + amigo) (traducir)
    res, note, engine, det = ts.traducir("hola amigo", "es", "qu")
    print(f"Traduccion 'hola amigo' (es -> qu): '{res}' | Nota: {note} | Motor: {engine}")
    assert "allianllachu kumpa" in res.lower(), "Error en traduccion compuesta"
    
    print(">>> Motor de traduccion (Servicio): OK")

def test_database_mongodb():
    print("--- Probando Operaciones de Base de Datos MongoDB (Servicios) ---")
    
    # 1. Guardar traducción en el historial de MongoDB (guardar_traduccion)
    db_id = ts.guardar_traduccion("fuego", "nina", "es", "qu")
    print(f"Guardando traduccion (ID retornado: {db_id})")
    assert db_id is not None, "No se pudo guardar la traduccion"
    
    # 2. Consultar el historial desde MongoDB (obtener_historial)
    history = ts.obtener_historial(limite=5)
    print(f"Historial recuperado ({len(history)} elementos)")
    assert len(history) > 0, "El historial de traduccion esta vacio"
    
    # 3. Alternar favoritos (estrellas) en MongoDB (alternar_favorito)
    success = ts.alternar_favorito(db_id, True)
    assert success is True, "No se pudo marcar como favorito"
    history_updated = ts.obtener_historial(limite=5)
    item = next(x for x in history_updated if x["id"] == str(db_id))
    print(f"Favorito marcado para ID {db_id}: {item['is_starred']}")
    assert item["is_starred"] is True, "El estado de favorito no cambio a True"
    
    # 4. Guardar retroalimentación de correcciones (guardar_feedback)
    feedback_ok = ts.guardar_feedback(
        calificacion=4,
        texto_origen="fuego",
        texto_traducido="nina",
        idioma_origen="es",
        idioma_destino="qu",
        comentarios="Verificacion de modularidad"
    )
    print(f"Guardando retroalimentacion: {feedback_ok}")
    assert feedback_ok is True, "No se pudo registrar la retroalimentacion"
    
    # 5. Obtener estadísticas globales administrativas (get_admin_stats)
    stats = ads.get_admin_stats()
    print("Estadisticas administrativas calculadas:")
    print(f"  - Total traducciones: {stats['total_translations']}")
    print(f"  - Rating promedio: {stats['average_rating']}")
    print(f"  - Tipo de BD activa: {stats['database_type']}")
    assert stats["total_translations"] >= 1, "Calculo incorrecto de volumen total"
    
    print(">>> Conexion y consultas a MongoDB (Servicios): OK")

if __name__ == "__main__":
    print("=== INICIANDO PRUEBAS UNITARIAS DE RUNATRANSLATE (MODULAR) ===")
    try:
        test_translation_engine()
        print()
        test_database_mongodb()
        print("\n=== ¡TODAS LAS PRUEBAS MODULARES PASARON CON EXITO! ===")
        sys.exit(0)
    except AssertionError as error:
        print(f"\n[ERROR DE ASERCION]: {error}")
        sys.exit(1)
    except Exception as error:
        print(f"\n[ERROR INESPERADO]: {error}")
        sys.exit(1)
