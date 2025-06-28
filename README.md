# El Ataraxio: Biosensor Psicofisiológico para Artes Electrónicas

![El Ataraxio](httpsso://i.imgur.com/your-image-url.png) **El Ataraxio** es un dispositivo de hardware y software de código abierto diseñado para la adquisición y análisis en tiempo real de señales psicofisiológicas. Fue creado como la herramienta principal del Trabajo Final de Grado (TFG) "Ataraxia", de la Licenciatura en Artes Electrónicas.

El objetivo principal del proyecto es medir la recuperación del estrés en estudiantes a través de la monitorización de la **Actividad Electrodérmica (EDA)** y la **Variabilidad de la Frecuencia Cardíaca (HRV)**. Más allá de su aplicación científica, El Ataraxio está concebido como una interfaz expresiva con potencial para aplicaciones artísticas, como el control de música y visuales mediante protocolos MIDI y OSC.

---

## 🛠️ Componentes del Proyecto

El sistema se divide en dos partes principales:

1.  **Dispositivo Físico (Hardware + Firmware):** Un dispositivo portátil basado en el microcontrolador M5StickC PLUS que captura los datos de los sensores.
2.  **Aplicación Anfitriona (Software en Python):** Un script que se ejecuta en un ordenador, encargado de recibir, analizar, visualizar y registrar los datos enviados por el dispositivo.

---

## 硬件 requerida

Para construir la versión final de "El Ataraxio", necesitarás los siguientes componentes:

* **Microcontrolador:** [M5StickC PLUS](https://shop.m5stack.com/products/m5stickc-plus-esp32-pico-mini-iot-development-kit?srsltid=AfmBOorM8-rrSbs43pfgOGreBtVWAtOnfpky98-ryTA0g_aHYnOd9dNb)
* **Sensor de HRV/Pulso:** Sensor de Pulsioximetría [MAX30102](https://www.analog.com/en/products/max30102.html)
* **Sensor de EDA/GSR:** Un sensor de Respuesta Galvánica de la Piel (ej. [Grove - GSR Sensor](https://www.seeedstudio.com/Grove-GSR-Sensor-p-1614.html))
* Cables de conexión (protoboard o PCB personalizada)

---

## 💻 Software e Instalación (Proyecto Principal)

Estas instrucciones corresponden al sistema final de "El Ataraxio" para medir EDA y HRV.

### 1. Firmware del Dispositivo

* **Ubicación:** `/firmware/el_ataraxio_firmware.ino`
* **Instrucciones:**
    1.  Configura tu [Arduino IDE para trabajar con el M5StickC PLUS](https://docs.m5stack.com/en/arduino/m5stickc_plus/program).
    2.  Instala las librerías necesarias para los sensores MAX30102 y GSR.
    3.  Modifica las credenciales de tu red Wi-Fi en el archivo `.ino`.
    4.  Carga el firmware en tu M5StickC PLUS.

### 2. Aplicación Anfitriona (Python)

* **Ubicación:** `/host_app/monitor_fisiologico.py`
* **Instrucciones de configuración:**

    1.  **Clona este repositorio:**
        ```bash
        git clone [https://github.com/daveyourmind/el-ataraxio.git](https://github.com/daveyourmind/el-ataraxio.git)
        cd el-ataraxio
        ```

    2.  **Crea y activa un entorno virtual:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```

    3.  **Instala las dependencias** desde el archivo `requirements.txt`:
        ```bash
        pip install -r host_app/requirements.txt
        ```
        (El archivo `requirements.txt` se encuentra en la carpeta `host_app`).

---

## 🚀 Cómo Usar el Sistema Principal

1.  **Enciende El Ataraxio.** Asegúrate de que esté conectado a la misma red Wi-Fi que tu ordenador. Anota la dirección IP que muestra en su pantalla.
2.  **Configura el script de Python.** Abre el archivo `/host_app/monitor_fisiologico.py` y ajusta la IP y el puerto si es necesario.
3.  **Ejecuta la aplicación anfitriona.** Desde tu terminal (con el entorno `venv` activado):
    ```bash
    python3 host_app/monitor_fisiologico.py
    ```
4.  ¡Listo! La ventana de visualización se iniciará, mostrando los datos fisiológicos en tiempo real.

---

## 🧪 Pruebas Preliminares con Giroscopio

Este repositorio también incluye el código utilizado para las pruebas iniciales del sistema, que utiliza el giroscopio incorporado en el M5StickC PLUS. Esto es útil para validar la comunicación UDP, la visualización y el registro de datos sin necesidad de los sensores externos.

* **Ubicación de los archivos de prueba:** `/gyro_test/`

### Instrucciones para la Prueba con Giroscopio:

1.  **Hardware:** Solo necesitas el M5StickC PLUS.
2.  **Firmware:** Carga el firmware que se encuentra en `/gyro_test/gyro_firmware.ino` en tu M5StickC PLUS. No olvides configurar tus credenciales de Wi-Fi.
3.  **Software:** Ejecuta el script de Python específico para esta prueba:
    ```bash
    python3 gyro_test/monitor_giroscopio_threaded.py
    ```
4.  **Resultado:** Verás una ventana con tres gráficos que muestran los datos de los ejes X, Y, Z del giroscopio en tiempo real.

*(Nota: Las dependencias de Python para esta prueba son `numpy` y `matplotlib`. `pyhrv` y `peakutils` no son necesarios).*

---

## 🎨 Aplicaciones Futuras y Potencial Artístico

La arquitectura en tiempo real de El Ataraxio permite su uso como una **interfaz performática**. El script de Python puede ser extendido para enviar datos a través de protocolos como:

* **MIDI:** Para controlar sintetizadores, samplers y efectos de audio.
* **OSC (Open Sound Control):** Para interactuar con entornos de programación visual y sonora como TouchDesigner, Max/MSP o Pure Data.

---

## 📄 Licencia

Este proyecto se distribuye bajo la **Licencia MIT**. Consulta el archivo `LICENSE` para más detalles.

---

## 🧑‍💻 Autor y Agradecimientos

* **Autor:** Dave (@daveClausell-AAEE)
* Este proyecto es parte del Trabajo Final de Grado "Ataraxia" de la Licenciatura en Artes Electrónicas.
* Agradecimientos especiales a mi asistente de IA, TFG-Gemini, por su colaboración en la estructuración y redacción de la documentación.
