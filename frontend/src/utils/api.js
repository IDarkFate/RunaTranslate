// ==========================================================================
// CLIENTE CENTRALIZADO DE API CON SOPORTE JWT PARA ADMIN Y USUARIOS
// ==========================================================================

export const obtenerTokenAdmin = () => sessionStorage.getItem('tokenAdmin');
export const guardarTokenAdmin = (token) => sessionStorage.setItem('tokenAdmin', token);
export const eliminarTokenAdmin = () => sessionStorage.removeItem('tokenAdmin');

export const obtenerTokenUser = () => sessionStorage.getItem('tokenUser');
export const guardarTokenUser = (token) => sessionStorage.setItem('tokenUser', token);
export const eliminarTokenUser = () => sessionStorage.removeItem('tokenUser');

/**
 * Realiza peticiones HTTP a la API inyectando el token JWT si está disponible
 * y gestiona las respuestas de error en formato unificado.
 */
export async function apiRequest(endpoint, opciones = {}) {
  const adminToken = obtenerTokenAdmin();
  const userToken = obtenerTokenUser();
  
  // Utilizar el token correspondiente
  const token = adminToken || userToken;
  
  const cabeceras = {
    'Content-Type': 'application/json',
    ...opciones.headers
  };

  // Inyectar token JWT si la ruta requiere autenticación
  if (token) {
    cabeceras['Authorization'] = `Bearer ${token}`;
  }

  const configuracion = {
    ...opciones,
    headers: cabeceras
  };

  try {
    const respuesta = await fetch(endpoint, configuracion);
    
    // Si la respuesta no es 2xx, formatear y lanzar error con el mensaje de backend
    if (!respuesta.ok) {
      let mensajeError = 'Error de red al consultar el servidor.';
      try {
        const errorJson = await respuesta.json();
        // Buscar el mensaje estandarizado que devuelve nuestro exception_handler
        mensajeError = errorJson.mensaje || errorJson.detail || mensajeError;
      } catch (parseError) {
        // En caso de que no sea un JSON válido
      }
      throw new Error(mensajeError);
    }

    // Retornar JSON si hay contenido
    if (respuesta.status === 204) return null;
    return await respuesta.json();
  } catch (error) {
    console.error(`Error en apiRequest [${endpoint}]:`, error);
    throw error;
  }
}
