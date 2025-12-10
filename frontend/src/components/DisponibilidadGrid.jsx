import { useState, useEffect } from "react";
import "./DisponibilidadGrid.css";

// Definición de los slots de tiempo según las imágenes
const SLOTS_MATUTINO = [
  { id: 0, label: "7:00-7:55", horaInicio: 7, horaFin: 8 },
  { id: 1, label: "7:55-8:50", horaInicio: 8, horaFin: 9 },
  { id: 2, label: "8:50-9:45", horaInicio: 9, horaFin: 10 },
  { id: 3, label: "9:45-10:40", horaInicio: 10, horaFin: 11 },
  { id: 4, label: "11:10-12:05", horaInicio: 11, horaFin: 12 },
  { id: 5, label: "12:05-13:00", horaInicio: 12, horaFin: 13 },
  { id: 6, label: "13:00-13:55", horaInicio: 13, horaFin: 14 },
];

const SLOTS_VESPERTINO = [
  { id: 7, label: "14:00-14:55", horaInicio: 14, horaFin: 15 },
  { id: 8, label: "14:55-15:50", horaInicio: 15, horaFin: 16 },
  { id: 9, label: "15:50-16:45", horaInicio: 16, horaFin: 17 },
  { id: 10, label: "16:45-17:40", horaInicio: 17, horaFin: 18 },
  { id: 11, label: "18:00-18:55", horaInicio: 18, horaFin: 19 },
  { id: 12, label: "18:55-19:50", horaInicio: 19, horaFin: 20 },
  { id: 13, label: "19:50-20:45", horaInicio: 20, horaFin: 21 },
];

const DIAS_SEMANA = [
  { id: 0, label: "L", nombre: "Lunes" },
  { id: 1, label: "M", nombre: "Martes" },
  { id: 2, label: "Mi", nombre: "Miércoles" },
  { id: 3, label: "J", nombre: "Jueves" },
  { id: 4, label: "V", nombre: "Viernes" },
];

