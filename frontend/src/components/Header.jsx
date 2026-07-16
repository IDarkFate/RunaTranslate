import React from 'react';
import { Languages, Sun, Moon, LogOut } from 'lucide-react';
import Button from './ui/Button';

export default function Header({ status, theme, toggleTheme, userAuthenticated, userName, onUserLogout, onOpenLoginModal }) {
  const isOnline = status.status === 'online';

  return (
    <header className="header d-flex justify-content-between align-items-center flex-wrap gap-3 py-3 border-bottom border-secondary-subtle">
      <div className="logo-container d-flex align-items-center gap-2">
        <div className="logo-icon">
          <Languages size={24} />
        </div>
        <div>
          <h1 className="logo-text m-0">RunaTranslate</h1>
          <span className="text-secondary d-block" style={{ fontSize: '0.75rem', marginTop: '-2px' }}>
            Traductor Inteligente de Lenguas Regionales
          </span>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 flex-wrap">
        
        {/* Nombre de Usuario y Cierre de Sesión si está Autenticado */}
        {userAuthenticated ? (
          <div 
            className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill small border"
            style={{ 
              background: 'var(--card-inner-bg)', 
              borderColor: 'var(--border-color)'
            }}
          >
            <span>Hola, <strong>{userName}</strong></span>
            <button 
              onClick={onUserLogout} 
              className="btn p-0 bg-transparent border-0 d-flex align-items-center"
              style={{ 
                color: 'var(--color-danger)',
                width: 'auto',
                height: 'auto'
              }} 
              title="Cerrar sesión de usuario"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <Button 
            variant="secondary" 
            onClick={onOpenLoginModal} 
            className="btn btn-secondary btn-sm rounded-pill fw-semibold"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
          >
            Ingresar
          </Button>
        )}
        {/* Selector de Modo Claro/Oscuro */}
        <Button 
          variant="icon" 
          onClick={toggleTheme} 
          title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          className="rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '36px', height: '36px' }}
        >
          {theme === 'dark' ? <Sun size={16} style={{ color: 'var(--color-primary)' }} /> : <Moon size={16} style={{ color: 'var(--color-secondary)' }} />}
        </Button>
      </div>
    </header>
  );
}
