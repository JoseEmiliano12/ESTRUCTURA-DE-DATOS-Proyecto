import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./GenerarHorario.css";

const API_URL = "http://localhost:8000";

// Cuatrimestres de estadía (no tienen horario)
const CUATRIMESTRES_ESTADIA = [6, 10];

function GenerarHorario() {
  const navigate = useNavigate();
  const [maestros, setMaestros] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [formData, setFormData] = useState({
    plan_id: "",
    maestro_ids: [],
    turno: "Matutino",
    grupos_default: 2, // Valor por defecto para todos los cuatrimestres
  });
  const [gruposPorCuatri, setGruposPorCuatri] = useState({}); // {1: 2, 2: 3, 3: 2, ...}
  const [modoPersonalizado, setModoPersonalizado] = useState(false);
  const [cuatrimestresSeleccionados, setCuatrimestresSeleccionados] = useState(
    []
  ); // Cuatrimestres a generar
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [horarioGenerado, setHorarioGenerado] = useState(null);
  const [searchDocente, setSearchDocente] = useState("");

  useEffect(() => {
    fetchMaestros();
    fetchPlanes();
  }, []);

  const fetchMaestros = async () => {
    try {
      const response = await fetch(`${API_URL}/api/maestros`);
      const data = await response.json();
      if (response.ok) {
        setMaestros(data.maestros || []);
      }
    } catch (err) {
      console.error("Error al cargar maestros:", err);
    }
  };

  const fetchPlanes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/planes-estudios`);
      const data = await response.json();
      if (response.ok) {
        setPlanes(data.planes || []);
      }
    } catch (err) {
      console.error("Error al cargar planes:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Filtrar maestros según el plan seleccionado y la búsqueda
  const getDocentesFiltrados = () => {
    let filtrados = maestros;

    // Filtrar por plan de estudios si hay uno seleccionado
    if (formData.plan_id) {
      const planId = parseInt(formData.plan_id);
      filtrados = filtrados.filter((m) =>
        m.materias?.some((mat) => mat.plan_estudios_id === planId)
      );
    }

    // Filtrar por búsqueda
    if (searchDocente.trim()) {
      const search = searchDocente.toLowerCase();
      filtrados = filtrados.filter(
        (m) =>
          m.nombre?.toLowerCase().includes(search) ||
          m.email?.toLowerCase().includes(search)
      );
    }

    return filtrados;
  };

  // Toggle selección de un docente
  const toggleDocente = (id) => {
    const idStr = id.toString();
    if (formData.maestro_ids.includes(idStr)) {
      setFormData({
        ...formData,
        maestro_ids: formData.maestro_ids.filter((mId) => mId !== idStr),
      });
    } else {
      setFormData({
        ...formData,
        maestro_ids: [...formData.maestro_ids, idStr],
      });
    }
  };

  // Seleccionar todos los docentes filtrados
  const seleccionarTodos = () => {
    const docentesFiltrados = getDocentesFiltrados();
    const idsActuales = new Set(formData.maestro_ids);
    docentesFiltrados.forEach((m) => idsActuales.add(m.id.toString()));
    setFormData({
      ...formData,
      maestro_ids: Array.from(idsActuales),
    });
  };

  // Deseleccionar todos los docentes filtrados
  const deseleccionarTodos = () => {
    const docentesFiltrados = getDocentesFiltrados();
    const idsARemover = new Set(docentesFiltrados.map((m) => m.id.toString()));
    setFormData({
      ...formData,
      maestro_ids: formData.maestro_ids.filter((id) => !idsARemover.has(id)),
    });
  };

  const getPlanSeleccionado = () => {
    return planes.find((p) => p.id === parseInt(formData.plan_id));
  };

  // Calcular cuatrimestres disponibles (excluyendo estadias)
  const getCuatrimestresDisponibles = () => {
    const plan = getPlanSeleccionado();
    if (!plan) return [];
    const cuatrimestres = [];
    for (let i = 1; i <= plan.total_cuatrimestres; i++) {
      if (!CUATRIMESTRES_ESTADIA.includes(i)) {
        cuatrimestres.push(i);
      }
    }
    return cuatrimestres;
  };

  // Cuatrimestres que realmente se generarán (los seleccionados)
  const getCuatrimestresAGenerar = () => {
    return cuatrimestresSeleccionados.sort((a, b) => a - b);
  };

  // Toggle selección de cuatrimestre
  const toggleCuatrimestre = (cuatri) => {
    if (cuatrimestresSeleccionados.includes(cuatri)) {
      setCuatrimestresSeleccionados(
        cuatrimestresSeleccionados.filter((c) => c !== cuatri)
      );
    } else {
      setCuatrimestresSeleccionados([...cuatrimestresSeleccionados, cuatri]);
    }
  };

  // Seleccionar todos los cuatrimestres
  const seleccionarTodosCuatris = () => {
    setCuatrimestresSeleccionados([...getCuatrimestresDisponibles()]);
  };

  // Limpiar selección
  const limpiarSeleccionCuatris = () => {
    setCuatrimestresSeleccionados([]);
  };

  // Al cambiar de plan, seleccionar todos los cuatrimestres automáticamente
  useEffect(() => {
    if (formData.plan_id) {
      const plan = planes.find((p) => p.id === parseInt(formData.plan_id));
      if (plan) {
        const cuatris = [];
        for (let i = 1; i <= plan.total_cuatrimestres; i++) {
          if (!CUATRIMESTRES_ESTADIA.includes(i)) {
            cuatris.push(i);
          }
        }
        setCuatrimestresSeleccionados(cuatris);
      }
    } else {
      setCuatrimestresSeleccionados([]);
    }
  }, [formData.plan_id, planes]);

  // Inicializar grupos por cuatrimestre cuando cambia el plan
  useEffect(() => {
    const cuatrimestres = getCuatrimestresDisponibles();
    if (cuatrimestres.length > 0) {
      const gruposIniciales = {};
      cuatrimestres.forEach((c) => {
        gruposIniciales[c] = formData.grupos_default;
      });
      setGruposPorCuatri(gruposIniciales);
    }
  }, [formData.plan_id, formData.grupos_default]);

  // Cambiar grupos de un cuatrimestre específico
  const handleGruposCuatriChange = (cuatrimestre, valor) => {
    setGruposPorCuatri((prev) => ({
      ...prev,
      [cuatrimestre]: parseInt(valor) || 1,
    }));
  };

  // Calcular total de grupos
  const getTotalGrupos = () => {
    const cuatrimestres = getCuatrimestresAGenerar();
    if (modoPersonalizado) {
      return cuatrimestres.reduce(
        (sum, c) => sum + (gruposPorCuatri[c] || formData.grupos_default),
        0
      );
    }
    return cuatrimestres.length * formData.grupos_default;
  };

  const handleGenerar = async (e) => {
    e.preventDefault();

    if (!formData.plan_id) {
      setMessage("Por favor seleccione un plan de estudios");
      return;
    }

    if (formData.maestro_ids.length === 0) {
      setMessage("Por favor seleccione al menos un docente");
      return;
    }

    const cuatrisAGenerar = getCuatrimestresAGenerar();
    if (cuatrisAGenerar.length === 0) {
      setMessage("Por favor seleccione al menos un cuatrimestre");
      return;
    }

    const plan = getPlanSeleccionado();

    setLoading(true);
    setMessage("");
    setHorarioGenerado(null);

    try {
      const requestBody = {
        plan_id: parseInt(formData.plan_id),
        maestro_ids: formData.maestro_ids.map((id) => parseInt(id)),
        cuatrimestres_seleccionados: cuatrimestresSeleccionados, // Enviar cuatrimestres seleccionados
        grupos_generar: parseInt(formData.grupos_default),
        grupos_por_cuatrimestre: modoPersonalizado ? gruposPorCuatri : {},
        turno: formData.turno,
      };

      const response = await fetch(`${API_URL}/api/generar-horario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`${data.message}`);
        setHorarioGenerado(data);
        setTimeout(() => {
          navigate("/consultar-horario");
        }, 2000);
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (error) {
      setMessage(`Error de conexion: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const planSeleccionado = getPlanSeleccionado();

  return (
    <div className="generar-horario-page">
      <div className="generar-container">
        <h1>Generar Horario por Plan de Estudios</h1>

        <div className="form-card">
          <form onSubmit={handleGenerar}>
            {/* Seleccion de Plan de Estudios */}
            <div className="form-group">
              <label htmlFor="plan_id">Plan de Estudios</label>
              <select
                id="plan_id"
                name="plan_id"
                value={formData.plan_id}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Seleccione un plan</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} - {plan.descripcion}
                  </option>
                ))}
              </select>
              {planes.length === 0 && (
                <small className="field-hint warning">
                  No hay planes de estudio. Vaya a Plan de Estudios para crear
                  uno.
                </small>
              )}
            </div>

            {/* Selector de cuatrimestres a generar */}
            {planSeleccionado && (
              <div className="cuatrimestres-selector">
                <div className="cuatrimestres-selector-header">
                  <h3>Cuatrimestres a generar</h3>
                  <span className="cuatrimestres-count">
                    {cuatrimestresSeleccionados.length} de{" "}
                    {getCuatrimestresDisponibles().length}
                  </span>
                </div>

                {/* Botones de selección masiva */}
                <div className="cuatrimestres-actions">
                  <button
                    type="button"
                    className="btn-select-all-cuatri"
                    onClick={seleccionarTodosCuatris}
                    disabled={
                      loading ||
                      cuatrimestresSeleccionados.length ===
                        getCuatrimestresDisponibles().length
                    }
                  >
                    Seleccionar todos
                  </button>
                  <button
                    type="button"
                    className="btn-deselect-all-cuatri"
                    onClick={limpiarSeleccionCuatris}
                    disabled={
                      loading || cuatrimestresSeleccionados.length === 0
                    }
                  >
                    Limpiar selección
                  </button>
                </div>

                {/* Lista de cuatrimestres con checkboxes */}
                <div className="cuatrimestres-checkbox-grid">
                  {getCuatrimestresDisponibles().map((c) => (
                    <label
                      key={c}
                      className={`cuatrimestre-checkbox-item ${
                        cuatrimestresSeleccionados.includes(c)
                          ? "selected"
                          : "unselected"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={cuatrimestresSeleccionados.includes(c)}
                        onChange={() => toggleCuatrimestre(c)}
                        disabled={loading}
                      />
                      <span className="cuatri-label">Cuatrimestre {c}</span>
                    </label>
                  ))}
                </div>

                <p className="info-estadias">
                  Cuatrimestres {CUATRIMESTRES_ESTADIA.join(" y ")} son de
                  estadía (sin horario)
                </p>
              </div>
            )}

            {/* Selección de Docentes mejorada */}
            <div className="docentes-selector">
              <div className="docentes-selector-header">
                <label>Docentes Disponibles</label>
                <span className="docentes-count">
                  {formData.maestro_ids.length} seleccionado
                  {formData.maestro_ids.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Buscador de docentes */}
              <div className="docentes-search">
                <input
                  type="text"
                  placeholder="Buscar docente por nombre o email..."
                  value={searchDocente}
                  onChange={(e) => setSearchDocente(e.target.value)}
                  disabled={loading}
                />
                {searchDocente && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchDocente("")}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Botones de selección masiva */}
              <div className="docentes-actions">
                <button
                  type="button"
                  className="btn-select-all"
                  onClick={seleccionarTodos}
                  disabled={loading || getDocentesFiltrados().length === 0}
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  className="btn-deselect-all"
                  onClick={deseleccionarTodos}
                  disabled={loading || formData.maestro_ids.length === 0}
                >
                  Deseleccionar todos
                </button>
              </div>

              {/* Lista de docentes con checkboxes */}
              <div className="docentes-list-container">
                {getDocentesFiltrados().length === 0 ? (
                  <div className="docentes-empty">
                    {searchDocente
                      ? "No se encontraron docentes con ese criterio"
                      : formData.plan_id
                      ? "No hay docentes asignados a este plan de estudios"
                      : "No hay docentes registrados"}
                  </div>
                ) : (
                  <div className="docentes-checkbox-list">
                    {getDocentesFiltrados().map((maestro) => (
                      <label
                        key={maestro.id}
                        className={`docente-checkbox-item ${
                          formData.maestro_ids.includes(maestro.id.toString())
                            ? "selected"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.maestro_ids.includes(
                            maestro.id.toString()
                          )}
                          onChange={() => toggleDocente(maestro.id)}
                          disabled={loading}
                        />
                        <div className="docente-info">
                          <span className="docente-nombre">
                            {maestro.nombre}
                          </span>
                          {maestro.materias && maestro.materias.length > 0 && (
                            <span className="docente-materias">
                              {maestro.materias.length} materia
                              {maestro.materias.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {formData.plan_id && (
                <small className="field-hint">
                  Mostrando docentes asignados al plan seleccionado
                </small>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="turno">Turno</label>
                <select
                  id="turno"
                  name="turno"
                  value={formData.turno}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="Matutino">Matutino (7:00 - 14:00)</option>
                  <option value="Vespertino">Vespertino (14:00 - 22:00)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="grupos_default">Grupos por Cuatrimestre</label>
                <input
                  type="number"
                  id="grupos_default"
                  name="grupos_default"
                  value={formData.grupos_default}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Toggle para modo personalizado */}
            {planSeleccionado && (
              <div className="modo-personalizado-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={modoPersonalizado}
                    onChange={(e) => setModoPersonalizado(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="toggle-text">
                    Personalizar grupos por cuatrimestre
                  </span>
                </label>
              </div>
            )}

            {/* Selector de grupos por cuatrimestre */}
            {planSeleccionado && modoPersonalizado && (
              <div className="grupos-por-cuatri-container">
                <h4>Grupos por cada cuatrimestre:</h4>
                <div className="grupos-grid">
                  {getCuatrimestresAGenerar().map((cuatri) => (
                    <div key={cuatri} className="grupo-cuatri-item">
                      <label>Cuatri {cuatri}:</label>
                      <input
                        type="number"
                        value={
                          gruposPorCuatri[cuatri] || formData.grupos_default
                        }
                        onChange={(e) =>
                          handleGruposCuatriChange(cuatri, e.target.value)
                        }
                        min="1"
                        max="10"
                        disabled={loading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {planSeleccionado && (
              <div className="preview-grupos">
                <small>
                  Se generarán <strong>{getTotalGrupos()}</strong> grupos en
                  total
                  {modoPersonalizado && (
                    <span className="grupos-detalle">
                      {" "}
                      (
                      {getCuatrimestresAGenerar()
                        .map(
                          (c) =>
                            `C${c}: ${
                              gruposPorCuatri[c] || formData.grupos_default
                            }`
                        )
                        .join(", ")}
                      )
                    </span>
                  )}
                </small>
              </div>
            )}

            <button
              type="submit"
              className="btn-crear-horario"
              disabled={loading}
            >
              {loading
                ? "Generando horarios..."
                : "Generar Horarios de Todo el Plan"}
            </button>
          </form>

          {message && (
            <div
              className={`message ${
                message.includes("Error") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenerarHorario;