function DisponibilidadGrid({ disponibilidad, onChange, disabled }) {
  // disponibilidad es un objeto: { "dia_slot": true/false }
  // Ejemplo: { "0_0": true, "0_1": true, "1_0": false, ... }
  // donde la clave es "dia_slot" (dia 0-4, slot 0-13)

  const [localDisponibilidad, setLocalDisponibilidad] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(true);

  useEffect(() => {
    if (disponibilidad) {
      setLocalDisponibilidad(disponibilidad);
    }
  }, [disponibilidad]);

  const toggleCell = (dia, slotId) => {
    if (disabled) return;

    const key = `${dia}_${slotId}`;
    const newValue = !localDisponibilidad[key];

    const newDisponibilidad = {
      ...localDisponibilidad,
      [key]: newValue,
    };

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const handleMouseDown = (dia, slotId) => {
    if (disabled) return;
    setIsDragging(true);
    const key = `${dia}_${slotId}`;
    const newValue = !localDisponibilidad[key];
    setDragValue(newValue);

    const newDisponibilidad = {
      ...localDisponibilidad,
      [key]: newValue,
    };

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const handleMouseEnter = (dia, slotId) => {
    if (!isDragging || disabled) return;

    const key = `${dia}_${slotId}`;
    const newDisponibilidad = {
      ...localDisponibilidad,
      [key]: dragValue,
    };

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const selectAllTurno = (slots) => {
    if (disabled) return;
    const newDisponibilidad = { ...localDisponibilidad };

    DIAS_SEMANA.forEach((dia) => {
      slots.forEach((slot) => {
        newDisponibilidad[`${dia.id}_${slot.id}`] = true;
      });
    });

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const clearAllTurno = (slots) => {
    if (disabled) return;
    const newDisponibilidad = { ...localDisponibilidad };

    DIAS_SEMANA.forEach((dia) => {
      slots.forEach((slot) => {
        newDisponibilidad[`${dia.id}_${slot.id}`] = false;
      });
    });

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const selectAllDay = (diaId) => {
    if (disabled) return;
    const newDisponibilidad = { ...localDisponibilidad };

    [...SLOTS_MATUTINO, ...SLOTS_VESPERTINO].forEach((slot) => {
      newDisponibilidad[`${diaId}_${slot.id}`] = true;
    });

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const clearAllDay = (diaId) => {
    if (disabled) return;
    const newDisponibilidad = { ...localDisponibilidad };

    [...SLOTS_MATUTINO, ...SLOTS_VESPERTINO].forEach((slot) => {
      newDisponibilidad[`${diaId}_${slot.id}`] = false;
    });

    setLocalDisponibilidad(newDisponibilidad);
    onChange(newDisponibilidad);
  };

  const renderGrid = (slots, titulo) => (
    <div className="disponibilidad-turno">
      <div className="turno-header">
        <h4>{titulo}</h4>
        <div className="turno-actions">
          <button
            type="button"
            className="btn-select-all"
            onClick={() => selectAllTurno(slots)}
            disabled={disabled}
          >
            Todo
          </button>
          <button
            type="button"
            className="btn-clear-all"
            onClick={() => clearAllTurno(slots)}
            disabled={disabled}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="grid-container">
        {/* Header con días */}
        <div className="grid-header">
          <div className="hora-label"></div>
          {DIAS_SEMANA.map((dia) => (
            <div key={dia.id} className="dia-header">
              <span className="dia-label">{dia.label}</span>
              <div className="dia-actions">
                <button
                  type="button"
                  className="btn-dia-select"
                  onClick={() => selectAllDay(dia.id)}
                  disabled={disabled}
                  title={`Seleccionar todo ${dia.nombre}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Filas de horas */}
        {slots.map((slot) => (
          <div key={slot.id} className="grid-row">
            <div className="hora-label">{slot.label}</div>
            {DIAS_SEMANA.map((dia) => {
              const key = `${dia.id}_${slot.id}`;
              const isAvailable = localDisponibilidad[key] === true;

              return (
                <div
                  key={key}
                  className={`grid-cell ${
                    isAvailable ? "available" : "unavailable"
                  }`}
                  onMouseDown={() => handleMouseDown(dia.id, slot.id)}
                  onMouseEnter={() => handleMouseEnter(dia.id, slot.id)}
                  title={`${dia.nombre} ${slot.label} - ${
                    isAvailable ? "Disponible" : "No disponible"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="disponibilidad-grid-wrapper">
      <div className="disponibilidad-legend">
        <span className="legend-item">
          <span className="legend-box available"></span> Disponible
        </span>
        <span className="legend-item">
          <span className="legend-box unavailable"></span> No disponible
        </span>
        <span className="legend-hint">(Clic o arrastra para seleccionar)</span>
      </div>

      <div className="disponibilidad-grids">
        {renderGrid(SLOTS_MATUTINO, "Turno Matutino")}
        {renderGrid(SLOTS_VESPERTINO, "Turno Vespertino")}
      </div>
    </div>
  );
}

// Funciones de utilidad para convertir entre formatos
export const disponibilidadToArray = (disponibilidadObj) => {
  // Convierte el objeto de disponibilidad a un array para el backend
  // Formato: [{ dia: 0, slot: 0, hora_inicio: 7, hora_fin: 8 }, ...]
  const slots = [...SLOTS_MATUTINO, ...SLOTS_VESPERTINO];
  const result = [];

  Object.entries(disponibilidadObj).forEach(([key, value]) => {
    if (value === true) {
      const [dia, slotId] = key.split("_").map(Number);
      const slot = slots.find((s) => s.id === slotId);
      if (slot) {
        result.push({
          dia_semana: dia,
          slot_id: slotId,
          hora_inicio: slot.horaInicio,
          hora_fin: slot.horaFin,
        });
      }
    }
  });

  return result;
};

export const arrayToDisponibilidad = (disponibilidadArray) => {
  // Convierte el array del backend al objeto para el grid
  const result = {};

  if (Array.isArray(disponibilidadArray)) {
    disponibilidadArray.forEach((item) => {
      const key = `${item.dia_semana}_${item.slot_id}`;
      result[key] = true;
    });
  }

  return result;
};

export const getDefaultDisponibilidad = () => {
  // Retorna disponibilidad por defecto (todo el día disponible)
  const result = {};
  const allSlots = [...SLOTS_MATUTINO, ...SLOTS_VESPERTINO];

  DIAS_SEMANA.forEach((dia) => {
    allSlots.forEach((slot) => {
      result[`${dia.id}_${slot.id}`] = true;
    });
  });

  return result;
};

export { SLOTS_MATUTINO, SLOTS_VESPERTINO, DIAS_SEMANA };

export default DisponibilidadGrid;
