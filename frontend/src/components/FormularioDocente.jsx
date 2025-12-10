import { useState, useEffect } from "react";
import "./FormularioDocente.css";
import DisponibilidadGrid, {
  disponibilidadToArray,
  arrayToDisponibilidad,
  getDefaultDisponibilidad,
} from "./DisponibilidadGrid";

const API_URL = "http://localhost:8000";

function FormularioDocente({ onDocenteAdded, docenteToEdit, onCancel }) {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    numero: "",
    horas_max_semana: "",
    materia_ids: [],
    disponibilidad_horaria: getDefaultDisponibilidad(),
  });
  const [planesEstudios, setPlanesEstudios] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedCuatrimestre, setSelectedCuatrimestre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [materiasExpanded, setMateriasExpanded] = useState(false);
  const [disponibilidadExpanded, setDisponibilidadExpanded] = useState(false);

  useEffect(() => {
    fetchPlanesEstudios();
  }, []);

  useEffect(() => {
    if (docenteToEdit) {
      setFormData({
        nombre: docenteToEdit.nombre || "",
        email: docenteToEdit.email || "",
        numero: docenteToEdit.numero || "",
        horas_max_semana: docenteToEdit.horas_max_semana || "",
        materia_ids: docenteToEdit.materias?.map((m) => m.id) || [],
        disponibilidad_horaria: docenteToEdit.disponibilidad_horaria
          ? arrayToDisponibilidad(docenteToEdit.disponibilidad_horaria)
          : getDefaultDisponibilidad(),
      });
    }
  }, [docenteToEdit]);

  const fetchPlanesEstudios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/planes-estudios`);
      const data = await response.json();
      if (response.ok) {
        setPlanesEstudios(data.planes || []);
      }
    } catch (err) {
      console.error("Error al cargar planes de estudios:", err);
    }
  };

  // Obtener todas las materias de todos los planes (para mostrar las seleccionadas)
  const getAllMaterias = () => {
    const allMaterias = [];
    planesEstudios.forEach((plan) => {
      Object.values(plan.materias_por_cuatrimestre).forEach((materias) => {
        allMaterias.push(...materias);
      });
    });
    return allMaterias;
  };

  // Obtener materias del cuatrimestre seleccionado
  const getMateriasDelCuatrimestre = () => {
    if (!selectedPlan || !selectedCuatrimestre) return [];
    const plan = planesEstudios.find((p) => p.id === selectedPlan);
    if (!plan) return [];
    return plan.materias_por_cuatrimestre[selectedCuatrimestre] || [];
  };

  // Obtener cuatrimestres del plan seleccionado
  const getCuatrimestresDelPlan = () => {
    if (!selectedPlan) return [];
    const plan = planesEstudios.find((p) => p.id === selectedPlan);
    if (!plan) return [];
    return Object.keys(plan.materias_por_cuatrimestre)
      .map(Number)
      .sort((a, b) => a - b);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleMateriaToggle = (materiaId) => {
    setFormData((prev) => ({
      ...prev,
      materia_ids: prev.materia_ids.includes(materiaId)
        ? prev.materia_ids.filter((id) => id !== materiaId)
        : [...prev.materia_ids, materiaId],
    }));
  };

  const handleDisponibilidadChange = (nuevaDisponibilidad) => {
    setFormData((prev) => ({
      ...prev,
      disponibilidad_horaria: nuevaDisponibilidad,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (formData.materia_ids.length === 0) {
      setMessage("Debe seleccionar al menos una materia");
      setLoading(false);
      return;
    }

    // Validar que haya al menos un slot de disponibilidad seleccionado
    const disponibilidadArray = disponibilidadToArray(
      formData.disponibilidad_horaria
    );
    if (disponibilidadArray.length === 0) {
      setMessage("Debe seleccionar al menos un horario de disponibilidad");
      setLoading(false);
      return;
    }

    try {
      const url = docenteToEdit
        ? `${API_URL}/api/maestros/${docenteToEdit.id}`
        : `${API_URL}/api/maestros`;

      const method = docenteToEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          numero: formData.numero,
          horas_max_semana: parseInt(formData.horas_max_semana),
          materia_ids: formData.materia_ids,
          disponibilidad_horaria: disponibilidadToArray(
            formData.disponibilidad_horaria
          ),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          docenteToEdit
            ? "Docente actualizado exitosamente"
            : "Docente agregado exitosamente"
        );
        setFormData({
          nombre: "",
          email: "",
          numero: "",
          horas_max_semana: "",
          materia_ids: [],
          disponibilidad_horaria: getDefaultDisponibilidad(),
        });
        setTimeout(() => {
          if (onDocenteAdded) onDocenteAdded();
        }, 1000);
      } else {
        setMessage(
          `Error: ${
            data.detail ||
            `No se pudo ${docenteToEdit ? "actualizar" : "agregar"} el docente`
          }`
        );
      }
    } catch (error) {
      setMessage(`Error de conexion: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="formulario-docente" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="nombre">Nombre completo</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Ej: Dr. Juan Pérez"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo institucional</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="docente@universidad.edu"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="numero">Número del docente</label>
          <input
            type="text"
            id="numero"
            name="numero"
            value={formData.numero}
            onChange={handleChange}
            disabled={loading}
            placeholder="12345"
          />
        </div>

        <div className="form-group">
          <label htmlFor="horas_max_semana">
            Horas Disponibles por Semana (máx 15)
          </label>
          <input
            type="number"
            id="horas_max_semana"
            name="horas_max_semana"
            value={formData.horas_max_semana}
            onChange={handleChange}
            min="1"
            max="15"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-group collapsible-section">
        <button
          type="button"
          className={`section-header ${materiasExpanded ? "expanded" : ""}`}
          onClick={() => setMateriasExpanded(!materiasExpanded)}
        >
          <span className="section-title">
            <span className="section-icon"></span>
            Materias que puede impartir
            {formData.materia_ids.length > 0 && (
              <span className="section-badge">
                {formData.materia_ids.length}
              </span>
            )}
          </span>
          <span className={`chevron ${materiasExpanded ? "up" : "down"}`}>
            ▼
          </span>
        </button>

        {materiasExpanded && (
          <div className="section-content">
            {/* Mostrar materias seleccionadas */}
            {formData.materia_ids.length > 0 && (
              <div className="materias-seleccionadas">
                <span className="materias-count">
                  {formData.materia_ids.length} materia(s) seleccionada(s)
                </span>
                <div className="materias-tags">
                  {formData.materia_ids.map((id) => {
                    const materia = getAllMaterias().find((m) => m.id === id);
                    return materia ? (
                      <span key={id} className="materia-tag">
                        {materia.nombre}
                        <button
                          type="button"
                          className="remove-materia"
                          onClick={() => handleMateriaToggle(id)}
                          disabled={loading}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Selector jerárquico */}
            <div className="selector-materias">
              {/* Paso 1: Seleccionar Plan de Estudios */}
              <div className="selector-step">
                <label className="step-label">
                  1. Selecciona un Plan de Estudios
                </label>
                <div className="planes-grid">
                  {planesEstudios.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={`plan-btn ${
                        selectedPlan === plan.id ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedPlan(plan.id);
                        setSelectedCuatrimestre(null);
                      }}
                      disabled={loading}
                    >
                      <span className="plan-nombre">{plan.nombre}</span>
                      <span className="plan-info">
                        {plan.total_materias} materias
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 2: Seleccionar Cuatrimestre */}
              {selectedPlan && (
                <div className="selector-step">
                  <label className="step-label">
                    2. Selecciona un Cuatrimestre
                  </label>
                  <div className="cuatrimestres-grid">
                    {getCuatrimestresDelPlan().map((cuatri) => (
                      <button
                        key={cuatri}
                        type="button"
                        className={`cuatri-btn ${
                          selectedCuatrimestre === cuatri ? "active" : ""
                        }`}
                        onClick={() => setSelectedCuatrimestre(cuatri)}
                        disabled={loading}
                      >
                        <span className="cuatri-numero">{cuatri}°</span>
                        <span className="cuatri-label">Cuatrimestre</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 3: Seleccionar Materias */}
              {selectedPlan && selectedCuatrimestre && (
                <div className="selector-step">
                  <label className="step-label">
                    3. Selecciona las Materias
                  </label>
                  <div className="checkbox-grid">
                    {getMateriasDelCuatrimestre().map((materia) => (
                      <label key={materia.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.materia_ids.includes(materia.id)}
                          onChange={() => handleMateriaToggle(materia.id)}
                          disabled={loading}
                        />
                        <span>{materia.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="form-group collapsible-section">
        <button
          type="button"
          className={`section-header ${
            disponibilidadExpanded ? "expanded" : ""
          }`}
          onClick={() => setDisponibilidadExpanded(!disponibilidadExpanded)}
        >
          <span className="section-title">
            <span className="section-icon"></span>
            Disponibilidad Horaria
            {disponibilidadToArray(formData.disponibilidad_horaria).length >
              0 && (
              <span className="section-badge">
                {disponibilidadToArray(formData.disponibilidad_horaria).length}{" "}
                slots
              </span>
            )}
          </span>
          <span className={`chevron ${disponibilidadExpanded ? "up" : "down"}`}>
            ▼
          </span>
        </button>

        {disponibilidadExpanded && (
          <div className="section-content disponibilidad-section">
            <p className="disponibilidad-hint">
              Selecciona los horarios en los que el docente puede dar clases.
              Verde = Disponible, Blanco = No disponible.
            </p>
            <DisponibilidadGrid
              disponibilidad={formData.disponibilidad_horaria}
              onChange={handleDisponibilidadChange}
              disabled={loading}
            />
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading
            ? "Guardando..."
            : docenteToEdit
            ? "Actualizar Docente"
            : "Guardar Docente"}
        </button>
        {docenteToEdit && onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>

      {message && (
        <div
          className={`message ${
            message.includes("exitosamente") ? "success" : "error"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}

export default FormularioDocente;
