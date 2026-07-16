import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Translator from './components/Translator';
import LearnHub from './components/LearnHub';
import HistoryList from './components/HistoryList';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import UserLogin from './components/UserLogin';
import { Languages, BookOpen, Clock, Shield, LogIn, X } from 'lucide-react';
import Button from './components/ui/Button';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('translator');
  const [serverStatus, setServerStatus] = useState({
    status: 'offline',
    database: 'mongodb',
    openai_integrated: false
  });
  
  // Estados de Tema Claro/Oscuro persistente
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Estado de Autenticación para el Panel Admin
  const [adminAuthenticated, setAdminAuthenticated] = useState(
    !!sessionStorage.getItem('tokenAdmin')
  );

  // Estado de Autenticación para Historial de Usuario
  const [userAuthenticated, setUserAuthenticated] = useState(
    !!sessionStorage.getItem('tokenUser')
  );
  const [userName, setUserName] = useState(
    sessionStorage.getItem('userName') || ''
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Estado del sistema de notificaciones Toast no intrusivo
  const [toasts, setToasts] = useState([]);

  // Mostrar Toasts flotantes
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-eliminar el toast después de 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Alternar entre modo claro y oscuro
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    showToast(`Modo ${nextTheme === 'light' ? 'claro' : 'oscuro'} activado`, 'info');
  };

  // Aplicar tema en el elemento raíz del HTML
  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  // --- ENRUTAMIENTO POR HASH (OCULTA EL PANEL POR DEFECTO Y REDIRECCIONA) ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setActiveTab('admin');
      } else if (hash === '#learn') {
        setActiveTab('learn');
      } else if (hash === '#history') {
        setActiveTab('history');
      } else {
        setActiveTab('translator');
      }
    };

    // Evaluar hash al cargar la página
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Verificar el estado del servidor FastAPI al cargar y cada 10s
  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus({
          status: 'online',
          database: data.database,
          openai_integrated: data.openai_integrated
        });
      } else {
        setServerStatus((prev) => ({ ...prev, status: 'offline' }));
      }
    } catch (e) {
      setServerStatus((prev) => ({ ...prev, status: 'offline' }));
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar sesión de Admin
  const handleAdminLogout = () => {
    sessionStorage.removeItem('tokenAdmin');
    setAdminAuthenticated(false);
    showToast('Sesión de administrador cerrada.', 'info');
    window.location.hash = '#translator'; // Redirigir al traductor
  };

  // Cerrar sesión de Usuario Normal
  const handleUserLogout = () => {
    sessionStorage.removeItem('tokenUser');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('tokenAdmin');
    setUserAuthenticated(false);
    setAdminAuthenticated(false);
    setUserName('');
    showToast('Sesión de usuario cerrada.', 'info');
    window.location.hash = '#translator'; // Redirigir al traductor
  };

  return (
    <div className="container app-container">
      {/* Luces de fondo animadas para estética Glassmorphism */}
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>

      {/* Encabezado con estado del servidor, IA, tema y sesión de usuario */}
      <Header 
        status={serverStatus} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        userAuthenticated={userAuthenticated}
        userName={userName}
        onUserLogout={handleUserLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Barra de Navegación por Pestañas - Bootstrap Nav Pills */}
      <nav className="nav nav-pills nav-fill nav-tabs gap-2 mt-3 mb-4">
        <button 
          className={`nav-link nav-tab d-flex align-items-center justify-content-center gap-2 ${activeTab === 'translator' ? 'active' : ''}`}
          onClick={() => {
            window.location.hash = '#translator';
            setActiveTab('translator');
          }}
        >
          <Languages size={18} />
          Traductor
        </button>
        <button 
          className={`nav-link nav-tab d-flex align-items-center justify-content-center gap-2 ${activeTab === 'learn' ? 'active' : ''}`}
          onClick={() => {
            window.location.hash = '#learn';
            setActiveTab('learn');
            checkServerStatus();
          }}
        >
          <BookOpen size={18} />
          Preservación Cultural
        </button>
        <button 
          className={`nav-link nav-tab d-flex align-items-center justify-content-center gap-2 ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            window.location.hash = '#history';
            setActiveTab('history');
          }}
        >
          <Clock size={18} />
          Historial
        </button>

        {adminAuthenticated && (
          <button 
            className={`nav-link nav-tab d-flex align-items-center justify-content-center gap-2 ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              window.location.hash = '#admin';
              setActiveTab('admin');
            }}
          >
            <Shield size={18} />
            Panel Admin
          </button>
        )}
      </nav>

      {/* Contenedor Principal Dinámico */}
      <main className="main-content">
        {activeTab === 'translator' && (
          <Translator onTranslationSaved={checkServerStatus} showToast={showToast} />
        )}
        
        {activeTab === 'learn' && (
          <LearnHub showToast={showToast} />
        )}
        
        {activeTab === 'history' && (
          userAuthenticated ? (
            <HistoryList showToast={showToast} />
          ) : (
            <div className="history-placeholder glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', animation: 'fadeIn 0.3s ease-out', maxWidth: '580px', margin: '2rem auto' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-full)', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Tu Historial Personal es Privado</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.5' }}>
                  Guarda tus traducciones favoritas, filtra por idiomas y visualiza tu actividad. Inicia sesión de forma segura para acceder.
                </p>
              </div>
              <Button 
                variant="primary" 
                onClick={() => setIsLoginModalOpen(true)} 
                style={{ fontWeight: '600', padding: '0.65rem 2.2rem', marginTop: '0.5rem' }}
              >
                Iniciar Sesión / Registrarse
              </Button>
            </div>
          )
        )}
        
        {activeTab === 'admin' && (
          adminAuthenticated ? (
            <AdminDashboard onLogout={handleAdminLogout} showToast={showToast} />
          ) : (
            <AdminLogin onLoginSuccess={() => setAdminAuthenticated(true)} showToast={showToast} />
          )
        )}
      </main>

      {/* Contenedor flotante para el sistema de Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type} fadeIn`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Modal flotante de autenticación */}
      {isLoginModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            {/* Botón de cerrar modal en la esquina superior derecha */}
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-full)',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                zIndex: 1010,
                transition: 'all 0.2s'
              }}
              title="Cerrar ventana"
            >
              <X size={16} />
            </button>
            <UserLogin 
              onLoginSuccess={() => {
                setUserAuthenticated(true);
                setAdminAuthenticated(!!sessionStorage.getItem('tokenAdmin'));
                setUserName(sessionStorage.getItem('userName') || '');
                setIsLoginModalOpen(false);
              }} 
              showToast={showToast} 
            />
          </div>
        </div>
      )}

      {/* Pie de Página Premium */}
      <footer style={{
        textAlign: 'center', 
        padding: '2rem 0', 
        borderTop: '1px solid var(--border-color)', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div>RunaTranslate © {new Date().getFullYear()} — Inclusión digital y preservación de lenguas originarias.</div>
      </footer>
    </div>
  );
}

export default App;
