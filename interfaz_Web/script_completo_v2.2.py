"""
=================================================================
 ARCHIVO: script_completo_v2.2.py
 DESCRIPCIÓN: Script principal de recolección y procesamiento.
 FUNCIÓN: 
 1. (Modo Recolección): Recibe datos del sensor (vía UDP),
    los visualiza en tiempo real (con PyQt5), escucha eventos
    de la interfaz web (vía WebSocket) y guarda los datos
    fisiológicos en un archivo CSV.
 2. (Modo Gráfico): Genera un gráfico de biofeedback (PNG)
    a partir de un archivo CSV existente para la fase de
    entrevista.
 AUTOR: [Dave Clausell]
 REPOSITORIO: https://github.com/DaveClausell-AAEE/el-ataraxio
 LICENCIA: Publicado bajo licencia CC BY 4.0
=================================================================
"""

# --- Dependencias ---
import sys
import socket # Para UDP
import numpy as np
import csv
import threading # Para correr WS y UDP en hilos separados
import queue
import time
import json
import asyncio
import websockets # Para conectarse al server.js
import os
import pandas as pd # Para leer el CSV fácilmente
import matplotlib
matplotlib.use('Agg') # Modo "no interactivo" para Matplotlib (importante)
import matplotlib.pyplot as plt

# --- Dependencia Opcional: PyQt5 para GUI ---
try:
    from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout
    from PyQt5.QtCore import QTimer
    import pyqtgraph as pg
    PYQT5_AVAILABLE = True
except ImportError:
    PYQT5_AVAILABLE = False
    print("Advertencia: PyQt5 o pyqtgraph no están instalados. El modo de recolección en tiempo real no funcionará.")
    print("Podés usar este script para generar gráficos con: python3 script_completo_v2.2.py --generate-graph <ruta_al_csv>")

# --- Configuración ---
UDP_IP = "0.0.0.0"       # IP donde escucha el socket UDP (0.0.0.0 = todas)
UDP_PORT = 12345         # Puerto donde escucha el socket UDP
WEBSOCKET_URI = "ws://localhost:3000" # URI del server.js
MAX_HISTORY_LENGTH = 300 # Ancho de la ventana de visualización (en muestras)
MOVING_AVERAGE_WINDOW = 20 # Ventana para el suavizado de media móvil

# --- Variables Globales y Colas ---
event_queue = queue.Queue()     # Cola para eventos de la GUI y WS
csv_writer = None               # Objeto para escribir el CSV
csv_file = None                 # Archivo CSV
current_csv_path = None         # Ruta del archivo CSV actual
participant_id_global = None    # ID del participante (recibido por WS)
gsr_history = np.zeros(MAX_HISTORY_LENGTH) # Array para la visualización
sock = None                     # Socket UDP

