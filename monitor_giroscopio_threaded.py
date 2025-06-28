# -*- coding: utf-8 -*-
"""
Script de Prueba con Giroscopio para el Proyecto "Ataraxia" (Versión con Hilos)

Recibe datos de los 3 ejes de un giroscopio vía UDP en un hilo separado,
los guarda en un archivo CSV y los visualiza en tiempo real en el hilo principal.
Esta arquitectura es más robusta y evita la pérdida de paquetes.

Autor: Dave (con la asistencia de TFG-Gemini)
Fecha: 28 de junio de 2025
"""

import socket
import csv
import collections
from datetime import datetime
import threading
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# =============================================================================
# --- CONFIGURACIÓN PRINCIPAL ---
# =============================================================================
UDP_IP = "0.0.0.0"
UDP_PORT = 12345
TIMESTAMP_SESSION = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILENAME = f"sesion_giroscopio_{TIMESTAMP_SESSION}.csv"
LOG_HEADER = ['timestamp_pc', 'datetime_pc', 'gyro_x', 'gyro_y', 'gyro_z']
BUFFER_SIZE_VISUAL = 200

# =============================================================================
# --- DATOS COMPARTIDOS ENTRE HILOS (CON SINCRONIZACIÓN) ---
# =============================================================================
buffer_gx = collections.deque(maxlen=BUFFER_SIZE_VISUAL)
buffer_gy = collections.deque(maxlen=BUFFER_SIZE_VISUAL)
buffer_gz = collections.deque(maxlen=BUFFER_SIZE_VISUAL)
data_lock = threading.Lock()  # Un "candado" para evitar que los hilos escriban/lean al mismo tiempo

# =============================================================================
# --- HILO OYENTE UDP ---
# =============================================================================
def udp_listener(sock, log_writer):
    """
    Esta función se ejecuta en un hilo separado. Su única misión es escuchar
    paquetes UDP y guardar los datos de forma segura.
    """
    print("Hilo oyente iniciado. Escuchando paquetes UDP...")
    while True:
        try:
            data, addr = sock.recvfrom(1024)  # Esta llamada es bloqueante
            decoded_data = data.decode('utf-8').strip()
            parts = decoded_data.split(',')

            if len(parts) == 3:
                gx, gy, gz = float(parts[0]), float(parts[1]), float(parts[2])
                timestamp_now = datetime.now()

                # Usamos el candado para acceder a los datos compartidos de forma segura
                with data_lock:
                    # Escribir en el archivo CSV
                    log_writer.writerow([timestamp_now.timestamp(), timestamp_now.strftime("%H:%M:%S.%f"), gx, gy, gz])
                    # Añadir a los búfers de visualización
                    buffer_gx.append(gx)
                    buffer_gy.append(gy)
                    buffer_gz.append(gz)
        except OSError:
            # Esto ocurrirá cuando el socket se cierre desde el hilo principal
            print("Hilo oyente: El socket se ha cerrado. Terminando.")
            break
        except (ValueError, IndexError):
            print(f"Paquete malformado recibido: {data}")
            pass

# =============================================================================
# --- HILO PRINCIPAL Y VISUALIZACIÓN ---
# =============================================================================
# Configuración del gráfico (igual que antes)
fig, axs = plt.subplots(3, 1, figsize=(12, 8), sharex=True)
fig.suptitle('Monitor de Giroscopio en Tiempo Real (Versión Threaded)', fontsize=16)
axs[0].set_title('Eje X'); axs[0].set_ylabel('Velocidad Angular'); line_gx, = axs[0].plot([], [], 'r-'); axs[0].grid(True); axs[0].set_ylim(-250, 250)
axs[1].set_title('Eje Y'); axs[1].set_ylabel('Velocidad Angular'); line_gy, = axs[1].plot([], [], 'g-'); axs[1].grid(True); axs[1].set_ylim(-250, 250)
axs[2].set_title('Eje Z'); axs[2].set_ylabel('Velocidad Angular'); line_gz, = axs[2].plot([], [], 'b-'); axs[2].grid(True); axs[2].set_ylim(-250, 250)
plt.tight_layout(rect=[0, 0, 1, 0.96])

def animate(i):
    """
    Esta función ahora es mucho más simple. Solo lee de los búfers y dibuja.
    No se encarga de la recepción de red.
    """
    with data_lock:
        # Copiamos los datos para no mantener el candado mientras dibujamos
        gx_data = list(buffer_gx)
        gy_data = list(buffer_gy)
        gz_data = list(buffer_gz)

    line_gx.set_data(range(len(gx_data)), gx_data)
    line_gy.set_data(range(len(gy_data)), gy_data)
    line_gz.set_data(range(len(gz_data)), gz_data)

    for ax in axs:
        ax.set_xlim(0, BUFFER_SIZE_VISUAL)

    return line_gx, line_gy, line_gz

# --- EJECUCIÓN PRINCIPAL ---
if __name__ == "__main__":
    # Configurar y abrir el archivo CSV
    log_file = open(LOG_FILENAME, 'w', newline='', encoding='utf-8')
    writer = csv.writer(log_file)
    writer.writerow(LOG_HEADER)
    print(f"Archivo de registro creado: {LOG_FILENAME}")

    # Configurar el socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))

    # Crear e iniciar el hilo oyente
    # Lo marcamos como "daemon" para que se cierre automáticamente si el programa principal termina
    listener_thread = threading.Thread(target=udp_listener, args=(sock, writer), daemon=True)
    listener_thread.start()

    # Iniciar la animación
    ani = animation.FuncAnimation(fig, animate, interval=50, blit=True, cache_frame_data=False)

    try:
        plt.show()  # Esta llamada es bloqueante y mantiene el programa vivo
    finally:
        # Rutina de cierre limpio
        print("\nCerrando aplicación...")
        sock.close() # Esto causará una excepción en el hilo oyente y hará que termine
        log_file.close()
        print("Recursos liberados.")