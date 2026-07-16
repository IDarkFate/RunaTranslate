import React, { useState, useEffect } from 'react';
import { 
  BarChart3, MessageSquareCode, Award, Database, 
  RefreshCw, MessageSquare, AlertCircle, Languages,
  LogOut, ChevronLeft, ChevronRight, PlusCircle, Trash2, UserPlus, Trophy
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { apiRequest, eliminarTokenAdmin } from '../utils/api';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

export default function AdminDashboard({ onLogout, showToast }) {
  // Pestañas internas del Admin: 'analytics' | 'trivia' | 'admins'
  const [activeSubTab, setActiveSubTab] = useState('analytics');

  const [stats, setStats] = useState({
    total_translations: 0,
    languages: { es_qu: 0, qu_es: 0, es_ay: 0, ay_es: 0 },
    average_rating: 0.0,
    feedback_count: 0,
    database_type: 'mongodb'
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Paginación para buzón de correcciones
  const [feedbackPage, setFeedbackPage] = useState(1);
  const feedbacksLimite = 3; 

  // --- ESTADOS DE LA GESTIÓN DE TRIVIAS ---
  const [quizzes, setQuizzes] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOption1, setNewOption1] = useState('');
  const [newOption2, setNewOption2] = useState('');
  const [newOption3, setNewOption3] = useState('');
  const [newOption4, setNewOption4] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('1');
  const [newExplanation, setNewExplanation] = useState('');
  const [newScore, setNewScore] = useState(10);

  // --- ESTADOS DE NUEVO ADMIN ---
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsData = await apiRequest('/api/admin/stats');
      setStats(statsData);
      
      const salto = (feedbackPage - 1) * feedbacksLimite;
      const feedbackData = await apiRequest(`/api/admin/feedback?limite=${feedbacksLimite}&salto=${salto}`);
      setFeedbacks(feedbackData);
    } catch (e) {
      console.error('Error fetching admin dashboard data:', e);
      showToast(e.message || 'Error al consultar datos.', 'error');
      if (e.message.includes('expirado') || e.message.includes('inválido') || e.message.includes('401')) {
        handleCerrarSesion();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const data = await apiRequest('/api/admin/quizzes');
      setQuizzes(data);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar cuestionarios de trivia.', 'error');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'analytics') {
      fetchAdminData();
    } else if (activeSubTab === 'trivia') {
      fetchQuizzes();
    }
  }, [feedbackPage, activeSubTab]);

  const handleCerrarSesion = () => {
    eliminarTokenAdmin();
    showToast('Sesión administrativa cerrada.', 'info');
    onLogout();
  };

  // --- HANDLER DE NUEVA TRIVIA ---
  const handleAddQuiz = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newOption1.trim() || !newOption2.trim() || !newOption3.trim() || !newOption4.trim() || !newExplanation.trim()) {
      showToast('Por favor, completa todos los campos del cuestionario.', 'error');
      return;
    }
    try {
      await apiRequest('/api/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          question: newQuestion.trim(),
          options: [newOption1.trim(), newOption2.trim(), newOption3.trim(), newOption4.trim()],
          correct_answer: parseInt(newCorrectAnswer),
          explanation: newExplanation.trim(),
          score: parseInt(newScore)
        })
      });
      showToast('Pregunta de trivia agregada con éxito.', 'success');
      // Limpiar campos
      setNewQuestion('');
      setNewOption1('');
      setNewOption2('');
      setNewOption3('');
      setNewOption4('');
      setNewExplanation('');
      setNewScore(10);
      fetchQuizzes();
    } catch (e) {
      showToast(e.message || 'Error al agregar pregunta.', 'error');
    }
  };

  // --- HANDLER DE BORRAR TRIVIA ---
  const handleDeleteQuiz = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta pregunta de trivia?')) return;
    try {
      await apiRequest(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
      showToast('Pregunta de trivia eliminada exitosamente.', 'success');
      fetchQuizzes();
    } catch (e) {
      showToast(e.message || 'Error al eliminar la pregunta.', 'error');
    }
  };

  // --- HANDLER DE CREAR ADMIN ---
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdminUser.trim().length < 3) {
      showToast('El usuario administrador debe tener al menos 3 caracteres.', 'error');
      return;
    }
    if (newAdminPassword.length < 4) {
      showToast('La contraseña debe tener al menos 4 caracteres.', 'error');
      return;
    }
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      showToast('Por favor, ingresa un correo electrónico válido.', 'error');
      return;
    }
    if (newAdminPin.trim().length < 4 || newAdminPin.trim().length > 6) {
      showToast('El PIN de seguridad debe tener entre 4 y 6 dígitos.', 'error');
      return;
    }
    try {
      await apiRequest('/api/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify({
          username: newAdminUser.trim(),
          password: newAdminPassword,
          email: newAdminEmail.trim(),
          recovery_pin: newAdminPin.trim()
        })
      });
      showToast(`Administrador '${newAdminUser}' creado con éxito.`, 'success');
      setNewAdminUser('');
      setNewAdminPassword('');
      setNewAdminEmail('');
      setNewAdminPin('');
    } catch (e) {
      showToast(e.message || 'Error al crear el nuevo administrador.', 'error');
    }
  };

  // --- GRÁFICOS RECHARTS ---
  const datosBarras = [
    { name: 'ES ➔ QU', cantidad: stats.languages.es_qu, fill: '#6366f1' },
    { name: 'QU ➔ ES', cantidad: stats.languages.qu_es, fill: '#4f46e5' },
    { name: 'ES ➔ AY', cantidad: stats.languages.es_ay, fill: '#f59e0b' },
    { name: 'AY ➔ ES', cantidad: stats.languages.ay_es, fill: '#d97706' }
  ];

  const totalQuechua = stats.languages.es_qu + stats.languages.qu_es;
  const totalAymara = stats.languages.es_ay + stats.languages.ay_es;
  const datosTorta = [
    { name: 'Quechua', value: totalQuechua || 0, color: '#6366f1' },
    { name: 'Aymara', value: totalAymara || 0, color: '#f59e0b' }
  ];
  const tieneDatos = totalQuechua > 0 || totalAymara > 0;

  return (
    <div className="fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} style={{ color: 'var(--color-primary)' }} />
            Módulo Administrativo RunaTranslate
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Supervisión y control del motor de traducción, cuestionarios y accesos administrativos.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button 
            variant="danger"
            onClick={handleCerrarSesion}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <LogOut size={14} />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Selector de pestañas internas */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)', 
        gap: '0.5rem', 
        paddingBottom: '0px', 
        marginBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveSubTab('analytics')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'analytics' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: activeSubTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Estadísticas y Correcciones
        </button>
        <button
          onClick={() => setActiveSubTab('trivia')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'trivia' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: activeSubTab === 'trivia' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Gestión de Trivia
        </button>
        <button
          onClick={() => setActiveSubTab('admins')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'admins' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: activeSubTab === 'admins' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Crear Administradores
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA: ESTADÍSTICAS Y BUZÓN */}
      {activeSubTab === 'analytics' && (
        <div className="d-flex flex-column gap-3 fadeIn">
          {/* Tarjetas KPI - Bootstrap Row */}
          <div className="row g-3 mb-2 text-start">
            <div className="col-sm-6 col-lg-3">
              <div className="stat-card card h-100 flex-row align-items-center gap-3">
                <div className="stat-icon-wrapper"><Languages size={22} /></div>
                <div>
                  <div className="stat-label">Traducciones Totales</div>
                  <div className="stat-value">{stats.total_translations}</div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="stat-card card h-100 flex-row align-items-center gap-3">
                <div className="stat-icon-wrapper gold"><Award size={22} /></div>
                <div>
                  <div className="stat-label">Calificación de Calidad</div>
                  <div className="stat-value">{stats.average_rating} / 5.0</div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="stat-card card h-100 flex-row align-items-center gap-3">
                <div className="stat-icon-wrapper green"><MessageSquareCode size={22} /></div>
                <div>
                  <div className="stat-label">Correcciones Recibidas</div>
                  <div className="stat-value">{stats.feedback_count}</div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="stat-card card h-100 flex-row align-items-center gap-3">
                <div className="stat-icon-wrapper" style={{ color: 'var(--color-primary)', background: 'rgba(245, 158, 11, 0.05)' }}><Database size={22} /></div>
                <div>
                  <div className="stat-label">Base de Datos</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: '700', textTransform: 'capitalize' }}>MongoDB Atlas</div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos y Buzón - Bootstrap Row */}
          <div className="row g-4 text-start">
            {/* Gráficos */}
            <div className="col-lg-6">
              <Card title="Analítica de Uso de Lenguas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Frecuencia por Sentido de Traducción</h4>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart data={datosBarras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }} />
                        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Distribución Temática: Quechua vs Aymara</h4>
                  {tieneDatos ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', height: 180 }}>
                      <div style={{ width: '150px', height: 150 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={datosTorta} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                              {datosTorta.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {datosTorta.map((item, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color }} />
                            <span>{item.name}: <strong>{item.value} consultas</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin consultas de traducción registradas.</div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Buzón */}
          <div className="col-lg-6">
            <Card title={`Buzón de Correcciones Sugeridas (${feedbacks.filter(f => f.corrected_text).length})`}>
              <div className="feedback-table-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '120px', width: '100%', borderRadius: 'var(--radius-md)' }}></div>)}
                  </div>
                ) : feedbacks.filter(f => f.corrected_text).length > 0 ? (
                  <>
                    <div className="feedback-list-cards">
                      {feedbacks.filter(f => f.corrected_text).map((fb) => (
                        <div key={fb.id} className="feedback-card">
                          <div className="feedback-card-header">
                            <Badge variant={fb.rating >= 4 ? 'success' : 'warning'}>★ {fb.rating} estrellas</Badge>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(fb.timestamp).toLocaleDateString('es-PE')}</span>
                          </div>
                          <div className="feedback-card-body">
                            <div className="feedback-field">
                              <span className="feedback-field-label">Texto Original ({fb.source_lang.toUpperCase()}):</span>
                              <span>{fb.source_text}</span>
                            </div>
                            <div className="feedback-field">
                              <span className="feedback-field-label">Traducción Fallida ({fb.target_lang.toUpperCase()}):</span>
                              <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{fb.translated_text}</span>
                            </div>
                            <div className="feedback-field">
                              <span className="feedback-field-label">Corrección Propuesta:</span>
                              <strong style={{ color: 'var(--color-accent)' }}>{fb.corrected_text}</strong>
                            </div>
                          </div>
                          {fb.comments && <div className="feedback-comments"><span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block' }}>Contexto:</span>"{fb.comments}"</div>}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <Button variant="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setFeedbackPage(p => Math.max(p - 1, 1))} disabled={feedbackPage === 1}><ChevronLeft size={12} /> Anterior</Button>
                      <span style={{ fontSize: '0.8rem' }}>Página {feedbackPage}</span>
                      <Button variant="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setFeedbackPage(p => p + 1)} disabled={feedbacks.length < feedbacksLimite}>Siguiente <ChevronRight size={12} /></Button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                    <AlertCircle size={32} className="empty-state-icon" />
                    <p>No se han registrado sugerencias en esta página.</p>
                    {feedbackPage > 1 && <Button variant="secondary" onClick={() => setFeedbackPage(1)}>Volver al Inicio</Button>}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      )}

      {/* CONTENIDO DE PESTAÑA: GESTIÓN DE TRIVIAS */}
      {activeSubTab === 'trivia' && (
        <div className="d-flex flex-column gap-3 fadeIn">
          <div className="row g-4 text-start">
            {/* Formulario para agregar - Bootstrap Column */}
            <div className="col-lg-6">
              <Card title="Agregar Nueva Pregunta de Trivia">
                <form onSubmit={handleAddQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Pregunta (Ej. ¿Qué significa 'Allpa' en Quechua?)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ingresa la pregunta" 
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Opción 1</label>
                        <input type="text" className="form-control" placeholder="Opción 1" value={newOption1} onChange={(e) => setNewOption1(e.target.value)} required />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Opción 2</label>
                        <input type="text" className="form-control" placeholder="Opción 2" value={newOption2} onChange={(e) => setNewOption2(e.target.value)} required />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Opción 3</label>
                        <input type="text" className="form-control" placeholder="Opción 3" value={newOption3} onChange={(e) => setNewOption3(e.target.value)} required />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Opción 4</label>
                        <input type="text" className="form-control" placeholder="Opción 4" value={newOption4} onChange={(e) => setNewOption4(e.target.value)} required />
                      </div>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Opción Correcta</label>
                        <select 
                          className="form-select" 
                          style={{ height: '40px' }}
                          value={newCorrectAnswer}
                          onChange={(e) => setNewCorrectAnswer(e.target.value)}
                        >
                          <option value="1">Opción 1</option>
                          <option value="2">Opción 2</option>
                          <option value="3">Opción 3</option>
                          <option value="4">Opción 4</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Puntaje</label>
                        <input type="number" className="form-control" min={1} max={100} value={newScore} onChange={(e) => setNewScore(e.target.value)} required />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Explicación (Didáctica)</label>
                    <textarea 
                      className="form-control" 
                      style={{ height: '70px', resize: 'none' }}
                      placeholder="Detalla por qué es la correcta para educar al usuario..." 
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      required 
                    />
                  </div>

                  <Button type="submit" variant="primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, marginTop: '0.5rem' }}>
                    <PlusCircle size={16} />
                    Guardar Cuestionario
                  </Button>
                </form>
              </Card>
            </div>

            {/* Listado de preguntas - Bootstrap Column */}
            <div className="col-lg-6">
              <Card title={`Preguntas Registradas (${quizzes.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {quizzes.length > 0 ? (
                  quizzes.map((q, idx) => (
                    <div key={q.id || idx} style={{ 
                      background: 'var(--card-inner-bg)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '1rem', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      textAlign: 'left'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>#{idx + 1}</span>
                          <Badge variant="primary">★ {q.score} pts</Badge>
                        </div>
                        <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{q.question}</strong>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.5rem' }}>
                          {q.options.map((opt, i) => (
                            <span key={i} style={{ 
                              fontSize: '0.75rem', 
                              color: (i + 1) === q.correct_answer ? 'var(--color-success)' : 'var(--text-secondary)',
                              fontWeight: (i + 1) === q.correct_answer ? 'bold' : 'normal'
                            }}>
                              {i + 1}. {opt} {(i + 1) === q.correct_answer && '✓'}
                            </span>
                          ))}
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                          <strong>Explicación:</strong> {q.explanation}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteQuiz(q.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background 0.2s'
                        }}
                        title="Eliminar pregunta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Trophy size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay preguntas en el cuestionario. Agrega una desde el formulario lateral.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      )}

      {/* CONTENIDO DE PESTAÑA: CREAR ADMINISTRADORES */}
      {activeSubTab === 'admins' && (
        <div className="d-flex justify-content-center py-4 fadeIn">
          <Card title="Registrar Nuevo Administrador" style={{ width: '100%', maxWidth: '420px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left', marginBottom: '1.5rem' }}>
              Registra credenciales administrativas adicionales. El nuevo administrador podrá ingresar al panel completo, gestionar trivias y dar soporte a los datos.
            </p>
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Usuario Administrador</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. admin_soporte" 
                  value={newAdminUser} 
                  onChange={(e) => setNewAdminUser(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Ej. soporte@runatranslate.com" 
                  value={newAdminEmail} 
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Contraseña de Acceso</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Mínimo 4 caracteres" 
                  value={newAdminPassword} 
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>PIN de Recuperación (4-6 dígitos)</label>
                <input 
                  type="text" 
                  pattern="[0-9]*"
                  maxLength={6}
                  className="form-control" 
                  placeholder="Ej. 1234" 
                  value={newAdminPin} 
                  onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                  required 
                />
              </div>

              <Button type="submit" variant="primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.75rem' }}>
                <UserPlus size={16} />
                Crear Nuevo Administrador
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