# =================================================================
# FUNCIÓN PARA GENERAR EL GRÁFICO DE BIOFEEDBACK (Modo Gráfico)
# =================================================================
def crear_grafico_biofeedback(csv_path, participant_id):
    """
    Lee un archivo CSV de datos fisiológicos y genera un gráfico
    de biofeedback (PNG) con las fases del experimento.
    """
    if not os.path.exists(csv_path):
        print(f"Error al graficar: No se encuentra el archivo {csv_path}")
        return

    try:
        # 1. Cargar datos usando Pandas
        df = pd.read_csv(csv_path)
        
        # 2. Filtrar fases (ignorar 'idle' o 'practice')
        df_exp = df[df['phase'].isin(['baseline', 'stroop', 'relaxation', 'final'])]
        if df_exp.empty:
            print("No se encontraron datos de fases experimentales en el CSV.")
            return

        # 3. Calcular Suavizado (Media Móvil)
        window_size = MOVING_AVERAGE_WINDOW
        df_exp['gsr_smooth'] = df_exp['gsr'].rolling(window=window_size, min_periods=1).mean()
        
        # 4. Invertir la señal de GSR (si es necesario, ej. si es conductancia)
        # En este TFG, una GRS más baja (menos resistencia) = más activación.
        # Lo invertimos para que "más alto" sea "más activación".
        df_exp['gsr_inverted'] = -df_exp['gsr_smooth']

        # 5. Crear el Gráfico (Matplotlib)
        plt.figure(figsize=(12, 6))
        
        # Colorear el fondo según la fase
        fases = df_exp['phase'].unique()
        colors = {'baseline': '#D6EAF8', 'stroop': '#FADBD8', 'relaxation': '#D5F5E3', 'final': '#FEF9E7'}
        
        for fase in fases:
            fase_data = df_exp[df_exp['phase'] == fase]
            plt.axvspan(fase_data.index.min(), fase_data.index.max(), 
                        facecolor=colors.get(fase, '#EAECEE'), alpha=0.7, 
                        label=f"Fase: {fase.capitalize()}")

        # 6. Plotear la línea de GSR (invertida y suavizada)
        plt.plot(df_exp.index, df_exp['gsr_inverted'], color='black', linewidth=1.5, label='Nivel de Activación (GSR Invertido)')

        # 7. Configuración y Estilo del Gráfico
        plt.title(f'Respuesta Fisiológica: Participante {participant_id}', fontsize=16)
        plt.ylabel('Nivel de Activación (Arbitrario)', fontsize=12)
        plt.xlabel('Tiempo (muestras)', fontsize=12)
        
        # Crear leyenda única
        handles, labels = plt.gca().get_legend_handles_labels()
        by_label = dict(zip(labels, handles))
        plt.legend(by_label.values(), by_label.keys())
        
        plt.grid(True, linestyle=':', alpha=0.6)
        plt.tight_layout()

        # 8. Guardar el archivo PNG
        output_dir = "feedback_images"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        # IMPORTANTE: El nombre del archivo DEBE coincidir con el
        # que espera la interfaz web (app.js)
        output_filename = os.path.join(output_dir, f"{participant_id}_grafico.png")
        plt.savefig(output_filename)
        
        print(f"--- ¡ÉXITO! Gráfico guardado en: {output_filename} ---")

    except Exception as e:
        print(f"Error durante la generación del gráfico: {e}")
        import traceback
        traceback.print_exc()

# =================================================================
# HILO LISTENER DE WEBSOCKET (Modo Recolección)
# =================================================================
async def websocket_listener_async():
    """
    Se conecta al server.js y escucha eventos.
    Pone los eventos en la 'event_queue' para que el hilo
    principal (UDP/GUI) los procese.
    """
    global participant_id_global, current_csv_path
    uri = WEBSOCKET_URI
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                print(f"Conectado al servidor WebSocket en {uri}")
                
                # Bucle principal de escucha
                async for message in websocket:
                    data = json.loads(message)
                    print(f"Mensaje WS recibido: {data}")
                    
                    # --- Evento: INICIO_EXPERIMENTO ---
                    # (Este evento es hipotético, en tu server.js
                    # el evento es 'GROUP_ASSIGNED')
                    # Adaptamos esto al flujo de app.js y server.js
                    # La interfaz web debe enviar el ID y el Grupo.
                    
                    # --- Evento: INICIO_BASELINE ---
                    # Recibimos el ID y el Grupo desde la interfaz (app.js)
                    if data.get('event') == 'INICIO_BASELINE':
                        participant_id = data.get('details', {}).get('participantId', 'default_id')
                        participant_id_global = participant_id.replace(/[^a-z0-9_ -]/gi, '_') # Sanitizar
                        
                        # Crear el archivo CSV para este participante
                        csv_filename = f"{participant_id_global}_bio.csv"
                        current_csv_path = os.path.join("bio_data", csv_filename) # Asumiendo carpeta 'bio_data'
                        
                        if not os.path.exists("bio_data"):
                            os.makedirs("bio_data")
                            
                        # Poner el evento en la cola para que el hilo principal
                        # abra el archivo CSV.
                        event_queue.put({'type': 'start_csv', 'path': current_csv_path})
                        
                    # --- Evento: CAMBIO DE FASE ---
                    # (Ej: INICIO_STROOP, INICIO_RELAJACION, etc.)
                    # Todos los eventos que definiste en app.js
                    else:
                        event_queue.put({'type': 'phase_change', 'phase': data.get('event', 'unknown')})

        except (websockets.exceptions.ConnectionClosedError, OSError) as e:
            print(f"Error de WebSocket: {e}. Reintentando en 5 segundos...")
            await asyncio.sleep(5)

