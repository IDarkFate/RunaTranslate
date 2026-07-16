import React, { useState } from 'react';
import { Lock, User, ShieldAlert, Key } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { apiRequest, guardarTokenAdmin } from '../utils/api';

export default function AdminLogin({ onLoginSuccess, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validaciones del lado del cliente
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      // Consumo de API usando apiRequest centralizado
      const result = await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (result.success && result.token) {
        guardarTokenAdmin(result.token);
        showToast('¡Sesión administrativa iniciada con éxito!', 'success');
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg(error.message || 'Error de conexión con el servidor.');
      showToast(error.message || 'Error al iniciar sesión', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5 fadeIn">
      <Card 
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem 1.5rem',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.1)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={28} />
          </div>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Acceso Administrativo
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Ingresa tus credenciales para acceder a las estadísticas en tiempo real y buzón de retroalimentación.
        </p>

        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3 text-start animate-shake">
            <ShieldAlert size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          <div className="form-group">
            <label htmlFor="username" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Usuario Administrador
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="Ej. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
              <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontWeight: 600 }}
            disabled={isLoading}
          >
            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Tip: Las credenciales por defecto son <strong>admin</strong> / <strong>RunaAdmin2026</strong>
        </div>
      </Card>
    </div>
  );
}
