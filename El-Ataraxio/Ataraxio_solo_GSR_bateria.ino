#include <M5StickCPlus.h>
#include <WiFi.h>
#include <WiFiUdp.h>

// --- Configuración de Red ---
//--------------------------------------------------
//const char* ssid = "AIREBAN";
//const char* password = "07701768";
//const char* udpAddress = "192.168.1.28";
//--------------------------------------------------
//const char* ssid = "TeleRed-4601";
//const char* password = "5C68FF4601";
//const char* udpAddress = "192.168.0.7";
//--------------------------------------------------
//const char* ssid = "Personal-03A";
//const char* password = "2FF70AC03A";
//const char* udpAddress = "192.168.0.111";
//--------------------------------------------------
//const char* ssid = "Zonanet Nicolas";
//const char* password = "10111976";
//const char* udpAddress = "192.168.1.107";
//--------------------------------------------------
const char* ssid = "MUNTREF ARTE Y CIENCIA PB";
const char* password = "arteycienciaPB";
const char* udpAddress = "192.168.0.192";
//--------------------------------------------------
const int udpPort = 12345;
WiFiUDP udp;

// --- Variables para el control de tiempo y UI ---
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 500;
bool sendingIndicatorState = false;

// --- Constantes para el Sensor GSR ---
const int GSR_PIN = 36; 

// =================================================================
// --- NUEVO: FUNCIÓN PARA DIBUJAR EL ÍCONO DE LA BATERÍA ---
// =================================================================
void drawBattery(float voltage, int percentage) {
    // Dibuja el cuerpo del ícono de la batería
    M5.Lcd.drawRect(M5.Lcd.width() - 30, 5, 22, 12, WHITE);
    M5.Lcd.drawRect(M5.Lcd.width() - 8, 8, 2, 6, WHITE);

    // Dibuja el nivel de carga
    int barWidth = map(percentage, 0, 100, 0, 20);
    int barColor = GREEN;
    if (percentage < 50) barColor = YELLOW;
    if (percentage < 20) barColor = RED;

    M5.Lcd.fillRect(M5.Lcd.width() - 29, 6, barWidth, 10, barColor);
}
// =================================================================


void setup() {
  M5.begin();
  M5.Axp.EnableCoulombcounter(); // Habilitar contador de carga
  
  M5.Lcd.setRotation(1);
  M5.Axp.ScreenBreath(23); // Podés ajustar este valor entre 0-100
  M5.Lcd.fillScreen(BLACK);
  M5.Lcd.setTextSize(2);
  M5.Lcd.println("Sensor GSR");

  // Iniciar WiFi
  WiFi.begin(ssid, password);
  M5.Lcd.print("Conectando...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    M5.Lcd.print(".");
  }
  M5.Lcd.println("\nConectado!");
  delay(1500);
}

void loop() {
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();

    // 1. Leer el valor crudo del sensor GSR
    int gsrRaw = analogRead(GSR_PIN);

    // 2. Formatear los datos para enviar
    char dataBuffer[20];
    sprintf(dataBuffer, "%d", gsrRaw);

    // 3. Enviar datos por UDP
    udp.beginPacket(udpAddress, udpPort);
    udp.write((uint8_t*)dataBuffer, strlen(dataBuffer));
    udp.endPacket();
    
    sendingIndicatorState = !sendingIndicatorState;

    // --- Actualizar Pantalla del M5Stick ---
    M5.Lcd.fillScreen(BLACK);
    M5.Lcd.setCursor(0, 20);
    M5.Lcd.setTextSize(2);
    M5.Lcd.printf("GSR (Raw):");
    M5.Lcd.setCursor(0, 50);
    M5.Lcd.setTextSize(3);
    M5.Lcd.printf("%d", gsrRaw);

    // --- NUEVO: Lógica para leer y mostrar el estado de la batería ---
    float battVoltage = M5.Axp.GetBatVoltage();
    // El rango de voltaje de la batería del M5StickC Plus es aprox 3.0V (vacía) a 4.2V (llena)
    int battPercentage = map(constrain(battVoltage * 1000, 3000, 4200), 3000, 4200, 0, 100);

    // Dibujamos el ícono de la batería en la esquina superior derecha
    drawBattery(battVoltage, battPercentage);
    
    // Mostramos el porcentaje al lado del ícono
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(M5.Lcd.width() - 60, 7);
    M5.Lcd.printf("%d%%", battPercentage);
    // -----------------------------------------------------------

    // El indicador de envío ahora lo movemos un poco más abajo
    if(sendingIndicatorState) {
        M5.Lcd.fillCircle(M5.Lcd.width() - 15, 30, 5, GREEN);
    } else {
        M5.Lcd.fillCircle(M5.Lcd.width() - 15, 30, 5, DARKGREY);
    }
  }
  delay(20);
}