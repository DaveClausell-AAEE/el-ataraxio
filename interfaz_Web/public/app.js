document.addEventListener('DOMContentLoaded', () => {

  // =================================================================
  // CONFIGURACIÓN DEL EXPERIMENTO
  // =================================================================
  const BIG_FIVE_URL_TEMPLATE = "https://docs.google.com/forms/d/e/1FAIpQLSc0H2d-J869fIpIKPRzOKgrj3QDbtbi9nnWStT36d5HLdJcsQ/viewform?usp=pp_url&entry.1885163690=ID_A_REEMPLAZAR";
  const STROOP_DURATION_SECONDS = 60;
  const RELAXATION_DURATION_MINUTES = 5;

  // --- VARIABLES DE ESTADO Y DATOS (CON SESSIONSTORAGE) ---
  const dataHandler = {
    set: function(target, property, value) {
      target[property] = value;
      sessionStorage.setItem('tfg_data', JSON.stringify(target));
      return true;
    }
  };
  let initialData = JSON.parse(sessionStorage.getItem('tfg_data')) || {
      volume: 0.5,
      assignedGroup: 'Control'
  };
  let userResponses = new Proxy(initialData, dataHandler);
  
  let currentMeasurementPhase = 'baseline';
  let stroopState = {
    phase: null, trials: [], currentIndex: 0, trialStartTime: null,
    errorCount: 0, results: [], timerId: null, timeLeft: STROOP_DURATION_SECONDS,
    isPractice: false
  };
  let tmtState = {
    part: null, sequence: [], points: [], isPractice: false,
    nextTargetIndex: 0, path: [], startTime: null, errorCount: 0
  };
  const relaxationTracks = ['Relax1.mp3', 'Relax2.mp3', 'Relax3.mp3', 'Relax4.mp3'];
  
  const screeningCheckboxes = document.querySelectorAll('.screening-questions input[type="checkbox"]');
  const ineligibleMessage = document.getElementById('ineligible-message');

  // =================================================================
  // LÓGICA WEBSOCKET (MOVIDA AL PRINCIPIO PARA EVITAR ERRORES)
  // =================================================================
  const ws = new WebSocket(`ws://${window.location.host}`);
  
  function sendEvent(eventName, data = {}) { 
    if (ws.readyState === WebSocket.OPEN) { 
      ws.send(JSON.stringify({ event: eventName, timestamp: Date.now(), data: data })); 
    } else { 
      console.warn('WebSocket no está abierto...'); 
    } 
  }
  
  ws.onopen = () => { console.log('Conectado al servidor WebSocket!'); };
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data.toString());
    console.log(`Mensaje recibido del servidor:`, message);

    if (message.event === 'GROUP_ASSIGNED') {
      userResponses.assignedGroup = message.group;
      
      sendEvent('ID_CREADO', { participantId: userResponses.participantId, group: userResponses.assignedGroup });
    }
  };
  ws.onerror = (error) => { console.error('Error de WebSocket:', error); };

  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  const screens = {
    'welcome-screen': document.getElementById('welcome-screen'), 'id-screen': document.getElementById('id-screen'),
    'demographics-screen': document.getElementById('demographics-screen'),
    'big-five-screen': document.getElementById('big-five-screen'),
    'setup-screen': document.getElementById('setup-screen'), 'baseline-screen': document.getElementById('baseline-screen'),
    'stroop-practice-instructions': document.getElementById('stroop-practice-instructions'),
    'stroop-practice-end-screen': document.getElementById('stroop-practice-end-screen'),
    'stroop-task-screen': document.getElementById('stroop-task-screen'),
    'tmt-practice-instructions': document.getElementById('tmt-practice-instructions'),
    'tmt-practice-end-screen': document.getElementById('tmt-practice-end-screen'),
    'tmt-task-screen': document.getElementById('tmt-task-screen'),
    'relaxation-instructions-screen': document.getElementById('relaxation-instructions-screen'),
    'relaxation-phase-screen': document.getElementById('relaxation-phase-screen'),
    'final-screen': document.getElementById('final-screen'),
    'biofeedback-display-screen': document.getElementById('biofeedback-display-screen'),
    'goodbye-screen': document.getElementById('goodbye-screen')
  };

  const consentCheckbox = document.getElementById('consent-checkbox'), startButton = document.getElementById('start-button'), idInput = document.getElementById('id-input'), idNextButton = document.getElementById('id-next-button');
  const ageInput = document.getElementById('age-input'), genderSelect = document.getElementById('gender-select'), majorInput = document.getElementById('major-input'), demographicsNextButton = document.getElementById('demographics-next-button');
  const openBigFiveButton = document.getElementById('open-big-five-button'), bigFiveNextButton = document.getElementById('big-five-next-button');
  const playTestAudioButton = document.getElementById('play-test-audio-button'), testAudio = document.getElementById('test-audio'), volumeSlider = document.getElementById('volume-slider'), setupNextButton = document.getElementById('setup-next-button'), baselineNextButton = document.getElementById('baseline-next-button');
  const stroopPracticeStartButton = document.getElementById('stroop-practice-start-button'), stroopRealTestStartButton = document.getElementById('stroop-real-test-start-button');
  const tmtPracticeStartButton = document.getElementById('tmt-practice-start-button'), tmtRealTestStartButton = document.getElementById('tmt-real-test-start-button');
  const startRelaxationButton = document.getElementById('start-relaxation-button'), showGraphButton = document.getElementById('show-graph-button'), endSessionButton = document.getElementById('end-session-button');
  const stroopProgress = document.getElementById('stroop-progress'), stroopTimer = document.getElementById('stroop-timer'), stroopStimulus = document.getElementById('stroop-stimulus'), stroopTextButtons = document.getElementById('stroop-text-buttons'), stroopColorButtons = document.getElementById('stroop-color-buttons');
  const stroopPracticeInstructionText = document.getElementById('stroop-practice-instruction-text'), stroopRealInstructionText = document.getElementById('stroop-real-instruction-text');
  const tmtCanvas = document.getElementById('tmt-canvas'), tmtCirclesContainer = document.getElementById('tmt-circles-container'), tmtCanvasCtx = tmtCanvas.getContext('2d');
  const tmtPracticeInstructionText = document.getElementById('tmt-practice-instruction-text');
  const baselineTitle = document.getElementById('baseline-title');
  const relaxationInstructionsText = document.getElementById('relaxation-instructions-text');
  const relaxationTimer = document.getElementById('relaxation-timer');
  const relaxationAudio = document.getElementById('relaxation-audio');
  
  testAudio.volume = userResponses.volume;
  volumeSlider.value = userResponses.volume;

  // --- LÓGICA DE FECHA DINÁMICA ---
  const today = new Date();
  const dateText = today.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateIdFormat = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;
  document.getElementById('example-date').textContent = dateText;
  document.getElementById('example-id-date').textContent = dateIdFormat;


  function showScreen(screenId) {
    Object.values(screens).forEach(screen => { if(screen) screen.classList.add('hidden'); });
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) screenToShow.classList.remove('hidden');
  }

  // --- LÓGICA DE ATAJOS Y NAVEGACIÓN INICIAL ---
  const urlParams = new URLSearchParams(window.location.search);
  const startScreen = urlParams.get('start_at');
  if (startScreen && screens[startScreen]) {
      console.warn(`MODO DEBUG: Saltando a ${startScreen}`);
      showScreen(startScreen);
  } else {
      showScreen('welcome-screen');
  }
  
  // --- LÓGICA DE NAVEGACIÓN ---
  function checkWelcomeScreenCompletion() {
  const consentChecked = consentCheckbox.checked;

  const visualAnswered = document.querySelector('input[name="visual"]:checked');
  const audioAnswered = document.querySelector('input[name="audio"]:checked');
  const olfactoryAnswered = document.querySelector('input[name="olfactory"]:checked');

  ineligibleMessage.classList.add('hidden');

  startButton.disabled = !(consentChecked && visualAnswered && audioAnswered && olfactoryAnswered);
}

