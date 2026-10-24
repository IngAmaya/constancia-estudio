# 🌱 Raíces · Estudio & Constancia

Aplicación de escritorio para **mantener la constancia** en tus exámenes y proyectos, inspirada en *Manual de los 20's*, y pensada también para cuidar tu **bienestar mental**.

Tienes un **Árbol de Constancia** que florece cuando estudias en tus días de enfoque y se marchita si los dejas pasar. **Nunca te castiga por descansar** en los días que tú elijas.

> 💻 Funciona 100 % sin conexión. Tus datos se guardan solo en tu computadora.

---

## 📥 Instalación (Windows)

1. Entra en la sección **[Releases](../../releases)** de este repositorio.
2. En la última versión, descarga el archivo **`Raices-Setup-x.x.x.exe`**.
3. Haz doble clic en el archivo descargado y sigue el asistente de instalación.
4. Abre **Raíces** desde el acceso directo del Escritorio o desde el Menú Inicio.

### ⚠️ "Windows protegió su PC"

La primera vez, Windows SmartScreen puede mostrar un aviso porque la app no tiene una firma digital de pago. **Es normal en apps independientes.** Para continuar:

1. Haz clic en **"Más información"**.
2. Pulsa **"Ejecutar de todas formas"**.

### 🗑️ Desinstalar

*Configuración → Aplicaciones → Aplicaciones instaladas → Raices → Desinstalar*.

---

## 🧭 Cómo usarla

### 1. Crea tus carpetas de materia 📁
En **Materias y Fechas**, pulsa **"+ Nueva Carpeta de Materia"** y elige nombre, icono y color (ej. *Cálculo*, *Anatomía*, *Programación*).

### 2. Agenda exámenes y proyectos 🎯
Pulsa **"+ Nuevo Examen / Proyecto"** y completa:
- La **materia** a la que pertenece.
- El **tipo**: Examen, Proyecto, Entrega o Repaso.
- La **fecha** de presentación o examen.
- El **temario o subtareas** (una por línea). Podrás ir marcándolos para ver tu progreso en %.

Cada tarjeta muestra cuántos días faltan (*"¡Mañana!"*, *"En 4 días"*…).

### 3. Elige tus días de enfoque 🌿🌙
En **Bosque y Reloj**, debajo del árbol, marca qué días de la semana estudias:
- 🌱 **Día de enfoque**: si estudias, el árbol se nutre. Si no, empieza a marchitarse.
- 🌙 **Día de descanso**: el árbol duerme tranquilo. **No pierde salud ni rompe tu racha.**

¿Hoy no puedes? Pulsa el botón **"🌙 Hoy: Día de Enfoque"** de la barra superior para activar una **Pausa Mental** solo por hoy, sin culpa.

### 4. Concéntrate con el reloj ⏱️
1. Elige la **materia** y la **actividad** en la que te vas a concentrar.
2. Elige una modalidad:
   - 🍅 **Pomodoro**: 25 minutos
   - 🌊 **Deep Focus**: 60 minutos
   - ✨ **Personalizado**: los minutos que quieras
3. Pulsa **▶ Iniciar Enfoque**.

Si tienes que parar antes de tiempo, pulsa **✓ Guardar avance** para que los minutos que ya estudiaste cuenten igual.

Debajo del reloj puedes ir marcando los temas del temario mientras estudias.

### 5. Extras
- 🎧 **Sonidos ambientales** (barra lateral): lluvia, ruido cálido y armónicos zen, con control de volumen.
- 📌 **Fijar ventana**: mantiene la app siempre encima de tus PDFs o apuntes.
- ☀️ / 🌙 **Tema**: modo oscuro acogedor o modo claro pergamino.
- 📅 **Calendario**: días estudiados, días de descanso y fechas de examen.
- 📊 **Estadísticas**: horas por semana y por materia, racha e historial. Puedes registrar a mano sesiones que hiciste fuera de la computadora.

---

## 🌳 Estados del árbol

| Estado | Cuándo ocurre |
|---|---|
| 🌸 **Floreciente** | Has sido constante en tus días de enfoque |
| 🌳 **Sano** | Vas bien; una sesión hoy lo mantiene radiante |
| 🍂 **Sediento** | Te saltaste un día de enfoque |
| 🥀 **Marchito** | Llevas varios días de enfoque sin estudiar. Una sola sesión lo hace revivir |
| 🌙 **Descanso** | Hoy es tu día libre o activaste una Pausa Mental |

---

## 💾 ¿Dónde se guardan mis datos?

En tu computadora, en:

```
%APPDATA%\Raices\data\constancia-data.json
```

Para hacer una **copia de seguridad** o pasar tus datos a otra PC, copia ese archivo. Pega `%APPDATA%\Raices` en la barra de direcciones del Explorador de archivos para llegar a la carpeta.

Desinstalar la app **no borra** tus datos. Si quieres eliminarlos, borra esa carpeta a mano.

---

## 👩‍💻 Para desarrolladores y Seguridad

Requisitos: **[Node.js 24 LTS](https://nodejs.org/) (`>= 24.21.0`)**.
- 🔒 **Cero dependencias externas en tiempo de ejecución (`dependencies: {}`):** El ejecutable empaquetado utiliza exclusivamente APIs nativas de Node.js/Electron y del navegador (Web Audio API, SVG, HTTPS nativo), evitando vulnerabilidades de cadena de suministro o *backdoors* de paquetes de terceros.

```bash
# Instalar dependencias de empaquetado
npm install

# Ejecutar suite de pruebas automatizadas
npm test

# Ejecutar en modo desarrollo
npm start

# Generar el instalador de Windows (queda en la carpeta release/)
npm run dist

# Generar una versión portable (.exe sin instalación)
npm run dist:portable
```

> **Nota (npm 11+):** si `npm start` dice que Electron no está instalado, es porque npm bloqueó el script que descarga Electron. Ejecuta `node node_modules/electron/install.js` y vuelve a intentarlo.

### Arquitectura Modular

```
├── main.js                       # Orquestador del proceso principal de Electron
├── preload.js                    # Puente seguro (contextBridge) entre ventana y sistema
├── build/icon.png                # Icono de la aplicación
├── tests/verify.js               # Suite de pruebas automatizadas y verificación de seguridad
└── src/
    ├── index.html                # Estructura base de la aplicación
    ├── styles.css                # Sistema de diseño (Modo Oscuro Acogedor / Claro Pergamino)
    ├── sound-engine.js           # Sintetizador de audio ambiental (Web Audio API)
    ├── tree-renderer.js          # Motor gráfico SVG del Árbol de Constancia
    ├── app.js                    # Controlador ligero de eventos de entrada
    ├── main/                     # Módulos del Proceso Principal (Backend local)
    │   ├── storage.js            # Persistencia segura en %APPDATA%\Raices
    │   ├── updater.js            # Auto-actualizador estilo Discord vía GitHub Releases
    │   └── windows.js            # Gestión de ventana principal y reproductor multimedia
    └── modules/                  # Módulos del Renderer (Frontend y UI desacoplados)
        ├── date-utils.js         # Cálculos de fechas y cuentas regresivas
        ├── state-store.js        # Estado global y algoritmo de racha / salud del árbol
        ├── media-player.js       # Integración con YouTube y Spotify
        ├── focus-timer.js        # Motor del reloj Pomodoro / Deep Focus / Personalizado
        └── ui-views.js           # Módulo dedicado de Interfaz de Usuario (Vistas y Modales)
```

Hecho con [Electron](https://www.electronjs.org/).
