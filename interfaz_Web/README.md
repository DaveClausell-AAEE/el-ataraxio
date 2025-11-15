# Backend del Sistema de TFG (Servidor y Recolección)

Este repositorio contiene los componentes del "backend" para el Trabajo Final de Grado (TFG) "Artes Electrónicas, Psicofisiología y Metacognición".

Estos scripts son el puente entre la [Interfaz Web (Frontend)](https://github.com/usuario/repo-frontend) y el hardware de recolección de datos (sensor fisiológico).

## 🚀 Propósito del Sistema

Este sistema tiene tres responsabilidades principales:

1.  **Orquestación (`server.js`):** Actúa como un "hub" central.
    * Asigna grupos experimentales de forma balanceada a los participantes (Control, Música, etc.).
    * Recibe los datos finales (JSON) de la interfaz web y los guarda en el disco.
    * (Ver Nota de Arquitectura) Sirve como punto de conexión para todos los "clientes" (Interfaz Web y Script de Python).

2.  **Recolección (`script_completo_v2.2.py`):** Actúa como el "recolector" de datos.
    * **Modo 1 (Recolección):** Se conecta al hub (`server.js`) para escuchar eventos, escucha los datos del sensor (vía UDP) y los guarda en un archivo `.csv` en tiempo real, marcando las fases del experimento.
    * **Modo 2 (Graficación):** Se ejecuta *después* del experimento para leer un `.csv` y generar el gráfico de biofeedback (`.png`) que se le mostrará al participante.

3.  **Visualización (`script_completo_v2.2.py`):**
    * En el Modo 1, también levanta una interfaz gráfica (con PyQt5) para que el investigador pueda monitorear la señal del sensor en tiempo real.

## 🏗️ Arquitectura de Comunicación

El sistema funciona con varios componentes comunicándose en red:

1.  **`server.js` (Node.js)**: Es el **Hub Central**. Se ejecuta en una terminal.
2.  **`script_completo_v2.2.py` (Python)**: Es el **Cliente Recolector**. Se ejecuta en una segunda terminal. Se conecta por WebSocket al `server.js` y escucha datos UDP del sensor.
3.  **Interfaz Web (Navegador)**: Es el **Cliente Participante**. Se conecta por WebSocket al `server.js`.
4.  **Sensor (Hardware)**: No está en este repo. Envía datos por UDP al **Cliente Recolector**.
