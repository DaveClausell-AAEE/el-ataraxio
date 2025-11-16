# ἀταραξία (Ataraxia)

## Artes Electrónicas, Psicofisiología y Metacognición: Explorando la recuperación del estrés en estudiantes universitarios

Este repositorio contiene todos los componentes, la investigación y el desarrollo del Trabajo Final de Grado (TFG) **"Ataraxia"**, presentado por **Dave Clausell** para la Licenciatura en Artes Electrónicas de la Universidad Nacional de Tres de Febrero (UNTREF), con la tutoría de Bruno Mesz.

El proyecto integra las Artes Electrónicas, la psicofisiología y la investigación educativa para investigar cómo los estímulos sensoriales transmodales (paisajes sonoros y aromas) influyen en la recuperación fisiológica del estrés cognitivo en estudiantes universitarios.

Un segundo objetivo clave es evaluar cómo una fase de **biofeedback diferido** y reflexión guiada puede fomentar la autoconciencia y la comprensión metacognitiva de los estudiantes sobre sus propias respuestas al estrés.

Todo el desarrollo se comparte bajo una filosofía de **hardware y software libre**, buscando democratizar el acceso a estas herramientas de investigación y bienestar.

## 🏛️ Estructura del Repositorio

Este repositorio está organizado en tres directorios principales, cada uno conteniendo una parte fundamental del proyecto para su total replicación:

### 1. [`/El-Ataraxio`](https://github.com/DaveClausell-AAEE/Ataraxia/tree/main/El-Ataraxio) - El Dispositivo

Contiene toda la documentación técnica para construir **"El Ataraxio"**, el dispositivo biométrico de hardware libre (basado en Arduino/ESP) desarrollado para este TFG, capaz de medir la Actividad Electrodermal (EDA) y la Frecuencia Cardíaca (FC).

En esta carpeta encontrarás:

* **Hardware:** Diagramas de circuito, lista de componentes (BOM) y esquemáticos (PCB) para ensamblar el sensor.
* **Software (Firmware):** El código (`.ino`) que corre en el microcontrolador para leer los datos de los sensores y enviarlos al ordenador.
* **Guías de Calibración:** Notas sobre cómo probar y calibrar el sensor para obtener lecturas fiables.

### 2. [`/interfaz_Web`](https://github.com/DaveClausell-AAEE/Ataraxia/tree/main/interfaz_Web) - El Protocolo Experimental

Este directorio aloja la aplicación web (frontend) que guía al participante y al investigador a través de todo el protocolo experimental. Es el "cerebro" de la sesión que controla el flujo de la experiencia.

Incluye:

* **Código Fuente:** Los archivos `index.html`, `style.css` y `app.js` que componen la interfaz.
* **Lógica del Experimento:** Controla las fases de Línea Base, Tarea de Estrés (Stroop), Fase de Relajación (con/sin estímulos) y la pantalla de Biofeedback final.
* **Backend:** Los scripts de `server.js` (Node.js) y `script_completo.py` (Python) que gestionan la comunicación, guardado de datos, y generación de gráficos.
* **Guía de Uso:** Instrucciones detalladas sobre cómo instalar y ejecutar el sistema completo.

### 3. [`/Colab`](https://github.com/DaveClausell-AAEE/Ataraxia/tree/main/Colab) - Análisis de Datos

Contiene los scripts y notebooks de Python (orientados a Google Colab) utilizados para el **análisis de los datos cualitativos**, es decir, las entrevistas semi-estructuradas.

Aquí encontrarás:

* **Notebooks de Google Colab:** Scripts de Procesamiento de Lenguaje Natural (NLP).
* **Análisis de Entrevistas:** Métodos utilizados para analizar las transcripciones de las entrevistas de metacognición, buscando patrones, sentimientos y temas emergentes en la reflexión de los participantes.

## 📜 El Documento TFG

El documento PDF completo **`Ataraxia.pdf`** (126 páginas) que detalla el marco teórico, la metodología, el desarrollo, los resultados y las conclusiones de esta investigación se encuentra en la raíz de este repositorio.

Es la guía maestra para entender el *por qué* y el *cómo* de todas las herramientas aquí presentes.

## ⚖️ Licencia

Este trabajo y todos sus componentes (software, hardware y documentación escrita) se publican bajo la licencia **Creative Commons Atribución 4.0 Internacional (CC BY 4.0)**.

[![Licencia CC BY 4.0](https://img.shields.io/badge/Licencia-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

Sos libre de:

* **Compartir:** Copiar y redistribuir el material en cualquier medio o formato.
* **Adaptar:** Remezclar, transformar y construir a partir del material para cualquier propósito, incluso comercial.

Bajo la única condición de que **debes dar el crédito apropiado** (atribución), proporcionando un enlace a esta licencia e indicando si se realizaron cambios.

## 💬 Cita y Contacto

Si utilizás este trabajo, por favor citálo de la siguiente manera:

> Clausell, Dave. (2025). *ἀταραξία (Ataraxia): Artes Electrónicas, Psicofisiología y Metacognición: Explorando la Recuperación del Estrés en Estudiantes Universitarios*. Trabajo Final de Grado, Licenciatura en Artes Electrónicas, Universidad Nacional de Tres de Febrero (UNTREF). Repositorio: [https://github.com/DaveClausell-AAEE/Ataraxia](https://github.com/DaveClausell-AAEE/Ataraxia)
