#include <M5StickCPlus.h> // Biblioteca específica para M5StickC PLUS
#include <WiFi.h>
#include <WiFiUdp.h>

// --- Configuración de Red ---
const char* ssid = "TeleRed-4601";
const char* password = "5C68FF4601";

const char* udpAddress = "192.168.0.7"; // IP del PC que recibe
const int udpPort = 12345;                     // Puerto UDP de escucha en el PC

// Objeto UDP
WiFiUDP udp;

// --- Variables Globales para el Giroscopio ---
float gyroX, gyroY, gyroZ;

// --- Variables para el control de tiempo del envío UDP ---
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 500; // Intervalo de envío UDP en milisegundos (500ms = 2Hz)

void setup() {
  // Inicializar M5StickC Plus (LCD, IMU, Batería, etc.)
  M5.begin(); 
  M5.IMU.Init(); 

  // Configurar LCD
  M5.Lcd.setRotation(3); 
  M5.Lcd.fillScreen(BLACK);
  M5.Lcd.setTextSize(1); 
  M5.Lcd.setCursor(0, 0);
  M5.Lcd.println("M5StickC Gyro Sender");
  M5.Lcd.println("Press Side Power BTN briefly to turn OFF");


  // Conectar a WiFi
  M5.Lcd.print("Connecting to: ");
  M5.Lcd.println(ssid);
  WiFi.begin(ssid, password);

  int wifi_retries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    M5.Lcd.print(".");
    wifi_retries++;
    if (wifi_retries > 20) { 
      M5.Lcd.println("\nFailed to connect WiFi.");
      while(true) delay(1000); 
    }
  }

  M5.Lcd.println("\nWiFi connected!");
  M5.Lcd.print("IP address: ");
  M5.Lcd.println(WiFi.localIP());
  M5.Lcd.print("Sending to: ");
  M5.Lcd.print(udpAddress);
  M5.Lcd.print(":");
  M5.Lcd.println(udpPort);

  M5.Lcd.println("Attempting to read IMU..."); 

  delay(1500); // Reducido un poco para mostrar el mensaje del botón
  M5.Lcd.fillScreen(BLACK); 
  M5.Lcd.setCursor(0,0); // Asegurar cursor arriba
  M5.Lcd.setTextSize(1);
  M5.Lcd.println("Side PWR BTN to OFF"); // Mensaje persistente sobre el botón
  M5.Lcd.setTextSize(2); 
}

void loop() {
  // --- Comprobación del Botón de Encendido ---
  // GetBtnPress() devuelve:
  // 0x00: Sin evento de pulsación
  // 0x01: Evento de pulsación larga (PEK_LONG_PRESS_IRQ, usualmente ~1.5-2s)
  // 0x02: Evento de pulsación corta (PEK_SHORT_PRESS_IRQ, usualmente >128ms)
  // Esta función también borra los bits de estado del IRQ en el AXP192 después de leerlos.
  uint8_t powerBtnState = M5.Axp.GetBtnPress();

  if (powerBtnState == 0x02) { // Si se detecta una pulsación CORTA del botón de encendido
    M5.Lcd.fillScreen(BLACK);
    M5.Lcd.setCursor(10, 20);
    M5.Lcd.setTextSize(2);
    M5.Lcd.println("Apagando...");
    delay(1000);          // Espera para que se vea el mensaje
    M5.Axp.PowerOff();    // Envía el comando de apagado al AXP192
    // El código puede no continuar después de PowerOff() si el apagado es inmediato.
    // Por si acaso, entramos en un bucle para detener la ejecución.
    while(true) {
      delay(1000);
    }
  }
  // Podrías experimentar con 'if (powerBtnState == 0x01)' para una pulsación un poco más larga,
  // pero ten cuidado de no acercarte demasiado al tiempo de apagado forzado por hardware (6s).

  // --- Lógica de Envío de Datos del Giroscopio (temporizada) ---
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= sendInterval) {
    lastSendTime = currentTime; // Actualizar el tiempo del último envío

    // Leer datos del giroscopio
    M5.IMU.getGyroData(&gyroX, &gyroY, &gyroZ);

    // Mostrar datos en la pantalla del M5StickC PLUS
    // M5.Lcd.fillScreen(BLACK); // No limpiar toda la pantalla para mantener el mensaje del botón
    M5.Lcd.setCursor(0, 10 + M5.Lcd.fontHeight()); // Posicionar debajo del mensaje del botón
    M5.Lcd.printf("GX: %8.2f\n", gyroX); 
    M5.Lcd.printf("GY: %8.2f\n", gyroY);
    M5.Lcd.printf("GZ: %8.2f\n", gyroZ);

    // Formatear los datos para enviar
    char dataBuffer[60]; 
    sprintf(dataBuffer, "%.2f,%.2f,%.2f", gyroX, gyroY, gyroZ);

    // Enviar datos por UDP
    udp.beginPacket(udpAddress, udpPort);
    udp.write((uint8_t*)dataBuffer, strlen(dataBuffer));
    udp.endPacket();
  }

  // Pequeña pausa para mantener el bucle reactivo y no sobrecargar.
  // También permite que otras tareas del M5Stack (como la actualización de botones) se ejecuten.
  delay(20); // Hace que el loop se ejecute aproximadamente 50 veces por segundo.
}