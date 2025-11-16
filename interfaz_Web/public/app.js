/*
=================================================================
 ARCHIVO: app.js
 DESCRIPCIÓN: Lógica principal de la aplicación web del
 protocolo experimental TFG.
 AUTOR: [Dave Clausell]
 REPOSITORIO: https://github.com/DaveClausell-AAEE/Ataraxia
 LICENCIA: Publicado bajo licencia CC BY 4.0
=================================================================
*/

document.addEventListener('DOMContentLoaded', () => {

  // =================================================================
  // CONFIGURACIÓN DEL EXPERIMENTO
  // Variables globales que definen la duración de las fases.
  // =================================================================

  // IMPORTANTE: Reemplaza esto con el enlace a tu propio Google Form pre-llenado.
  const BIG_FIVE_URL_TEMPLATE = "https://docs.google.com/forms/d/e/XXXXXXXXXXXX/viewform?usp=pp_url&entry.123456=ID_A_REEMPLAZAR";
  const STROOP_DURATION_SECONDS = 60;
  const RELAXATION_DURATION_MINUTES = 5;

  // =================================================================
  // MANEJO DE ESTADO Y DATOS
  // Almacena las respuestas y el estado del participante en
  // sessionStorage para persistir entre recargas accidentales.
  // =================================================================

  const dataHandler = {
    set: function(target, property, value) {
      // Guarda automáticamente en sessionStorage cada vez que
      // se modifica el objeto 'userResponses'.
      target[property] = value;
      sessionStorage.setItem('tfg_data', JSON.stringify(target));
      return true;
    }
  };

  // Carga los datos iniciales desde sessionStorage si existen,
  // o crea un objeto vacío.
  let initialData = JSON.parse(sessionStorage.getItem('tfg_data')) || {
      volume: 0.5,
      assignedGroup: 'Control' // Grupo por defecto
  };
  let userResponses = new Proxy(initialData, dataHandler);

  // Variable para rastrear la fase actual de medición (para el sensor)
  let currentMeasurementPhase = 'baseline';

  // Variables de estado para las tareas
  let stroopState = {
    phase: null, trials: [], currentIndex: 0, trialStartTime: null,
    errorCount: 0, results: [], timerId: null, timeLeft: STROOP_DURATION_SECONDS,
    isPractice: false
  };

  let tmtState = {
    part: null,
    // ... (Puedes expandir esto si usas TMT)
  };

  // =================================================================
  // LÓGICA DE NAVEGACIÓN ENTRE PANTALLAS
  // =================================================================

  // (El código para 'showScreen' y 'sendEvent' se asumiría aquí o
  // se manejaría con la lógica de ocultar/mostrar divs)

  function showScreen(screenId) {
    // Oculta todas las pantallas
    document.querySelectorAll('#main-container > div').forEach(screen => {
      screen.classList.add('hidden');
    });
    // Muestra solo la pantalla deseada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
    }
  }

  // (Función 'sendEvent' de ejemplo, si estuvieras enviando
  // datos a un servidor o a un dispositivo)
  function sendEvent(eventName, details = {}) {
    console.log(`EVENTO: ${eventName}`, details);
    // Aquí iría la lógica para enviar datos al sensor/servidor, ej:
    // window.electronAPI.send('evento-a-main', { name: eventName, details });
  }

  // =================================================================
  // PANTALLA: BIENVENIDA (welcome-screen)
  // =================================================================

  const participantIdInput = document.getElementById('participant-id');
  const assignedGroupSelect = document.getElementById('assigned-group');
  const startExperimentButton = document.getElementById('start-experiment-button');
  const screeningCheckboxes = document.querySelectorAll('.screening-questions input[type="checkbox"]');

  // Lógica de validación de checkboxes (SI/NO)
  screeningCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const groupName = e.target.name;
      if (e.target.checked) {
        // Desmarca el otro checkbox del mismo grupo
        document.querySelectorAll(`input[name="${groupName}"]`).forEach(otherCb => {
          if (otherCb !== e.target) otherCb.checked = false;
        });
      }
    });
  });

  startExperimentButton.addEventListener('click', () => {
    const id = participantIdInput.value.trim();
    // Validación de campos
    if (id === "") {
      alert("Por favor, ingresá un ID de participante.");
      return;
    }
    // (Aquí iría la validación de los checkboxes de screening)

    // Guardar datos iniciales
    userResponses.participantId = id;
    userResponses.assignedGroup = assignedGroupSelect.value;

    // Redirigir al formulario Big Five
    const formUrl = BIG_FIVE_URL_TEMPLATE.replace("ID_A_REEMPLAZAR", id);
    window.open(formUrl, '_blank'); // Abre en una nueva pestaña

    // Avanzar a la siguiente pantalla
    showScreen('baseline-screen');
    sendEvent('INICIO_BASELINE');
  });


  // =================================================================
  // PANTALLA: MEDICIÓN LÍNEA BASE (baseline-screen)
  // =================================================================
  const baselineTitle = document.getElementById('baseline-title');
  // (Esta pantalla se reutiliza para 'baseline' y 'final')

  // =================================================================
  // PANTALLA: TAREA STROOP (stroop-task-screen)
  // =================================================================
  // (Aquí iría toda la lógica de la tarea Stroop:
  // startStroopPractice, startStroopTest, handleStroopResponse, etc.)

  // Ejemplo de cómo podría empezar la relajación al terminar Stroop
  function endStroopTest() {
    sendEvent('FIN_STROOP_TEST');
    // ... guardar resultados de stroopState ...

    // Iniciar fase de relajación
    startRelaxationPhase();
  }

  // =================================================================
  // PANTALLA: FASE DE RELAJACIÓN (relaxation-phase-screen)
  // =================================================================
  const relaxationAudio = document.getElementById('relaxation-audio');
  const startRelaxationButton = document.getElementById('start-relaxation-button'); // Asumiendo que tienes este botón

  // Evento que inicia la relajación
  startRelaxationButton.addEventListener('click', () => {
    showScreen('relaxation-phase-screen');
    sendEvent('INICIO_RELAJACION', { grupo: userResponses.assignedGroup });

    // Configurar audio y/o aroma según el grupo
    if (userResponses.assignedGroup === 'Musica') {
      relaxationAudio.src = '/audio/musica_relax.mp3'; // Ruta de ejemplo
      relaxationAudio.play();
    } else if (userResponses.assignedGroup === 'Aroma') {
      sendEvent('ACTIVAR_AROMA'); // Evento para el difusor
    } else if (userResponses.assignedGroup === 'MusicaAroma') {
      relaxationAudio.src = '/audio/musica_relax.mp3';
      relaxationAudio.play();
      sendEvent('ACTIVAR_AROMA');
    }
    // El grupo 'Control' no hace nada.

    // Timer para la fase de relajación
    let relaxationTimeLeft = RELAXATION_DURATION_MINUTES * 60;
    const timerInterval = setInterval(() => {
      // (Opcional: mostrar timer en UI)
      // const minutes = Math.floor(relaxationTimeLeft / 60);
      // const seconds = relaxationTimeLeft % 60;

      if (relaxationTimeLeft < 0) {
        clearInterval(timerInterval);
        endRelaxationPhase();
      }
      relaxationTimeLeft--;
    }, 1000);
  });

  function endRelaxationPhase() {
    // Detener estímulos
    relaxationAudio.pause();
    relaxationAudio.currentTime = 0;
    sendEvent('DESACTIVAR_AROMA'); // Asegurarse de apagarlo
    sendEvent('FIN_RELAJACION');

    // Cambiar a la medición final (reutilizando la pantalla de baseline)
    baselineTitle.textContent = "Evaluación Final";
    currentMeasurementPhase = 'final';
    showScreen('baseline-screen');
    sendEvent('INICIO_FINAL_MEASUREMENT');

    // (Aquí faltaría la lógica para terminar la "Evaluación Final"
    // y mostrar la pantalla 'final-screen')
  }

  // =================================================================
  // PANTALLA: FINAL Y BIOFEEDBACK (final-screen y biofeedback-display-screen)
  // =================================================================
  const showGraphButton = document.getElementById('show-graph-button');
  const endSessionButton = document.getElementById('end-session-button');

  showGraphButton.addEventListener('click', () => {
    // Se asume que un script/proceso externo (en el servidor o app
    // de escritorio) ha generado un gráfico PNG usando el ID.
    const imageUrl = `/feedback_images/${userResponses.participantId}_grafico.png`;
    const imgElement = document.getElementById('feedback-graph-image');
    const loadingMessage = document.getElementById('graph-loading-message');

    imgElement.src = imageUrl;
    imgElement.style.display = 'none'; // Ocultar hasta que cargue
    loadingMessage.style.display = 'block'; // Mostrar 'cargando'

    // Manejo de carga exitosa
    imgElement.onload = () => {
        loadingMessage.style.display = 'none';
        imgElement.style.display = 'block';
    };
    
    // Manejo de error (si no se encuentra el gráfico)
    imgElement.onerror = () => {
        loadingMessage.textContent = "Hubo un error al generar o cargar el gráfico. Avisá al experimentador.";
    };

    showScreen('biofeedback-display-screen');
    sendEvent('INICIO_BIOFEEDBACK');
  });

  endSessionButton.addEventListener('click', () => {
    showScreen('goodbye-screen');
    sendEvent('FIN_SESION');
    sessionStorage.removeItem('tfg_data'); // Limpiar sesión
  });


  // =================================================================
  // INICIO DE LA APLICACIÓN
  // =================================================================

  // Al cargar, decide qué pantalla mostrar.
  // Si hay datos en sessionStorage, podría ir a la última pantalla
  // (lógica de recuperación no implementada).
  // Por ahora, siempre empieza en 'welcome-screen'.
  showScreen('welcome-screen');

}); // Fin de DOMContentLoaded