def websocket_listener():
    """Función 'wrapper' para correr el listener async en un hilo."""
    asyncio.run(websocket_listener_async())

# =================================================================
# PROCESAMIENTO DE DATOS UDP (Modo Recolección)
# =================================================================
def process_udp_data():
    """
    Bucle principal del hilo de recolección.
    1. Lee datos de UDP.
    2. Procesa eventos de la 'event_queue'.
    3. Escribe datos en el CSV.
    4. Actualiza el array de la GUI (gsr_history).
    """
    global gsr_history, csv_writer, csv_file, sock
    
    current_phase = 'idle' # Fase actual (controlada por WS)
    
    while True:
        # --- 1. Procesar eventos de la cola (sin bloquear) ---
        try:
            event = event_queue.get_nowait()
            
            if event['type'] == 'phase_change':
                current_phase = event.get('phase', 'unknown')
                print(f"Cambiando a fase: {current_phase}")
                
            elif event['type'] == 'start_csv':
                # Cerrar archivo anterior si estuviera abierto
                if csv_file:
                    csv_file.close()
                
                # Abrir nuevo archivo CSV
                csv_path = event['path']
                csv_file = open(csv_path, 'w', newline='')
                csv_writer = csv.writer(csv_file)
                csv_writer.writerow(['timestamp', 'gsr', 'phase']) # Escribir cabecera
                print(f"Iniciando guardado de CSV en: {csv_path}")

            elif event['type'] == 'stop_csv':
                if csv_file:
                    csv_file.close()
                    csv_file = None
                    csv_writer = None
                    print("CSV guardado y cerrado.")

        except queue.Empty:
            pass # No hay eventos, continuar.

        # --- 2. Leer datos de UDP (sin bloquear) ---
        try:
            data, addr = sock.recvfrom(1024) # buffer 1024 bytes
            message = data.decode('utf-8').strip()
            
            # Asumimos que el sensor envía solo el valor numérico de GSR
            if message.startswith('GSR:'):
                gsr_value = float(message.split(':')[1])
                timestamp = time.time()
                
                # --- 3. Escribir en CSV (si está activo) ---
                if csv_writer:
                    csv_writer.writerow([timestamp, gsr_value, current_phase])
                
                # --- 4. Actualizar array de la GUI ---
                # Desplazar el array 'history'
                gsr_history[:-1] = gsr_history[1:]
                # Añadir el nuevo valor
                gsr_history[-1] = gsr_value 

        except BlockingIOError:
            # No hay datos UDP, es normal, no hacer nada.
            pass
        except Exception as e:
            # Otro error (ej. decodificación)
            # print(f"Error procesando UDP: {e}")
            pass
        
        # Pequeña pausa para no saturar el CPU
        time.sleep(0.001)

