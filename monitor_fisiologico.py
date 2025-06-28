# -*- coding: utf-8 -*-
"""
Script Completo de Adquisición y Análisis Psicofisiológico en Tiempo Real

Recibe datos de EDA e IBI vía UDP, los limpia, analiza para HRV,
los guarda en un archivo CSV y los visualiza en tiempo real.

Autor: Dave (con la asistencia de TFG-Gemini)
Fecha: 26 de junio de 2025
"""

import socket
import csv
import collections
from datetime import datetime
import numpy as np
from pyhrv import hrv
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# =============================================================================
# --- CONFIGURACIÓN PRINCIPAL ---
# =============================================================================
# Red
UDP_IP = "0.0.0.0"  # Escuchar en todas las interfaces de red
UDP_PORT = 12345

# Archivo de Log
TIMESTAMP_SESSION = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILENAME = f"sesion_{TIMESTAMP_SESSION}.csv"
LOG_HEADER = ['timestamp_pc', 'datetime_pc', 'eda_raw', 'ibi_raw', 'ibi_limpio']

# Parámetros de Análisis de HRV
IBI_BUFFER_SIZE_SECONDS = 180  # Analizar los últimos 3 minutos de datos
FC_PROMEDIO_ESTIMADA = 75      # Latidos por minuto (para estimar tamaño del buffer)
IBI_BUFFER_SIZE_COUNT = int((IBI_BUFFER_SIZE_SECONDS / 60) * FC_PROMEDIO_ESTIMADA)
ANALYSIS_INTERVAL_SECONDS = 30 # Ejecutar análisis de HRV cada 30 segundos

# Parámetros del Filtro de Artefactos
IBI_CHANGE_THRESHOLD = 0.25 # Un cambio >25% entre latidos se considera artefacto

# =============================================================================
# --- INICIALIZACIÓN DE VARIABLES GLOBALES Y BÚFERS ---
# =============================================================================
# Búfers para guardar los datos recibidos y alimentar los gráficos
# Usamos deque por su eficiencia para añadir y quitar elementos
buffer_eda = collections.deque(maxlen=200)
buffer_ibi = collections.deque(maxlen=200)
buffer_hrv_rmssd = collections.deque(maxlen=50)
buffer_hrv_hf = collections.deque(maxlen=50)

# Búfer principal para el análisis de HRV
analysis_ibi_buffer = collections.deque(maxlen=IBI_BUFFER_SIZE_COUNT)

# Variables para controlar el tiempo del análisis
last_analysis_time = datetime.now()
latest_hrv_results = {'rmssd': 0, 'hf_nu': 0}

# Variable para el filtro de artefactos
last_valid_ibi = 750.0  # IBI inicial de referencia en ms

# Setup del archivo CSV
log_file = open(LOG_FILENAME, 'w', newline='', encoding='utf-8')
writer = csv.writer(log_file)
writer.writerow(LOG_HEADER)
print(f"Archivo de registro creado: {LOG_FILENAME}")


# =============================================================================
# --- CONFIGURACIÓN DE LA VISUALIZACIÓN ---
# =============================================================================
fig, axs = plt.subplots(3, 1, figsize=(12, 8), height_ratios=[2, 2, 1])
fig.suptitle('Monitor Psicofisiológico en Tiempo Real', fontsize=16)

# Gráfico 1: Actividad Electrodérmica (EDA)
axs[0].set_title('Actividad Electrodérmica (EDA)')
axs[0].set_ylabel('Conductancia (µS)')
line_eda, = axs[0].plot([], [], 'b-')
axs[0].grid(True)
axs[0].set_ylim(0, 5) # Ajustar según los valores de tu sensor

# Gráfico 2: Intervalos Inter-Latido (IBI)
axs[1].set_title('Intervalos Inter-Latido (IBI)')
axs[1].set_ylabel('Milisegundos (ms)')
line_ibi, = axs[1].plot([], [], 'r-')
axs[1].grid(True)
axs[1].set_ylim(500, 1200) # Rango típico de IBI

