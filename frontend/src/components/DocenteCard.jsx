import { useState } from "react";
import "./DocenteCard.css";

function DocenteCard({ docente, onEdit, onDelete, puedeEliminar = true }) {
  const [expanded, setExpanded] = useState(false);
  const diasSemana = ["Lun", "Mar", "Mie", "Jue", "Vie"];

  const materiasCount = docente.materias?.length || 0;

  return (
    <div className={`docente-card ${expanded ? "expanded" : "collapsed"}`}>
      {/* Header clickeable para expandir/contraer */}
      <div
        className="docente-card-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="header-title">
          <h3 title={docente.nombre}>{docente.nombre}</h3>
          {docente.numero && (
            <span className="docente-numero">#{docente.numero}</span>
          )}
        </div>
        <span className={`expand-icon ${expanded ? "up" : "down"}`}>▼</span>
      </div>

      {/* Botones siempre visibles */}
      <div className="card-actions">
        <button
          className="btn-action btn-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(docente);
          }}
          title="Editar docente"
        >
          Editar
        </button>
        <button
          className={`btn-action btn-delete ${
            !puedeEliminar ? "disabled" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(docente.id);
          }}
          title={
            puedeEliminar
              ? "Eliminar docente"
              : "No se puede eliminar - mínimo de maestros requerido"
          }
          disabled={!puedeEliminar}
          style={!puedeEliminar ? { opacity: 0.5, cursor: "not-allowed" } : {}}
        >
          Eliminar
        </button>
      </div>

      {/* Info básica siempre visible */}
      <div className="docente-card-basic">
        <div className="docente-info">
          <span className="info-label">Correo</span>
          <span className="info-value">{docente.email}</span>
        </div>

        <div className="docente-info">
          <span className="info-label">Horas/semana</span>
          <span className="info-value">{docente.horas_max_semana}hrs</span>
        </div>
      </div>

      {/* Contenido expandible - solo materias y días */}
      {expanded && (
        <div className="docente-card-body">
          {docente.materias && docente.materias.length > 0 && (
            <div className="docente-info-full">
              <span className="info-label">Materias ({materiasCount})</span>
              <div className="materias-list">
                {docente.materias.map((materia, idx) => (
                  <span key={idx} className="materia-tag">
                    {materia.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {docente.dias_disponibles && docente.dias_disponibles.length > 0 && (
            <div className="docente-info-full">
              <span className="info-label">Días disponibles</span>
              <div className="dias-list">
                {diasSemana.map((dia, idx) => (
                  <span
                    key={idx}
                    className={`dia-badge ${
                      docente.dias_disponibles.includes(idx)
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    {dia}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocenteCard;
