import { useState, useEffect } from "react";
import FormularioDocente from "../components/FormularioDocente";
import DocenteCard from "../components/DocenteCard";
import MaestrosUpload from "../components/MaestrosUpload";
import "./Docentes.css";

const API_URL = "http://localhost:8000";

function Docentes() {
  const [maestros, setMaestros] = useState([]);
  const [planesEstudios, setPlanesEstudios] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDocente, setEditingDocente] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [puedeEliminar, setPuedeEliminar] = useState(true);
  const [minimoMaestros, setMinimoMaestros] = useState(40);
  const [maestrosPorGrupoExtra, setMaestrosPorGrupoExtra] = useState(3);
  const [mensajeGrupos, setMensajeGrupos] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar maestros según el plan de estudios seleccionado y el término de búsqueda
  const filteredMaestros = maestros.filter((maestro) => {
    // Primero filtrar por plan de estudios
    if (selectedPlan) {
      const tienePlan = maestro.materias?.some(
        (m) => m.plan_estudios_id === selectedPlan
      );
      if (!tienePlan) return false;
    }

    // Luego filtrar por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        maestro.nombre?.toLowerCase().includes(search) ||
        maestro.email?.toLowerCase().includes(search) ||
        maestro.numero?.toLowerCase().includes(search) ||
        maestro.materias?.some((m) => m.nombre?.toLowerCase().includes(search))
      );
    }

    return true;
  });

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

  const fetchMaestros = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/maestros`);
      const data = await response.json();
      if (response.ok) {
        setMaestros(data.maestros || []);
        setPuedeEliminar(data.puede_eliminar ?? true);
        setMinimoMaestros(data.minimo_maestros ?? 40);
        setMaestrosPorGrupoExtra(data.maestros_por_grupo_extra ?? 3);
        setMensajeGrupos(data.mensaje_grupos ?? "");
      }
    } catch (err) {
      console.error("Error al cargar maestros:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocenteAdded = () => {
    setRefreshKey((prev) => prev + 1);
    fetchMaestros();
    setShowForm(false);
    setEditingDocente(null);
  };

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    fetchMaestros();
  };

  const handleEdit = (docente) => {
    setEditingDocente(docente);
    setShowForm(true);
  };

  const handleDelete = async (docenteId) => {
    if (!puedeEliminar) {
      alert(
        `No se puede eliminar. Se requiere un mínimo de ${minimoMaestros} maestros para cubrir todos los horarios.`
      );
      return;
    }

    if (!window.confirm("¿Está seguro de eliminar este docente?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/maestros/${docenteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Docente eliminado exitosamente");
        fetchMaestros();
      } else {
        const data = await response.json();
        alert(`Error: ${data.detail || "No se pudo eliminar el docente"}`);
      }
    } catch (err) {
      alert(`Error de conexion: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingDocente(null);
  };

  useEffect(() => {
    fetchMaestros();
    fetchPlanesEstudios();
  }, [refreshKey]);

  return (
    <div className="docentes-page">
      <div className="docentes-container">
        <div className="docentes-header">
          <h1>Gestión de Docentes</h1>
          {!showForm && (
            <button
              className="btn-agregar-docente"
              onClick={() => {
                setShowForm(true);
                setEditingDocente(null);
              }}
            >
              + Agregar Docente
            </button>
          )}
        </div>

        {/* Formularios - se muestran en lugar de la lista */}
        {showForm ? (
          <>
            <div className="form-section">
              <div className="form-section-header">
                <h2>
                  {editingDocente
                    ? "Editar Docente"
                    : "Ingrese los datos del nuevo Docente"}
                </h2>
                <button className="btn-cerrar-form" onClick={handleCancelEdit}>
                  X Cerrar
                </button>
              </div>
              <FormularioDocente
                onDocenteAdded={handleDocenteAdded}
                docenteToEdit={editingDocente}
                onCancel={handleCancelEdit}
              />
            </div>

            {!editingDocente && (
              <div className="upload-section">
                <h2>O cargue multiples docentes desde CSV</h2>
                <MaestrosUpload onUploadSuccess={handleUploadSuccess} />
              </div>
            )}
          </>
        ) : (
          /* Lista de docentes - solo se muestra cuando no hay formulario */
          <div className="docentes-list-section">
            {/* Selector de Plan de Estudios */}
            <div className="plan-selector">
              <span className="plan-selector-label">
                Filtrar por Plan de Estudios:
              </span>
              <div className="plan-buttons">
                <button
                  type="button"
                  className={`plan-filter-btn ${
                    selectedPlan === null ? "active" : ""
                  }`}
                  onClick={() => setSelectedPlan(null)}
                >
                  Todos
                </button>
                {planesEstudios.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={`plan-filter-btn ${
                      selectedPlan === plan.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="docentes-list-header">
              <h2>
                Docentes{" "}
                {selectedPlan
                  ? `de ${
                      planesEstudios.find((p) => p.id === selectedPlan)
                        ?.nombre || ""
                    }`
                  : "Registrados"}{" "}
                ({filteredMaestros.length})
              </h2>

              {/* Buscador */}
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar por nombre, email, número o materia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchTerm("")}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Mostrar resultados de búsqueda */}
            {searchTerm && (
              <div className="search-results-info">
                Se encontraron <strong>{filteredMaestros.length}</strong>{" "}
                docente(s)
                {filteredMaestros.length !== maestros.length && (
                  <span> de {maestros.length} totales</span>
                )}
              </div>
            )}

            {loading ? (
              <div className="loading">Cargando docentes...</div>
            ) : maestros.length === 0 ? (
              <p className="empty-state">
                No hay docentes registrados. Agregue uno usando el botón
                "Agregar Docente".
              </p>
            ) : filteredMaestros.length === 0 ? (
              <p className="empty-state">
                No se encontraron docentes con "{searchTerm}". Intenta con otro
                término.
              </p>
            ) : (
              <div className="docentes-grid">
                {filteredMaestros.map((maestro) => (
                  <DocenteCard
                    key={maestro.id}
                    docente={maestro}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    puedeEliminar={puedeEliminar}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Docentes;