document.querySelectorAll('#welcome-screen input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const groupName = e.target.name;
        if (groupName) {
            document.querySelectorAll(`input[name="${groupName}"]`).forEach(cb => {
                if (cb !== e.target) {
                    cb.checked = false;
                }
            });
        }
        checkWelcomeScreenCompletion();
    });
});
  startButton.addEventListener('click', () => {
  userResponses.dificultadVisual = document.querySelector('input[name="visual"]:checked').value;
  userResponses.dificultadAuditiva = document.querySelector('input[name="audio"]:checked').value;
  userResponses.dificultadOlfativa = document.querySelector('input[name="olfactory"]:checked').value;

  showScreen('id-screen'); 
  sendEvent('CONSENTIMIENTO_ACEPTADO'); 
});
  idInput.addEventListener('input', () => { idNextButton.disabled = idInput.value.trim() === ''; });
  idNextButton.addEventListener('click', () => {
    userResponses.participantId = idInput.value.trim();
    showScreen('demographics-screen');
  });

  function checkDemographicsCompletion() { demographicsNextButton.disabled = !(ageInput.value && genderSelect.value && majorInput.value.trim()); }
  ageInput.addEventListener('input', checkDemographicsCompletion);
  genderSelect.addEventListener('change', checkDemographicsCompletion);
  majorInput.addEventListener('input', checkDemographicsCompletion);

  demographicsNextButton.addEventListener('click', () => {
    userResponses.age = ageInput.value;
    userResponses.gender = genderSelect.value;
    userResponses.major = majorInput.value.trim();
    sendEvent('FIN_DATOS_DEMOGRAFICOS', { demographics: { age: userResponses.age, gender: userResponses.gender, major: userResponses.major } });
    showScreen('big-five-screen');
  });
  
  openBigFiveButton.addEventListener('click', () => {
    if (BIG_FIVE_URL_TEMPLATE.includes("Poner_Aqui")) {
        alert("Error: El experimentador debe configurar la URL del cuestionario Big Five."); return;
    }
    const finalUrl = BIG_FIVE_URL_TEMPLATE.replace("ID_A_REEMPLAZAR", userResponses.participantId);
    window.open(finalUrl, '_blank');
  });

  bigFiveNextButton.addEventListener('click', () => {
    sendEvent('REQUEST_GROUP_ASSIGNMENT', { participantId: userResponses.participantId });
    showScreen('setup-screen');
  });

  playTestAudioButton.addEventListener('click', () => { testAudio.play(); });
  volumeSlider.addEventListener('input', () => {
    const newVolume = volumeSlider.value;
    testAudio.volume = newVolume;
    userResponses.volume = newVolume;
  });
  setupNextButton.addEventListener('click', () => {
    testAudio.pause(); testAudio.currentTime = 0;
    sendEvent('VOLUMEN_SELECCIONADO', { volume: userResponses.volume });
    baselineTitle.textContent = "Evaluación Inicial";
    currentMeasurementPhase = 'baseline';
    showScreen('baseline-screen');
    sendEvent('INICIO_BASELINE');
  });

  document.querySelectorAll('.sam-scale').forEach(scale => {
    scale.addEventListener('click', (event) => {
      if (event.target.classList.contains('sam-option')) {
        scale.querySelectorAll('.sam-option').forEach(opt => opt.classList.remove('selected'));
        event.target.classList.add('selected');
        const allScales = Array.from(document.querySelectorAll('#baseline-screen .sam-scale'));
        const allSelected = allScales.every(s => s.querySelector('.selected'));
        if (allSelected) {
          baselineNextButton.disabled = false;
        }
      }
    });
  });

  baselineNextButton.addEventListener('click', () => {
    const prefix = currentMeasurementPhase;
    
    userResponses[`${prefix}_valence`] = document.querySelector('#scale-valence .selected').dataset.value;
    userResponses[`${prefix}_arousal`] = document.querySelector('#scale-arousal .selected').dataset.value;
    userResponses[`${prefix}_control`] = document.querySelector('#scale-control .selected').dataset.value;

    sendEvent(`FIN_${prefix.toUpperCase()}`, { 
        responses: { 
            valence: userResponses[`${prefix}_valence`], 
            arousal: userResponses[`${prefix}_arousal`], 
            control: userResponses[`${prefix}_control`]
        } 
    });
    
    document.querySelectorAll('.sam-option.selected').forEach(opt => opt.classList.remove('selected'));
    baselineNextButton.disabled = true;

    if (prefix === 'baseline') {
      stroopState.phase = 'P';
      stroopPracticeInstructionText.textContent = "Tu tarea es leer la palabra y hacer clic en el botón correspondiente lo más rápido que puedas.";
      showScreen('stroop-practice-instructions');
    } else if (prefix === 'poststress') {
      startRelaxationPhase();
    } else if (prefix === 'final') {
      sendEvent('FIN_EXPERIMENTO', { all_data: userResponses });
      showScreen('final-screen');
    }
  });
  
  // --- LÓGICA STROOP ---
  const colors = ['rojo', 'verde', 'azul'];
  const cssColors = {rojo: 'red', verde: 'green', azul: 'blue'};

  // =================================================================
  // FUNCIÓN CORREGIDA PARA GENERAR PRUEBAS STROOP SIN REPETICIONES
  // =================================================================
  function generateNonRepeatingStroopTrials(phase, count, colorOptions, cssColorMap) {
      const trials = [];
      // Esta variable ahora SIEMPRE guardará el nombre del color en español (ej: 'rojo')
      let lastColorWord = null;

      for (let i = 0; i < count; i++) {
          // Filtramos la lista de palabras de colores excluyendo la última usada.
          let availableColorWords = colorOptions.filter(c => c !== lastColorWord);
          if (availableColorWords.length === 0) {
              availableColorWords = colorOptions;
          }
          
          // Elegimos la nueva palabra de color de la lista filtrada.
          let newColorWord = availableColorWords[Math.floor(Math.random() * availableColorWords.length)];
          let trial;

          if (phase === 'P') {
              // La respuesta correcta es la palabra en español.
              trial = { text: newColorWord.toUpperCase(), correct: newColorWord };
          } else if (phase === 'C') {
              // La respuesta correcta es el color CSS.
              trial = { text: 'XXXXX', color: cssColorMap[newColorWord], correct: cssColorMap[newColorWord] };
          } else if (phase === 'PC') {
              // La respuesta correcta es el color CSS.
              // El texto debe ser incongruente con el color.
              let availableWords = colorOptions.filter(c => c !== newColorWord);
              let word = availableWords[Math.floor(Math.random() * availableWords.length)];
              trial = { text: word.toUpperCase(), color: cssColorMap[newColorWord], correct: cssColorMap[newColorWord] };
          }

          trials.push(trial);
          // Actualizamos la última palabra de color usada para la siguiente iteración.
          lastColorWord = newColorWord;
      }
      return trials;
  }


  const stroopTrialsDef = {
    P: { 
      practice: [ { text: 'AZUL', correct: 'azul' }, { text: 'ROJO', correct: 'rojo' } ], 
      real: generateNonRepeatingStroopTrials('P', 100, colors, cssColors)
    },
    C: { 
      practice: [ { text: 'XXXXX', color: 'green', correct: 'green' }, { text: 'XXXXX', color: 'blue', correct: 'blue' } ], 
      real: generateNonRepeatingStroopTrials('C', 100, colors, cssColors) 
    },
    PC: { 
      practice: [ { text: 'VERDE', color: 'red', correct: 'red' }, { text: 'ROJO', color: 'blue', correct: 'blue' } ], 
      real: generateNonRepeatingStroopTrials('PC', 100, colors, cssColors)
    }
  };

  stroopPracticeStartButton.addEventListener('click', () => { startStroopPractice(stroopState.phase); });
  stroopRealTestStartButton.addEventListener('click', () => { startStroopPhase(stroopState.phase); });
  function startStroopPractice(phase) { sendEvent(`INICIO_STROOP_PRACTICA_${phase}`); stroopState.isPractice = true; stroopState.trials = stroopTrialsDef[phase].practice; stroopState.currentIndex = 0; if (phase === 'P') { stroopTextButtons.classList.remove('hidden'); stroopColorButtons.classList.add('hidden'); } else { stroopTextButtons.classList.add('hidden'); stroopColorButtons.classList.remove('hidden'); } showScreen('stroop-task-screen'); runNextStroopTrial(); }
  function startStroopPhase(phase) { sendEvent(`INICIO_STROOP_REAL_${phase}`); stroopState.isPractice = false; stroopState.trials = stroopTrialsDef[phase].real; stroopState.currentIndex = 0; stroopState.results = []; stroopState.timeLeft = STROOP_DURATION_SECONDS; if (phase === 'P') { stroopTextButtons.classList.remove('hidden'); stroopColorButtons.classList.add('hidden'); } else { stroopTextButtons.classList.add('hidden'); stroopColorButtons.classList.remove('hidden'); } stroopTimer.textContent = `Tiempo: ${stroopState.timeLeft}`; stroopState.timerId = setInterval(() => { stroopState.timeLeft--; stroopTimer.textContent = `Tiempo: ${stroopState.timeLeft}`; if (stroopState.timeLeft <= 0) { endStroopPhase(); } }, 1000); showScreen('stroop-task-screen'); runNextStroopTrial(); }
  
  function runNextStroopTrial() {
    if (stroopState.currentIndex >= stroopState.trials.length) {
      if (stroopState.isPractice) { endStroopPractice(); } else { endStroopPhase(); }
      return;
    }
    const trial = stroopState.trials[stroopState.currentIndex];
    stroopState.errorCount = 0;
    if (stroopState.isPractice) {
      stroopProgress.textContent = `Práctica ${stroopState.currentIndex + 1} de ${stroopState.trials.length}`;
      stroopTimer.textContent = 'Sin tiempo';
    } else {
      stroopProgress.textContent = `Prueba ${stroopState.currentIndex + 1} de 100`;
      stroopTimer.textContent = `Tiempo: ${stroopState.timeLeft}`;
    }
    stroopStimulus.textContent = trial.text;
    if (stroopState.phase === 'P') { stroopStimulus.style.color = 'black'; }
    else { stroopStimulus.style.color = trial.color; }
    stroopState.trialStartTime = Date.now();
  }

  function recordStroopResponse(response) { if (!stroopState.isPractice && stroopState.timeLeft <= 0) return; const currentTrial = stroopState.trials[stroopState.currentIndex]; const isCorrect = response === currentTrial.correct; if (isCorrect) { if (!stroopState.isPractice) { const responseTime = Date.now() - stroopState.trialStartTime; stroopState.results.push({ trial: stroopState.currentIndex + 1, errorCount: stroopState.errorCount, timeToCorrect: responseTime }); } stroopState.currentIndex++; runNextStroopTrial(); } else { stroopState.errorCount++; stroopStimulus.classList.add('shake-error'); setTimeout(() => { stroopStimulus.classList.remove('shake-error'); }, 500); } }
  
  stroopTextButtons.addEventListener('click', (event) => { if (event.target.classList.contains('text-button')) { recordStroopResponse(event.target.dataset.word); } });
  stroopColorButtons.addEventListener('click', (event) => { if (event.target.classList.contains('color-button')) { recordStroopResponse(event.target.dataset.color); } });

  function endStroopPractice() { sendEvent(`FIN_STROOP_PRACTICA_${stroopState.phase}`); if(stroopState.phase === 'P'){ stroopRealInstructionText.textContent = `Recordá: leé la palabra e indicá cuál es lo más rápido que puedas. La prueba dura ${STROOP_DURATION_SECONDS} segundos.`; } else if (stroopState.phase === 'C') { stroopRealInstructionText.textContent = `Recordá: indicá el color de las 'X' lo más rápido que puedas. La prueba dura ${STROOP_DURATION_SECONDS} segundos.`; } else if (stroopState.phase === 'PC') { stroopRealInstructionText.textContent = `Recordá: indicá el COLOR DE LA PALABRA lo más rápido que puedas. La prueba dura ${STROOP_DURATION_SECONDS} segundos.`; } showScreen('stroop-practice-end-screen'); }
  function endStroopPhase() {
    clearInterval(stroopState.timerId);
    sendEvent(`FIN_STROOP_REAL_${stroopState.phase}`, { results: stroopState.results });
    userResponses[`stroop_${stroopState.phase}_results`] = stroopState.results;

    if (stroopState.phase === 'P') {
      stroopState.phase = 'C';
      stroopPracticeInstructionText.innerHTML = "Ahora, en lugar de palabras, verás una serie de 'XXXXX' pintadas de un color. Tu tarea es identificar ees color y hacer clic en el <strong>botón de color</strong> correspondiente lo más rápido que puedas.<br><br><i>Por ejemplo, si ves <strong>XXXXX</strong> (en color azul), hacé clic en el <strong>cuadrado azul</strong>.</i>";
      showScreen('stroop-practice-instructions');
    } else if (stroopState.phase === 'C') {
      stroopState.phase = 'PC';
      stroopPracticeInstructionText.innerHTML = "Esta es la tercera etapa del test. Verás una palabra indicando un color, pero estará pintada de <strong>OTRO</strong> color. Tu tarea es ignorar la palabra escrita y hacer clic en el botón que corresponda al <strong>COLOR</strong> lo más rápido que puedas.<br><br><i>Por ejemplo, si ves la palabra <strong>ROJO</strong> (escrita en azul), tenés que hacer clic en el <strong>cuadrado azul</strong>.</i>";
      showScreen('stroop-practice-instructions');
    } else if (stroopState.phase === 'PC') {
      sendEvent('FIN_STROOP_COMPLETO');
      tmtState.part = 'A';
      tmtPracticeInstructionText.innerHTML = "En la pantalla aparecerán 8 círculos con números. Tu tarea es hacer clic en ellos siguiendo el <strong>orden numérico correcto</strong>, desde el 1 hasta el 8. Deberás realizar la prueba lo más rápido que puedas,";
      showScreen('tmt-practice-instructions');
    }
  }

  // --- LÓGICA TMT ---
  const TMT_B_PRACTICE_SEQUENCE = ["1", "A", "2", "B", "3", "C", "4", "D"];
  const TMT_B_SEQUENCE = ["1", "A", "2", "B", "3", "C", "4", "D", "5", "E", "6", "F", "7", "G", "8", "H", "9", "I", "10", "J", "11", "K", "12", "L", "13"];
  const CIRCLE_DIAMETER = 44;
  tmtPracticeStartButton.addEventListener('click', () => { startTmtPractice(tmtState.part); });
  tmtRealTestStartButton.addEventListener('click', () => { startTmtPart(tmtState.part); });
  function startTmtPractice(part) { sendEvent(`INICIO_TMT_PRACTICA_${part}`); tmtState.isPractice = true; if (part === 'A') { tmtState.sequence = Array.from({length: 8}, (_, i) => String(i + 1)); } else if (part === 'B') { tmtState.sequence = TMT_B_PRACTICE_SEQUENCE; } setupTmtScreen(); }
  function startTmtPart(part) { sendEvent(`INICIO_TMT_REAL_${part}`); tmtState.isPractice = false; if (part === 'A') { tmtState.sequence = Array.from({length: 25}, (_, i) => String(i + 1)); } else if (part === 'B') { tmtState.sequence = TMT_B_SEQUENCE; } setupTmtScreen(); }
  function setupTmtScreen(){ tmtState.nextTargetIndex = 0; tmtState.path = []; tmtState.errorCount = 0; showScreen('tmt-task-screen'); tmtCirclesContainer.innerHTML = ''; tmtCanvas.width = tmtCirclesContainer.clientWidth; tmtCanvas.height = tmtCirclesContainer.clientHeight; tmtCanvasCtx.clearRect(0, 0, tmtCanvas.width, tmtCanvas.height); generateAndPlaceCircles(tmtState.sequence); if(!tmtState.isPractice){ tmtState.startTime = Date.now(); } }
  function generateAndPlaceCircles(values) { const points = []; const containerWidth = tmtCirclesContainer.clientWidth; const containerHeight = tmtCirclesContainer.clientHeight; const margin = CIRCLE_DIAMETER / 2; values.forEach(value => { let point; let overlaps; let attempts = 0; do { overlaps = false; point = { x: Math.random() * (containerWidth - CIRCLE_DIAMETER), y: Math.random() * (containerHeight - CIRCLE_DIAMETER - 20), value: value }; for (const p of points) { const distance = Math.hypot((p.x - point.x), (p.y - point.y)); if (distance < CIRCLE_DIAMETER * 1.5) { overlaps = true; break; } } attempts++; } while (overlaps && attempts < 200); points.push(point); }); tmtState.points = points; points.forEach(p => { const wrapper = document.createElement('div'); wrapper.className = 'tmt-item-wrapper'; wrapper.style.left = `${p.x}px`; wrapper.style.top = `${p.y}px`; const circleDiv = document.createElement('div'); circleDiv.className = 'tmt-circle'; circleDiv.textContent = p.value; circleDiv.dataset.value = p.value; wrapper.appendChild(circleDiv); if (p.value === tmtState.sequence[0]) { const label = document.createElement('span'); label.className = 'tmt-label'; label.textContent = 'inicio'; wrapper.appendChild(label); } else if (p.value === tmtState.sequence[tmtState.sequence.length - 1]) { const label = document.createElement('span'); label.className = 'tmt-label'; label.textContent = 'fin'; wrapper.appendChild(label); } tmtCirclesContainer.appendChild(wrapper); }); }
  tmtCirclesContainer.addEventListener('click', (event) => { const circle = event.target.closest('.tmt-circle'); if (!circle || circle.classList.contains('completed')) return; const clickedValue = circle.dataset.value; const expectedValue = tmtState.sequence[tmtState.nextTargetIndex]; if (clickedValue === expectedValue) { circle.classList.add('completed'); const point = tmtState.points.find(p => p.value === clickedValue); if (tmtState.path.length > 0) { const lastPoint = tmtState.path[tmtState.path.length - 1]; drawTmtLine(lastPoint.x, lastPoint.y, point.x, point.y); } tmtState.path.push(point); tmtState.nextTargetIndex++; if (tmtState.nextTargetIndex >= tmtState.sequence.length) { if (tmtState.isPractice) { endTmtPractice(); } else { endTmtPart(); } } } else { tmtState.errorCount++; circle.classList.add('error'); setTimeout(() => { circle.classList.remove('error'); }, 500); } });
  function drawTmtLine(fromX, fromY, toX, toY) { tmtCanvasCtx.beginPath(); tmtCanvasCtx.moveTo(fromX + CIRCLE_DIAMETER / 2, fromY + CIRCLE_DIAMETER / 2); tmtCanvasCtx.lineTo(toX + CIRCLE_DIAMETER / 2, toY + CIRCLE_DIAMETER / 2); tmtCanvasCtx.strokeStyle = 'black'; tmtCanvasCtx.lineWidth = 2; tmtCanvasCtx.stroke(); }
  function endTmtPractice() { sendEvent(`FIN_TMT_PRACTICA_${tmtState.part}`); showScreen('tmt-practice-end-screen'); }
  function endTmtPart() { const totalTime = Date.now() - tmtState.startTime; const results = { part: tmtState.part, time_ms: totalTime, errors: tmtState.errorCount }; sendEvent(`FIN_TMT_REAL_${tmtState.part}`, { results }); userResponses[`tmt_${tmtState.part}_results`] = results; if (tmtState.part === 'A') { tmtState.part = 'B'; tmtPracticeInstructionText.innerHTML = "Ahora practicarás la segunda parte. Deberás hacer clic en los círculos <strong>alternando entre números y letras</strong>, siempre en orden ascendente.<br><br><i>La secuencia correcta es: <strong>1 → A → 2 → B → 3 → C</strong> y así sucesivamente.</i>"; showScreen('tmt-practice-instructions'); } else if (tmtState.part === 'B') { baselineTitle.textContent = "Evaluación Post-tests"; currentMeasurementPhase = 'poststress'; showScreen('baseline-screen'); sendEvent('INICIO_POST_STRESS_MEASUREMENT'); } }
  
  // --- LÓGICA RELAJACIÓN ---
  function startRelaxationPhase() {
    sendEvent('INICIO_RELAJACION');
    let instructions = "";
    document.getElementById('relaxation-duration-text').textContent = RELAXATION_DURATION_MINUTES;
    switch (userResponses.assignedGroup) {
      case 'Solo Musica': instructions = "Por favor, colocate los auriculares y escuchá la siguiente pieza musical y relajate, cuando la etapa de ralajación termine cambiará la pantalla automáticamente."; break;
      case 'Solo Aroma': instructions = "A continuación, el experimentador te entregará una tira olfativa. Por favor, hueléla cuando gustes y relajate, cuando la etapa de ralajación termine cambiará la pantalla automáticamente."; break;
      case 'Musica y Aroma': instructions = "A continuación, el experimentador te entregará una tira olfativa. Colocate los auriculares y escuchá la pieza musical mientras oles la fragancia, cuando esta etapa termine cambiará la pantalla automáticamente."; break;
    }
    relaxationInstructionsText.textContent = instructions;
    showScreen('relaxation-instructions-screen');
  }
  startRelaxationButton.addEventListener('click', () => {
    showScreen('relaxation-phase-screen');
    if (userResponses.assignedGroup === 'Solo Musica' || userResponses.assignedGroup === 'Musica y Aroma') {
      const randomTrack = relaxationTracks[Math.floor(Math.random() * relaxationTracks.length)];
      relaxationAudio.src = `/musicas/${randomTrack}`;
      relaxationAudio.volume = userResponses.volume;
      relaxationAudio.play();
      console.log(`Reproduciendo pista de relajación: ${randomTrack} a volumen ${relaxationAudio.volume}`);
    }
    let relaxationTimeLeft = RELAXATION_DURATION_MINUTES * 60;
    const timerInterval = setInterval(() => {
      const minutes = Math.floor(relaxationTimeLeft / 60);
      const seconds = relaxationTimeLeft % 60;
      if (relaxationTimeLeft < 0) {
        clearInterval(timerInterval);
        endRelaxationPhase();
      }
      relaxationTimeLeft--;
    }, 1000);
  });
  function endRelaxationPhase() {
    relaxationAudio.pause();
    relaxationAudio.currentTime = 0;
    sendEvent('FIN_RELAJACION');
    baselineTitle.textContent = "Evaluación Final";
    currentMeasurementPhase = 'final';
    showScreen('baseline-screen');
    sendEvent('INICIO_FINAL_MEASUREMENT');
  }

  // --- LÓGICA FINAL (FLUJO CORREGIDO) ---
showGraphButton.addEventListener('click', () => {
  const imageUrl = `/feedback_images/${userResponses.participantId}_grafico.png`;
  const imgElement = document.getElementById('feedback-graph-image');
  const loadingMessage = document.getElementById('graph-loading-message');

  imgElement.src = imageUrl;
  imgElement.style.display = 'none';
  loadingMessage.style.display = 'block';

  imgElement.onload = () => {
      loadingMessage.style.display = 'none';
      imgElement.style.display = 'block';
  };
  imgElement.onerror = () => {
      loadingMessage.textContent = "Hubo un error al generar o cargar el gráfico.";
  };

  showScreen('biofeedback-display-screen');
});

endSessionButton.addEventListener('click', () => {
    sessionStorage.removeItem('tfg_data');
    showScreen('goodbye-screen');
});

});