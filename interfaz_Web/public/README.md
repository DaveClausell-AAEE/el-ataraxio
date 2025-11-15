# Interfaz Web para Protocolo Experimental TFG

Esta interfaz web (frontend) es un componente central del Trabajo Final de Grado (TFG) "Artes Electrónicas, Psicofisiología y Metacognición: Explorando la Recuperación del Estrés en Estudiantes Universitarios" de la Licenciatura en Artes Electrónicas.

El objetivo de esta aplicación es guiar al participante y al investigador a través de las distintas fases del protocolo experimental, asegurando una experiencia estandarizada y controlada.

![Captura de pantalla de la interfaz de bienvenida](httpsF://ruta/a/tu/imagen.png)
*(Reemplazá esto con una captura de pantalla real de tu app si lo deseás)*

## Contexto del Proyecto

La aplicación web sirve como el controlador principal del experimento, que investiga cómo diferentes estímulos sensoriales (paisajes sonoros y aromas) influyen en la recuperación fisiológica del estrés cognitivo. Además, facilita la fase final de biofeedback y reflexión metacognitiva.

## 🚀 Cómo Empezar

Esta es una aplicación web estática (frontend puro) construida con HTML, CSS y JavaScript vainilla. No requiere un *backend* complejo para funcionar.

1.  **Descargar:** Cloná o descargá este repositorio en tu computadora local.
2.  **Ejecutar:** La forma más simple es abrir el archivo `index.html` directamente en tu navegador web (Firefox, Chrome, Edge, etc.).

> **Recomendación Profesional:**
> Para evitar problemas con las políticas de seguridad del navegador (CORS) al cargar archivos locales (como el audio), se recomienda servir los archivos desde un servidor local simple.
>
> Si tenés Python instalado, podés hacerlo fácilmente:
> 1.  Abrí una terminal en la carpeta donde están los archivos.
> 2.  Ejecutá el comando: `python -m http.server`
> 3.  Abrí tu navegador y andá a: `http://localhost:8000`

## 📋 Flujo del Experimento

La aplicación está dividida en "pantallas" que se muestran secuencialmente. El flujo está controlado por `app.js`:

1.  **Bienvenida (`welcome-screen`):**
    * Muestra el consentimiento informado.
    * Realiza preguntas de screening (filtro).
    * El investigador ingresa el **ID de Participante** y selecciona el **Grupo Experimental** (Control, Música, Aroma, Música+Aroma).
    * Al iniciar, abre una nueva pestaña con el formulario de Big Five (ver configuración).

2.  **Línea Base (`baseline-screen`):**
    * Pantalla de espera mientras se realiza la medición fisiológica inicial (EDA/HRV).

3.  **Tarea de Estrés (`stroop-task-screen`):**
    * Implementa una versión de la Tarea Stroop para inducir estrés cognitivo.
    * (Se puede complementar o reemplazar con otras tareas como el TMT).

4.  **Fase de Relajación (`relaxation-phase-screen`):**
    * Según el grupo asignado, reproduce música, activa un difusor de aroma (vía `sendEvent`), ambos, o ninguno (Control).
    * La duración es configurable (por defecto 5 min).

5.  **Medición Final (`baseline-screen` reutilizada):**
    * Pantalla de espera para la medición fisiológica post-intervención.

6.  **Fin de Experimento (`final-screen`):**
    * Punto de detención. Indica al participante que avise al investigador.

7.  **Biofeedback (`biofeedback-display-screen`):**
    * Muestra un gráfico (`.png`) con la respuesta fisiológica del participante (ver **Dependencias Externas**).
    * Esta pantalla se usa como apoyo visual para la entrevista de metacognición.

8.  **Despedida (`goodbye-screen`):**
    * Cierre de la sesión.

## 🔧 Configuración y Adaptación

Para utilizar esta interfaz en tu propio proyecto, necesitás configurar algunos puntos clave en `app.js`:

### 1. Google Form (Big Five)

En `app.js`, buscá la constante `BIG_FIVE_URL_TEMPLATE` y reemplazala con la URL "pre-llenada" de tu propio Google Form, asegurándote de mantener el *placeholder* `ID_A_REEMPLAZAR` para que la app pueda insertar el ID del participante automáticamente.

```javascript
// Reemplaza esta URL por la de tu propio formulario
const BIG_FIVE_URL_TEMPLATE = "[https://docs.google.com/forms/d/e/XXXXXXXX/viewform?usp=pp_url&entry.123456=ID_A_REEMPLAZAR](https://docs.google.com/forms/d/e/XXXXXXXX/viewform?usp=pp_url&entry.123456=ID_A_REEMPLAZAR)";
