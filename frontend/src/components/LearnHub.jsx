import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Trophy, Search, Volume2, ArrowRight, RotateCcw, 
  HelpCircle, GraduationCap, AlertCircle, RefreshCw, Heart, MessageSquare, Square
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function LearnHub({ showToast }) {
  // Pestañas internas: 'vocabulary' | 'quiz' | 'suggestions'
  const [activeSubTab, setActiveSubTab] = useState('vocabulary');

  // Estado de Vocabulario
  const [vocabLang, setVocabLang] = useState('quechua');
  const [vocabData, setVocabData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingVocab, setLoadingVocab] = useState(false);

  // Estado del Quiz
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState('start'); // 'start', 'playing', 'finished'
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Estado de Sugerencias de la Comunidad
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState(null);

  // Cancelar audio activo cuando cambie de sección, idioma o búsqueda
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeechText(null);
  }, [vocabLang, activeSubTab, searchQuery]);

  // Cargar vocabulario cuando cambia el idioma
  useEffect(() => {
    const fetchVocab = async () => {
      setLoadingVocab(true);
      try {
        const res = await fetch(`/api/learn/dictionary/${vocabLang}`);
        if (res.ok) {
          const data = await res.json();
          setVocabData(Array.isArray(data) ? data : []);
        } else {
          setVocabData([]);
        }
      } catch (e) {
        console.error('Error loading vocabulary:', e);
        setVocabData([]);
        if (showToast) showToast('No se pudo cargar el glosario del servidor.', 'error');
      } finally {
        setLoadingVocab(false);
      }
    };
    
    if (activeSubTab === 'vocabulary') {
      fetchVocab();
    }
  }, [vocabLang, activeSubTab]);

  // Cargar sugerencias de la comunidad
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/public/feedback');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.error('Error loading suggestions:', e);
      setSuggestions([]);
      if (showToast) showToast('No se pudieron obtener los aportes de la comunidad.', 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeSubTab]);

  // Cargar preguntas de Quiz desde la API
  const startNewQuiz = async () => {
    setLoadingQuiz(true);
    setQuizState('playing');
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setScore(0);
    try {
      const res = await fetch('/api/learn/quiz?limit=5');
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(Array.isArray(data) ? data : []);
      } else {
        setQuizQuestions([]);
      }
    } catch (e) {
      console.error('Error starting quiz:', e);
      setQuizQuestions([]);
      if (showToast) showToast('No se pudieron obtener preguntas del servidor.', 'error');
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Reproducir sonido para pronunciación
  const playPronunciation = (text, lang) => {
    if (!window.speechSynthesis) {
      if (showToast) showToast('La síntesis de voz no está disponible.', 'error');
      return;
    }

    if (activeSpeechText === text) {
      window.speechSynthesis.cancel();
      setActiveSpeechText(null);
      if (showToast) showToast('Pronunciación detenida.', 'info');
      return;
    }

    window.speechSynthesis.cancel();
    setActiveSpeechText(text);

    const utterance = new SpeechSynthesisUtterance(text || '');
    utterance.lang = 'es-PE';
    utterance.rate = 0.8;

    utterance.onend = () => setActiveSpeechText(null);
    utterance.onerror = () => setActiveSpeechText(null);
    utterance.oncancel = () => setActiveSpeechText(null);

    window.speechSynthesis.speak(utterance);
    if (showToast) showToast('Reproduciendo pronunciación...', 'info');
  };

  // Filtrar vocabulario según búsqueda de forma segura
  const filteredVocab = Array.isArray(vocabData) ? vocabData.filter((item) => {
    if (!item) return false;
    const termNative = (vocabLang === 'quechua' ? item.qu : item.ay) || '';
    const termEs = item.es || '';
    const termCat = item.category || '';
    const query = searchQuery.toLowerCase();
    return (
      termNative.toLowerCase().includes(query) ||
      termEs.toLowerCase().includes(query) ||
      termCat.toLowerCase().includes(query)
    );
  }) : [];

  // Pregunta actual segura
  const currentQuestion = quizQuestions[currentQuestionIndex];

  // Manejar respuesta de opción en el Quiz
  const handleOptionClick = (index) => {
    if (isAnswered || !currentQuestion) return;
    setSelectedOptionIndex(index);
    setIsAnswered(true);
    
    if (index === currentQuestion.answerIndex) {
      setScore((prev) => prev + 10);
      if (showToast) showToast('¡Excelente! Respuesta correcta.', 'success');
    } else {
      if (showToast) showToast('Respuesta incorrecta. ¡Sigue aprendiendo!', 'info');
    }
  };

  // Avanzar a la siguiente pregunta del Quiz
  const handleNextQuestion = () => {
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizState('finished');
      if (showToast) showToast('¡Trivia completada! Guarda tu puntuación.', 'success');
    }
  };

  // Apoyar una sugerencia con un like (voto)
  const handleToggleLike = async (feedbackId) => {
    const token = sessionStorage.getItem('tokenUser');
    if (!token) {
      if (showToast) showToast('Necesitas iniciar sesión para apoyar aportes de la comunidad.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/public/feedback/${feedbackId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Error al enviar tu apoyo.');
      }

      // Actualización optimista de me gustas en la UI
      setSuggestions((prev) => 
        prev.map((item) => {
          if (item.id === feedbackId) {
            const username = sessionStorage.getItem('userName') || '';
            let likedBy = [...(item.liked_by || [])];
            if (data.liked) {
              likedBy.push(username);
            } else {
              likedBy = likedBy.filter((u) => u !== username);
            }
            return {
              ...item,
              likes: data.likes,
              liked_by: likedBy
            };
          }
          return item;
        })
      );

      if (data.liked) {
        if (showToast) showToast('¡Apoyaste este aporte de traducción!', 'success');
      } else {
        if (showToast) showToast('Quitaste tu apoyo a este aporte.', 'info');
      }

    } catch (e) {
      if (showToast) showToast(e.message || 'Error al procesar el apoyo.', 'error');
    }
  };

  return (
    <div className="row g-4 align-items-start text-start">
      {/* Panel Izquierdo: Menú interactivo - Bootstrap Column */}
      <div className="col-lg-4">
        <Card className="mb-3">
          <div className="d-flex align-items-center gap-2 mb-3">
            <GraduationCap size={28} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Centro de Preservación</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Aprende y conserva lenguas originarias</p>
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <Button 
              variant={activeSubTab === 'vocabulary' ? 'primary' : 'secondary'}
              onClick={() => setActiveSubTab('vocabulary')}
              className="w-100 justify-content-start d-flex align-items-center gap-2"
            >
              <BookOpen size={18} />
              Diccionario y Vocabulario
            </Button>

            <Button 
              variant={activeSubTab === 'quiz' ? 'primary' : 'secondary'}
              onClick={() => {
                setActiveSubTab('quiz');
                if (quizState === 'start') {
                  startNewQuiz();
                }
              }}
              className="w-100 justify-content-start d-flex align-items-center gap-2"
            >
              <Trophy size={18} />
              Juego de Cuestionarios (Trivia)
            </Button>

            <Button 
              variant={activeSubTab === 'suggestions' ? 'primary' : 'secondary'}
              onClick={() => setActiveSubTab('suggestions')}
              className="w-100 justify-content-start d-flex align-items-center gap-2"
            >
              <MessageSquare size={18} />
              Aportes de la Comunidad
            </Button>
          </div>

          <div className="mt-3 p-3 border border-secondary-subtle rounded-3 small text-muted" style={{ background: 'var(--card-inner-bg)', lineHeight: '1.5' }}>
            <strong>¿Sabías qué?</strong><br />
            El Quechua no es un solo idioma, sino una familia lingüística con diversas variantes. Las más habladas son el Quechua Sureño (Cusco-Collao y Ayacucho) y el Quechua Ancashino. El Aymara es hablado principalmente en la meseta del Collao (Perú y Bolivia).
          </div>
        </Card>
      </div>

      {/* Panel Derecho: Contenido Dinámico - Bootstrap Column */}
      <div className="col-lg-8">
        <Card className="h-100">
        {/* SUB-SECCIÓN: DICCIONARIO / VOCABULARIO */}
        {activeSubTab === 'vocabulary' && (
          <div className="dict-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
                Diccionario Interactivo
              </h3>
              
              <div style={{ display: 'flex', background: 'var(--card-inner-bg)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <button 
                  className={`btn ${vocabLang === 'quechua' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => setVocabLang('quechua')}
                >
                  Quechua
                </button>
                <button 
                  className={`btn ${vocabLang === 'aymara' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => setVocabLang('aymara')}
                >
                  Aymara
                </button>
              </div>
            </div>

            <div className="search-bar-container">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="form-control search-input"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder={`Buscar palabras o categorías en ${vocabLang === 'quechua' ? 'Quechua' : 'Aymara'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="dict-list">
              {loadingVocab ? (
                [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-md)' }}></div>)
              ) : filteredVocab.length > 0 ? (
                filteredVocab.map((item, idx) => (
                  <div key={item.id || idx} className="dict-item-card">
                    <div className="dict-term-row">
                      <span className="dict-native">{vocabLang === 'quechua' ? item.qu : item.ay}</span>
                      <button 
                        className="btn-speaker" 
                        onClick={() => playPronunciation(vocabLang === 'quechua' ? item.qu : item.ay, vocabLang)}
                        title={activeSpeechText === (vocabLang === 'quechua' ? item.qu : item.ay) ? "Detener reproducción" : "Escuchar pronunciación"}
                        style={{
                          color: activeSpeechText === (vocabLang === 'quechua' ? item.qu : item.ay) ? 'var(--color-primary)' : 'var(--text-secondary)',
                          background: activeSpeechText === (vocabLang === 'quechua' ? item.qu : item.ay) ? 'var(--info-glow-bg)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-full)',
                          width: '28px',
                          height: '28px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {activeSpeechText === (vocabLang === 'quechua' ? item.qu : item.ay) ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />}
                      </button>
                    </div>
                    <div className="dict-spanish">{item.es}</div>
                    <div className="dict-context">{item.category} • {item.context || 'Uso común'}</div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <AlertCircle size={32} className="empty-state-icon" />
                  <p>No se encontraron términos en el diccionario para tu búsqueda.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-SECCIÓN: JUEGO DE TRIVIA */}
        {activeSubTab === 'quiz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Trophy size={20} style={{ color: 'var(--color-primary)' }} />
                Trivia de Lenguas Originarias
              </h3>
              {quizState === 'playing' && (
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Puntuación: {score} pts</span>
              )}
            </div>

            {/* ESTADO: BOTÓN DE INICIO */}
            {quizState === 'start' && (
              <div className="empty-state" style={{ minHeight: '300px' }}>
                <Trophy size={48} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>¡Demuestra tus conocimientos!</h3>
                <p style={{ maxWidth: '380px' }}>Pon a prueba tus habilidades de Quechua y Aymara con nuestro cuestionario interactivo de 5 preguntas.</p>
                <Button variant="primary" onClick={startNewQuiz} style={{ marginTop: '1rem', fontWeight: 600 }}>
                  Comenzar Trivia
                </Button>
              </div>
            )}

            {/* ESTADO: CARGANDO */}
            {loadingQuiz && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem 0' }}>
                <div className="skeleton" style={{ height: '30px', width: '60%' }}></div>
                <div className="skeleton" style={{ height: '10px', width: '100%' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '50px', width: '100%' }}></div>)}
                </div>
              </div>
            )}

            {/* ESTADO: JUGANDO */}
            {!loadingQuiz && quizState === 'playing' && currentQuestion && (
              <div className="quiz-card fadeIn">
                <div className="quiz-progress-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    <span>Pregunta {currentQuestionIndex + 1} de {quizQuestions.length}</span>
                    <span>Progreso: {Math.round(((currentQuestionIndex) / quizQuestions.length) * 100)}%</span>
                  </div>
                  <div className="quiz-progress-bar">
                    <div 
                      className="quiz-progress-fill" 
                      style={{ width: `${((currentQuestionIndex) / quizQuestions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="quiz-question">
                  {currentQuestion.question}
                </div>

                <div className="quiz-options">
                  {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const isCorrectOption = idx === currentQuestion.answerIndex;
                    
                    let optionClass = '';
                    if (isAnswered) {
                      if (isCorrectOption) optionClass = 'correct';
                      else if (isSelected) optionClass = 'incorrect';
                    }

                    return (
                      <button
                        key={idx}
                        className={`quiz-option-btn ${optionClass}`}
                        onClick={() => handleOptionClick(idx)}
                        disabled={isAnswered}
                      >
                        {idx + 1}. {option}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div className="fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className={`quiz-feedback ${selectedOptionIndex === currentQuestion.answerIndex ? 'success' : 'error'}`}>
                      <strong>
                        {selectedOptionIndex === currentQuestion.answerIndex 
                          ? '¡Correcto! Excelente deducción gramatical.' 
                          : `Incorrecto. La respuesta correcta era: "${currentQuestion.options[currentQuestion.answerIndex]}"`
                        }
                      </strong>
                      <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                        {currentQuestion.explanation}
                      </p>
                    </div>

                    <Button 
                      variant="primary"
                      onClick={handleNextQuestion}
                      style={{ width: 'fit-content', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {currentQuestionIndex < quizQuestions.length - 1 ? 'Siguiente Pregunta' : 'Ver Puntuación'}
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ESTADO: JUEGO TERMINADO */}
            {!loadingQuiz && quizState === 'finished' && (
              <div className="empty-state" style={{ minHeight: '300px' }}>
                <Trophy size={48} style={{ color: 'var(--color-primary)', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.3))' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>¡Felicitaciones, completaste el Cuestionario!</h3>
                <p>Lograste una puntuación final de <strong>{score} / 50 puntos</strong>.</p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <Button variant="primary" onClick={startNewQuiz}>
                    <RotateCcw size={16} />
                    Intentar de Nuevo
                  </Button>
                  <Button variant="secondary" onClick={() => setActiveSubTab('vocabulary')}>
                    Volver al Diccionario
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-SECCIÓN: SUGERENCIAS DE LA COMUNIDAD */}
        {activeSubTab === 'suggestions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Heart size={20} style={{ color: '#f43f5e', fill: '#f43f5e' }} />
                  Propuestas de la Comunidad
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Apoya las correcciones hechas por otros usuarios para ayudarnos a calibrar el traductor.
                </p>
              </div>
              <Button 
                variant="secondary" 
                onClick={fetchSuggestions} 
                style={{ padding: '0.4rem 0.6rem' }} 
                title="Actualizar lista"
                disabled={loadingSuggestions}
              >
                <RefreshCw size={14} className={loadingSuggestions ? 'spin-animation' : ''} />
              </Button>
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              paddingRight: '0.25rem'
            }}>
              {loadingSuggestions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '110px', width: '100%', borderRadius: 'var(--radius-md)' }}></div>)}
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((sug) => {
                  const username = sessionStorage.getItem('userName') || '';
                  const yaVoto = Array.isArray(sug.liked_by) && sug.liked_by.includes(username);
                  
                  return (
                    <div key={sug.id} style={{
                      background: 'var(--card-inner-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      textAlign: 'left',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>
                          Idioma: <strong>{sug.source_lang.toUpperCase()} ➔ {sug.target_lang.toUpperCase()}</strong>
                        </span>
                        <Badge variant={sug.rating >= 4 ? 'success' : 'warning'}>
                          ★ {sug.rating} estrellas
                        </Badge>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.5rem' }}>Texto original:</span>
                          "{sug.source_text}"
                        </div>
                        {sug.corrected_text ? (
                          <>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.5rem' }}>Traducción recibida:</span>
                              <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>"{sug.translated_text}"</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.5rem' }}>Corrección sugerida:</span>
                              <strong style={{ color: 'var(--color-accent)' }}>"{sug.corrected_text}"</strong>
                            </div>
                          </>
                        ) : (
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.5rem' }}>Traducción recibida (Correcta):</span>
                            <strong style={{ color: '#10b981' }}>"{sug.translated_text}"</strong>
                          </div>
                        )}
                      </div>

                      {sug.comments && (
                        <div style={{
                          fontSize: '0.8rem',
                          background: 'var(--card-inner-bg)',
                          borderLeft: '2px solid var(--border-color)',
                          padding: '0.35rem 0.6rem',
                          fontStyle: 'italic',
                          color: 'var(--text-secondary)'
                        }}>
                          "{sug.comments}"
                        </div>
                      )}

                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        paddingTop: '0.5rem', 
                        borderTop: '1px solid var(--border-color)' 
                      }}>
                        <button
                          onClick={() => handleToggleLike(sug.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: yaVoto ? '#f43f5e' : 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Heart size={16} fill={yaVoto ? '#f43f5e' : 'transparent'} />
                          <span>{sug.likes || 0} apoyos</span>
                        </button>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(sug.timestamp).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state" style={{ minHeight: '260px' }}>
                  <Heart size={40} style={{ opacity: 0.2, color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '0.85rem' }}>Aún no se han publicado sugerencias. ¡Apoya calificando traducciones con baja puntuación!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  </div>
  );
}