# Gráfico 3: Resultados de HRV
axs[2].set_title('Análisis de HRV (Ventana Deslizante)')
axs[2].set_xticks([0, 1])
axs[2].set_xticklabels(['RMSSD (ms)', 'Potencia HF (n.u.)'])
bar_hrv = axs[2].bar([0, 1], [0, 0], color=['cyan', 'magenta'])
axs[2].set_ylim(0, 100) # Rango para RMSSD y HF en unidades normalizadas

plt.tight_layout(rect=[0, 0, 1, 0.96])


# =============================================================================
# --- LÓGICA PRINCIPAL DE ANIMACIÓN Y PROCESAMIENTO ---
# =============================================================================
def animate(i):
    global last_valid_ibi, last_analysis_time, latest_hrv_results

    # --- 1. Recepción de datos UDP (sin bloqueo) ---
    try:
        data, addr = sock.recvfrom(1024)
        decoded_data = data.decode('utf-8').strip()
        parts = decoded_data.split(',')

        if len(parts) == 2:
            eda_val, ibi_val = float(parts[0]), int(parts[1])

            # --- 2. Filtro de artefactos ---
            is_artifact = abs(ibi_val - last_valid_ibi) / last_valid_ibi > IBI_CHANGE_THRESHOLD
            ibi_limpio = ibi_val if not is_artifact else None

            # --- 3. Almacenamiento en CSV y búfers ---
            timestamp_now = datetime.now()
            writer.writerow([timestamp_now.timestamp(), timestamp_now.strftime("%H:%M:%S.%f"), eda_val, ibi_val, ibi_limpio])

            buffer_eda.append(eda_val)
            buffer_ibi.append(ibi_val) # Graficamos el IBI crudo para ver los artefactos

            if not is_artifact:
                analysis_ibi_buffer.append(ibi_val)
                last_valid_ibi = ibi_val

    except BlockingIOError:
        pass # No hay datos nuevos, continuar
    except (ValueError, IndexError):
        print(f"Paquete malformado recibido: {data}")
        pass
    except Exception as e:
        print(f"Error inesperado: {e}")
        pass

    # --- 4. Análisis de HRV periódico ---
    time_since_last_analysis = (datetime.now() - last_analysis_time).total_seconds()
    if time_since_last_analysis > ANALYSIS_INTERVAL_SECONDS and len(analysis_ibi_buffer) > 50:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Ejecutando análisis de HRV con {len(analysis_ibi_buffer)} muestras...")
        results = hrv(ibi=np.array(analysis_ibi_buffer), fs=0)
        latest_hrv_results['rmssd'] = results['rmssd']
        latest_hrv_results['hf_nu'] = results['hf_nu']
        last_analysis_time = datetime.now()

    # --- 5. Actualización de los gráficos ---
    # EDA
    line_eda.set_data(range(len(buffer_eda)), buffer_eda)
    axs[0].relim()
    axs[0].autoscale_view()

    # IBI
    line_ibi.set_data(range(len(buffer_ibi)), buffer_ibi)
    axs[1].relim()
    axs[1].autoscale_view()

    # HRV
    bar_hrv[0].set_height(latest_hrv_results['rmssd'])
    bar_hrv[1].set_height(latest_hrv_results['hf_nu'])

    return line_eda, line_ibi, bar_hrv[0], bar_hrv[1]


# =============================================================================
# --- EJECUCIÓN PRINCIPAL ---
# =============================================================================
if __name__ == "__main__":
    # Configurar el socket para que no sea bloqueante
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    sock.setblocking(False)

    # Iniciar la animación
    # `interval=200` significa que la función `animate` se llamará cada 200 ms
    ani = animation.FuncAnimation(fig, animate, interval=200, blit=True, cache_frame_data=False)

    try:
        plt.show()
    finally:
        # Asegurarse de que el socket y el archivo se cierren correctamente
        print("\nCerrando aplicación...")
        sock.close()
        log_file.close()
        print("Recursos liberados. ¡Hasta la próxima!")