# =================================================================
# CLASE DE LA GUI (Modo Recolección)
# =================================================================
if PYQT5_AVAILABLE:
    class RealTimePlotter(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle("Visor de Datos Fisiológicos TFG")
            self.setGeometry(100, 100, 800, 400)
            
            # --- Layout ---
            widget = QWidget()
            layout = QVBoxLayout()
            widget.setLayout(layout)
            self.setCentralWidget(widget)
            
            # --- Plot (pyqtgraph) ---
            self.plot_widget = pg.PlotWidget()
            layout.addWidget(self.plot_widget)
            self.plot_widget.setLabel('left', 'Valor GSR (Resistencia)')
            self.plot_widget.setLabel('bottom', 'Tiempo (muestras)')
            self.plot_widget.setYRange(0, 4096) # Rango típico de ADC
            self.plot_widget.showGrid(x=True, y=True, alpha=0.3)
            
            # --- Curva de datos ---
            self.data_line = self.plot_widget.plot(pen='y') # 'y' = yellow
            
            # --- Timer de actualización ---
            # Actualiza la gráfica 30 veces por segundo (aprox 33ms)
            self.timer = QTimer()
            self.timer.setInterval(33) 
            self.timer.timeout.connect(self.update_plot)
            self.timer.start()

        def update_plot(self):
            """
            Se llama por el QTimer.
            Actualiza la línea del gráfico con los datos del array 'gsr_history'.
            """
            self.data_line.setData(gsr_history)
            
        def closeEvent(self, event):
            """
            Al cerrar la ventana, informa al hilo de datos que pare.
            """
            print("Cerrando aplicación...")
            event_queue.put({'type': 'stop_csv'})
            if sock:
                sock.close()
            event.accept()

# =================================================================
# FUNCIÓN DE INICIO (Modo Recolección)
# =================================================================
def start_collection_mode():
    """
    Inicia todos los componentes del modo recolección.
    """
    global sock
    if not PYQT5_AVAILABLE:
        print("Error: PyQt5 y/o pyqtgraph no están instalados.")
        print("El modo de recolección en tiempo real no puede iniciarse.")
        sys.exit(1)

    # 1. Configurar Socket UDP
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    sock.setblocking(False) # IMPORTANTE: Socket no bloqueante
    print(f"Escuchando datos UDP en el puerto {UDP_PORT}...")

    # 2. Iniciar hilo de WebSocket
    ws_thread = threading.Thread(target=websocket_listener, daemon=True)
    ws_thread.start()
    print("Iniciando listener de WebSocket...")

    # 3. Iniciar hilo de procesamiento UDP
    udp_thread = threading.Thread(target=process_udp_data, daemon=True)
    udp_thread.start()
    print("Iniciando procesamiento de datos UDP...")
    
    # 4. Iniciar GUI (Debe correr en el hilo principal)
    print("--- MODO RECOLECCIÓN: Iniciando visor en tiempo real... ---")
    app = QApplication(sys.argv)
    window = RealTimePlotter()
    window.show()
    sys.exit(app.exec_())
    
# =================================================================
# --- SECCIÓN DE EJECUCIÓN (main) ---
# =================================================================
if __name__ == '__main__':
    """
    Punto de entrada. Decide qué modo ejecutar basado en los
    argumentos de línea de comandos (flags).
    """
    
    # --- MODO 2: Generar Gráfico (Standalone) ---
    if len(sys.argv) > 1 and sys.argv[1] == '--generate-graph' and len(sys.argv) == 3:
        archivo_csv = sys.argv[2]
        
        if not os.path.exists(archivo_csv):
            print(f"Error: No se encuentra el archivo '{archivo_csv}'")
        else:
            # Extraer ID del nombre del archivo (ej. 'dave_bio.csv' -> 'dave')
            participant_id = os.path.basename(archivo_csv).replace('_bio.csv', '')
            print(f"--- MODO STANDALONE: Generando gráfico para '{participant_id}' ---")
            
            # Llamar a la función de graficación
            crear_grafico_biofeedback(archivo_csv, participant_id)
            
    # --- MODO 1: Recolección en Tiempo Real (Default) ---
    elif len(sys.argv) == 1:
        start_collection_mode()
        
    # --- Error / Ayuda ---
    else:
        print("Argumento no reconocido. Uso:")
        print("  - Para recolección en tiempo real: python3 script_completo_v2.2.py")
        print("  - Para generar un gráfico:         python3 script_completo_v2.2.py --generate-graph ruta/al/archivo.csv")