# Ejecutar la Visualización de Matrices 3D

## Opción 1: Abrir Directamente

1. **Haz doble clic** en el archivo `visualizacion_matrices_3d.html`
   - Se abrirá automáticamente en tu navegador predeterminado

2. **¡Listo!** La visualización debería estar funcionando

---

## Cómo Usar la Visualización

### Controles Principales

- **▶️ Iniciar Simulación**: Comienza la animación automática
- **⏸️ Pausar**: Detiene la animación
- **⏭️ Siguiente Paso**: Avanza un paso a la vez (modo manual)
- **🔄 Reiniciar**: Vuelve al inicio

### Características Interactivas

1. **Seleccionar Maestros/Grupos**: 
   - Haz clic en los botones de nombres para ver diferentes maestros o grupos
   - Cada uno tiene su propia vista de la matriz 3D

2. **Control de Velocidad**:
   - Usa el slider para ajustar la velocidad de la animación
   - Desde 0.1x (muy lento) hasta 2x (rápido)

3. **Información en Tiempo Real**:
   - **Paso Actual**: Qué asignación se está procesando
   - **Asignaciones Totales**: Total de clases a asignar
   - **Ocupación**: Porcentaje de slots ocupados

4. **Hover sobre Slots**:
   - Pasa el mouse sobre cualquier slot de tiempo para ver detalles

### Qué Observar

1. **Matrices Vacías** (inicio):
   - Todos los slots en gris = libres

2. **Durante la Simulación**:
   - Los slots se van llenando con gradiente rosa/rojo
   - Animación de "llenado" cuando se asigna
   - Información detallada de cada asignación

3. **Operaciones en la Matriz**:
   - Verás el código exacto que se ejecuta:
   - `ocupacion_maestros[dia][hora][maestro_id] = 1`
   - `ocupacion_grupos[dia][hora][grupo_id] = 1`

---

## Lo Que Verás

### Panel Izquierdo: Matriz de Maestros
- Muestra la ocupación de UN maestro a la vez
- Selecciona diferentes maestros para ver su horario individual
- Cada columna = un día (Lunes a Viernes)
- Cada fila = una hora (7:00 a 14:00)

### Panel Derecho: Matriz de Grupos
- Muestra la ocupación de UN grupo a la vez
- Selecciona diferentes grupos para ver su horario
- Misma estructura: días × horas

### Panel Inferior: Información
- Estadísticas en tiempo real
- Descripción del paso actual
- Código de la operación en la matriz
- Controles de reproducción

---

## Qué Representa Cada Color

- **Gris Claro**: Slot libre (valor = 0 en la matriz)
- **Rosa/Rojo Gradiente**: Slot ocupado (valor = 1 en la matriz)
- **Borde Dorado Brillante**: Slot que se está asignando en este momento

---
