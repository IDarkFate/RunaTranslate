import React, { useState, useEffect } from 'react';
import { 
  Star, Trash2, Search, ArrowRightLeft, Clock, Bookmark, 
  ChevronLeft, ChevronRight, Download, RefreshCw, AlertCircle 
} from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

export default function HistoryList({ showToast }) {
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'starred', 'es_qu', 'es_ay'
  
  // Estados para Paginación de Grandes Datos
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limite = 6; // Cantidad de elementos por página

  // Cargar historial paginado desde el backend
  const loadHistoryData = async () => {
    setIsLoading(true);
    try {
      const salto = (currentPage - 1) * limite;
      const token = sessionStorage.getItem('tokenUser');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/history?limite=${limite}&salto=${salto}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
      showToast('Error al consultar el historial del servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, [currentPage]);

  // Alternar favorito (estrella) - Optimistic UI
  const handleToggleStar = async (id, currentStarred) => {
    const estadoPrevio = currentStarred;
    const nuevoEstado = !currentStarred;
    
    // Cambiar optimísticamente en la UI local
    setHistoryData(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, is_starred: nuevoEstado };
      }
      return item;
    }));
    showToast(nuevoEstado ? 'Guardado en favoritos' : 'Eliminado de favoritos', 'success');

    try {
      const token = sessionStorage.getItem('tokenUser');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/history/${id}/star`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ is_starred: nuevoEstado })
      });
      if (!res.ok) {
        // Revertir si falla
        setHistoryData(prev => prev.map(item => {
          if (item.id === id) {
            return { ...item, is_starred: estadoPrevio };
          }
          return item;
        }));
        showToast('Error al actualizar el favorito.', 'error');
      }
    } catch (e) {
      setHistoryData(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, is_starred: estadoPrevio };
        }
        return item;
      }));
      showToast('Error de conexión de red.', 'error');
    }
  };

  // Eliminar elemento del historial
  const handleDeleteItem = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta traducción de tu historial?')) return;
    
    try {
      const token = sessionStorage.getItem('tokenUser');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: headers
      });
      if (res.ok) {
        showToast('Traducción eliminada del historial.', 'success');
        // Si eliminamos el último elemento de la página, retroceder una página si es posible
        if (historyData.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else {
          loadHistoryData();
        }
      }
    } catch (e) {
      console.error('Error deleting history item:', e);
      showToast('No se pudo eliminar el registro.', 'error');
    }
  };

  // Exportar Historial a CSV (Optimizado para Grandes Datos)
  const handleExportCSV = async () => {
    try {
      const token = sessionStorage.getItem('tokenUser');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/history?limite=1000&salto=0', { headers });
      if (!res.ok) throw new Error('Error al obtener datos consolidados');
      
      const allHistory = await res.json();
      if (allHistory.length === 0) {
        showToast('El historial está vacío. No hay datos para exportar.', 'info');
        return;
      }

      // Encabezados del archivo CSV
      let csvContent = "\uFEFF"; // BOM para soportar tildes en Excel en español
      csvContent += "ID,Fecha,Idioma Origen,Idioma Destino,Texto Original,Texto Traducido,Favorito\r\n";
      
      allHistory.forEach(item => {
        const fecha = new Date(item.timestamp).toLocaleString('es-PE');
        const origen = `"${item.source_text.replace(/"/g, '""')}"`;
        const traduccion = `"${item.translated_text.replace(/"/g, '""')}"`;
        const esFavorito = item.is_starred ? 'SÍ' : 'NO';
        
        const fila = `${item.id},${fecha},${item.source_lang.toUpperCase()},${item.target_lang.toUpperCase()},${origen},${traduccion},${esFavorito}`;
        csvContent += fila + "\r\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `runatranslate_historial_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('¡Historial exportado a CSV con éxito!', 'success');
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      showToast('Hubo un problema al generar la exportación de datos.', 'error');
    }
  };

  // Formatear timestamp
  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return timeStr;
    }
  };

  // Filtrar y buscar localmente sobre la página cargada
  const filteredHistory = historyData.filter((item) => {
    const textMatch = 
      item.source_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translated_text.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!textMatch) return false;

    if (activeFilter === 'starred') {
      return item.is_starred;
    } else if (activeFilter === 'es_qu') {
      return (item.source_lang === 'es' && item.target_lang === 'qu') || (item.source_lang === 'qu' && item.target_lang === 'es');
    } else if (activeFilter === 'es_ay') {
      return (item.source_lang === 'es' && item.target_lang === 'ay') || (item.source_lang === 'ay' && item.target_lang === 'es');
    }
    
    return true;
  });

  return (
    <Card 
      className="history-panel fadeIn"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={22} style={{ color: 'var(--color-primary)' }} />
          Historial de Traducciones
        </div>
      }
      headerActions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button 
            variant="secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={handleExportCSV}
            title="Exportar base de datos consolidada a formato CSV"
          >
            <Download size={14} />
            Exportar CSV
          </Button>
          
          <Button
            variant="secondary"
            style={{ padding: '0.4rem', width: '32px', height: '32px' }}
            onClick={loadHistoryData}
            title="Refrescar lista"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      }
    >
      {/* Buscador e Filtros - Bootstrap Row */}
      <div className="row g-3 align-items-center mt-1 mb-4 text-start">
        <div className="col-md-5">
          <div className="position-relative">
            <input
              type="text"
              className="form-control search-input ps-5"
              placeholder="Buscar en la página..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="col-md-7 d-flex flex-wrap gap-2 justify-content-md-end justify-content-start">
          <Button 
            variant={activeFilter === 'all' ? 'primary' : 'secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => setActiveFilter('all')}
          >
            Todos
          </Button>
          <Button 
            variant={activeFilter === 'starred' ? 'primary' : 'secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => setActiveFilter('starred')}
          >
            <Bookmark size={12} style={{ fill: activeFilter === 'starred' ? 'currentColor' : 'none' }} />
            Favoritos
          </Button>
          <Button 
            variant={activeFilter === 'es_qu' ? 'primary' : 'secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => setActiveFilter('es_qu')}
          >
            Quechua
          </Button>
          <Button 
            variant={activeFilter === 'es_ay' ? 'primary' : 'secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => setActiveFilter('es_ay')}
          >
            Aymara
          </Button>
        </div>
      </div>

      {/* Lista de Historial o Estados */}
      {isLoading ? (
        <div className="empty-state py-5">
          <RefreshCw size={36} className="animate-spin text-muted" />
          <p>Consultando base de datos MongoDB...</p>
        </div>
      ) : filteredHistory.length > 0 ? (
        <>
          <div className="d-flex flex-column gap-3 text-start">
            {filteredHistory.map((item) => {
              const isQuechua = item.source_lang === 'qu' || item.target_lang === 'qu';
              const langLabel = isQuechua 
                ? `${item.source_lang.toUpperCase()} ↔ ${item.target_lang.toUpperCase()} (Quechua)`
                : `${item.source_lang.toUpperCase()} ↔ ${item.target_lang.toUpperCase()} (Aymara)`;
                
              return (
                <div key={item.id} className="card p-3 history-item fadeIn">
                  <div className="row g-3 align-items-center w-100 m-0">
                    {/* Contenido principal (Origen -> Destino) */}
                    <div className="col-lg-8 p-0">
                      <div className="row g-2 align-items-center m-0">
                        <div className="col-md-5 p-0">
                          <span className="history-text fw-semibold d-block text-break">{item.source_text}</span>
                          <span className="text-muted small text-uppercase" style={{ fontSize: '0.7rem' }}>
                            {item.source_lang === 'es' ? 'Español' : isQuechua ? 'Quechua' : 'Aymara'}
                          </span>
                        </div>

                        <div className="col-md-2 text-center text-muted py-2 py-md-0 p-0">
                          <ArrowRightLeft size={16} />
                        </div>

                        <div className="col-md-5 p-0">
                          <span className="history-text fw-semibold d-block text-break" style={{ color: 'var(--color-primary)' }}>{item.translated_text}</span>
                          <span className="text-muted small text-uppercase" style={{ fontSize: '0.7rem' }}>
                            {item.target_lang === 'es' ? 'Español' : isQuechua ? 'Quechua' : 'Aymara'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata y Acciones */}
                    <div className="col-lg-4 d-flex flex-column align-items-lg-end align-items-start gap-2 p-0">
                      <div className="history-item-meta text-muted small">
                        {formatTime(item.timestamp)}
                      </div>
                      
                      <div className="d-flex align-items-center gap-2">
                        <Badge variant="info" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', textTransform: 'none' }}>
                          {langLabel}
                        </Badge>
                        <Button 
                          variant="icon"
                          className={item.is_starred ? 'active' : ''}
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => handleToggleStar(item.id, item.is_starred)}
                          title="Marcar como favorito"
                        >
                          <Star size={14} style={{ fill: item.is_starred ? 'var(--color-primary)' : 'none' }} />
                        </Button>
                        <Button 
                          variant="icon"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => handleDeleteItem(item.id)}
                          title="Eliminar del historial"
                        >
                          <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selector de Paginación para Grandes Datos */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem', 
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <Button 
              variant="secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Página <strong>{currentPage}</strong>
            </span>
            <Button 
              variant="secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={historyData.length < limite} // Deshabilitar si la página no está completa
            >
              Siguiente
              <ChevronRight size={14} />
            </Button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Bookmark size={36} className="empty-state-icon" />
          <p>
            {currentPage > 1 
              ? 'No hay más traducciones en esta página.' 
              : 'No hay traducciones guardadas en esta categoría del historial.'}
          </p>
          {currentPage > 1 && (
            <Button variant="secondary" onClick={() => setCurrentPage(1)}>
              Volver a Página 1
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
