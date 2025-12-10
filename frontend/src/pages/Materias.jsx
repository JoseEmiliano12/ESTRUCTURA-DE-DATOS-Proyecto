import { useState, useEffect } from "react";
import "./Materias.css";

const API_URL = "http://localhost:8000";

// Plan de estudios LITI predefinido basado en la imagen
const PLAN_LITI_MATERIAS = [
  // Primer cuatrimestre
  { nombre: "INGLES I", horas_semanales: 5, cuatrimestre: 1 },
  {
    nombre: "DESARROLLO HUMANO Y VALORES",
    horas_semanales: 4,
    cuatrimestre: 1,
  },
  { nombre: "FUNDAMENTOS MATEMATICOS", horas_semanales: 7, cuatrimestre: 1 },
  { nombre: "FUNDAMENTOS DE REDES", horas_semanales: 4, cuatrimestre: 1 },
  { nombre: "FISICA", horas_semanales: 6, cuatrimestre: 1 },
  {
    nombre: "FUNDAMENTOS DE PROGRAMACION",
    horas_semanales: 4,
    cuatrimestre: 1,
  },
  {
    nombre: "COMUNICACION Y HABILIDADES DIGITALES",
    horas_semanales: 5,
    cuatrimestre: 1,
  },

  // Segundo cuatrimestre
  { nombre: "INGLES II", horas_semanales: 5, cuatrimestre: 2 },
  {
    nombre: "HABILIDADES SOCIOEMOCIONALES Y MANEJO DE CONFLICTOS",
    horas_semanales: 4,
    cuatrimestre: 2,
  },
  { nombre: "CALCULO DIFERENCIAL", horas_semanales: 6, cuatrimestre: 2 },
  {
    nombre: "CONMUTACION Y ENRUTAMIENTO DE REDES",
    horas_semanales: 5,
    cuatrimestre: 2,
  },
  { nombre: "PROBABILIDAD Y ESTADISTICA", horas_semanales: 5, cuatrimestre: 2 },
  { nombre: "PROGRAMACION ESTRUCTURADA", horas_semanales: 5, cuatrimestre: 2 },
  { nombre: "SISTEMAS OPERATIVOS", horas_semanales: 5, cuatrimestre: 2 },

  // Tercer cuatrimestre
  { nombre: "INGLES III", horas_semanales: 5, cuatrimestre: 3 },
  {
    nombre: "DESARROLLO DEL PENSAMIENTO Y TOMA DE DECISIONES",
    horas_semanales: 4,
    cuatrimestre: 3,
  },
  { nombre: "CALCULO INTEGRAL", horas_semanales: 4, cuatrimestre: 3 },
  {
    nombre: "TOPICOS DE CALIDAD PARA EL DISENO DE SOFTWARE",
    horas_semanales: 6,
    cuatrimestre: 3,
  },
  { nombre: "BASES DE DATOS", horas_semanales: 5, cuatrimestre: 3 },
  {
    nombre: "PROGRAMACION ORIENTADA A OBJETOS",
    horas_semanales: 7,
    cuatrimestre: 3,
  },
  { nombre: "PROYECTO INTEGRADOR I", horas_semanales: 4, cuatrimestre: 3 },

  // Cuarto cuatrimestre
  { nombre: "INGLES IV", horas_semanales: 5, cuatrimestre: 4 },
  { nombre: "ETICA PROFESIONAL", horas_semanales: 4, cuatrimestre: 4 },
  {
    nombre: "CALCULO DE VARIAS VARIABLES",
    horas_semanales: 5,
    cuatrimestre: 4,
  },
  { nombre: "APLICACIONES WEB", horas_semanales: 5, cuatrimestre: 4 },
  { nombre: "ESTRUCTURA DE DATOS", horas_semanales: 5, cuatrimestre: 4 },
  {
    nombre: "DESARROLLO DE APLICACIONES MOVILES",
    horas_semanales: 6,
    cuatrimestre: 4,
  },
  {
    nombre: "ANALISIS Y DISENO DE SOFTWARE",
    horas_semanales: 5,
    cuatrimestre: 4,
  },

  // Quinto cuatrimestre
  { nombre: "INGLES V", horas_semanales: 5, cuatrimestre: 5 },
  {
    nombre: "LIDERAZGO DE EQUIPOS DE ALTO DESEMPENO",
    horas_semanales: 4,
    cuatrimestre: 5,
  },
  { nombre: "ECUACIONES DIFERENCIALES", horas_semanales: 5, cuatrimestre: 5 },
  {
    nombre: "APLICACIONES WEB ORIENTADAS A SERVICIOS",
    horas_semanales: 6,
    cuatrimestre: 5,
  },
  { nombre: "BASES DE DATOS AVANZADAS", horas_semanales: 5, cuatrimestre: 5 },
  {
    nombre: "ESTANDARES Y METRICAS PARA EL DESARROLLO DE SOFTWARE",
    horas_semanales: 6,
    cuatrimestre: 5,
  },
  { nombre: "PROYECTO INTEGRADOR II", horas_semanales: 4, cuatrimestre: 5 },

  // Sexto cuatrimestre - ESTADIA TSU
  { nombre: "ESTADIA TSU", horas_semanales: 40, cuatrimestre: 6 },

  // Septimo cuatrimestre
  { nombre: "INGLES VI", horas_semanales: 5, cuatrimestre: 7 },
  { nombre: "HABILIDADES GERENCIALES", horas_semanales: 4, cuatrimestre: 7 },
  {
    nombre: "FORMULACION DE PROYECTOS DE TECNOLOGIA",
    horas_semanales: 4,
    cuatrimestre: 7,
  },
  {
    nombre: "FUNDAMENTOS DE INTELIGENCIA ARTIFICIAL",
    horas_semanales: 6,
    cuatrimestre: 7,
  },
  {
    nombre: "LEGISLACION EN TECNOLOGIAS DE LA INFORMACION",
    horas_semanales: 4,
    cuatrimestre: 7,
  },
  {
    nombre: "OPTATIVA I - MODELACION DE DATOS EN LA NUBE",
    horas_semanales: 6,
    cuatrimestre: 7,
  },
  { nombre: "SEGURIDAD INFORMATICA", horas_semanales: 6, cuatrimestre: 7 },

  // Octavo cuatrimestre
  { nombre: "INGLES VII", horas_semanales: 5, cuatrimestre: 8 },
  { nombre: "ELECTRONICA DIGITAL", horas_semanales: 5, cuatrimestre: 8 },
  {
    nombre: "GESTION DE PROYECTOS DE TECNOLOGIA",
    horas_semanales: 4,
    cuatrimestre: 8,
  },
  {
    nombre: "PROGRAMACION PARA INTELIGENCIA ARTIFICIAL",
    horas_semanales: 5,
    cuatrimestre: 8,
  },
  {
    nombre: "ADMINISTRACION DE SERVIDORES",
    horas_semanales: 5,
    cuatrimestre: 8,
  },
  {
    nombre: "OPTATIVA II - PROGRAMACION MOVIL AVANZADA",
    horas_semanales: 6,
    cuatrimestre: 8,
  },
  { nombre: "INFORMATICA FORENSE", horas_semanales: 5, cuatrimestre: 8 },

  // Noveno cuatrimestre
  { nombre: "INGLES VIII", horas_semanales: 5, cuatrimestre: 9 },
  { nombre: "INTERNET DE LAS COSAS", horas_semanales: 5, cuatrimestre: 9 },
  {
    nombre: "EVALUACION DE PROYECTOS DE TECNOLOGIA",
    horas_semanales: 4,
    cuatrimestre: 9,
  },
  { nombre: "CIENCIA DE DATOS", horas_semanales: 6, cuatrimestre: 9 },
  { nombre: "TECNOLOGIAS DISRUPTIVAS", horas_semanales: 5, cuatrimestre: 9 },
  {
    nombre: "OPTATIVA III - FRAMEWORKS PARA EL DESARROLLO",
    horas_semanales: 6,
    cuatrimestre: 9,
  },
  { nombre: "PROYECTO INTEGRADOR III", horas_semanales: 4, cuatrimestre: 9 },

  // Decimo cuatrimestre - ESTADIA LICENCIATURA
  { nombre: "ESTADIA LICENCIATURA", horas_semanales: 40, cuatrimestre: 10 },
];

function Materias() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showMateriaForm, setShowMateriaForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [cuatrimestreVista, setCuatrimestreVista] = useState(1);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    total_cuatrimestres: 10,
  });
  const [materiaFormData, setMateriaFormData] = useState({
    nombre: "",
    horas_semanales: 4,
    cuatrimestre: 1,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPlanes();
  }, []);

  const fetchPlanes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/planes-estudios`);
      const data = await response.json();
      if (response.ok) {
        setPlanes(data.planes || []);
        // Mantener el plan seleccionado si aún existe, sino seleccionar el primero
        if (planSeleccionado) {
          const planActualizado = data.planes.find(
            (p) => p.id === planSeleccionado.id
          );
          if (planActualizado) {
            setPlanSeleccionado(planActualizado);
          } else if (data.planes && data.planes.length > 0) {
            setPlanSeleccionado(data.planes[0]);
          }
        } else if (data.planes && data.planes.length > 0) {
          setPlanSeleccionado(data.planes[0]);
        }
      }
    } catch (err) {
      console.error("Error al cargar planes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPlanLITI = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/planes-estudios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: "LITI",
          descripcion:
            "Licenciatura en Ingenieria en Tecnologias de la Informacion e Innovacion Digital",
          total_cuatrimestres: 10,
          materias: PLAN_LITI_MATERIAS,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Plan de estudios LITI creado exitosamente");
        fetchPlanes();
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const url = editMode
        ? `${API_URL}/api/planes-estudios/${planSeleccionado.id}`
        : `${API_URL}/api/planes-estudios`;

      const method = editMode ? "PUT" : "POST";

      const body = editMode
        ? {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            total_cuatrimestres: parseInt(formData.total_cuatrimestres),
          }
        : {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            total_cuatrimestres: parseInt(formData.total_cuatrimestres),
            materias: [],
          };

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          editMode
            ? "Plan de estudios actualizado exitosamente"
            : "Plan de estudios creado exitosamente"
        );
        setFormData({ nombre: "", descripcion: "", total_cuatrimestres: 10 });
        setShowForm(false);
        setEditMode(false);
        fetchPlanes();
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleEdit = (plan) => {
    setFormData({
      nombre: plan.nombre,
      descripcion: plan.descripcion || "",
      total_cuatrimestres: plan.total_cuatrimestres,
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleAgregarMateria = async (e) => {
    e.preventDefault();
    if (!planSeleccionado) return;

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/planes-estudios/${planSeleccionado.id}/materias`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            materias: [
              {
                nombre: materiaFormData.nombre,
                horas_semanales: parseInt(materiaFormData.horas_semanales),
                cuatrimestre: parseInt(materiaFormData.cuatrimestre),
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Materia agregada exitosamente");
        setMateriaFormData({
          nombre: "",
          horas_semanales: 4,
          cuatrimestre: cuatrimestreVista,
        });
        setShowMateriaForm(false);
        fetchPlanes();
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleEliminarMateria = async (materiaId) => {
    if (!planSeleccionado) return;
    if (!window.confirm("Esta seguro de eliminar esta materia?")) return;

    try {
      const response = await fetch(
        `${API_URL}/api/planes-estudios/${planSeleccionado.id}/materias/${materiaId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setMessage("Materia eliminada exitosamente");
        fetchPlanes();
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.detail}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (planId) => {
    if (
      !window.confirm(
        "Esta seguro de eliminar este plan de estudios y todas sus materias?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/planes-estudios/${planId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("Plan de estudios eliminado exitosamente");
        if (planSeleccionado?.id === planId) {
          setPlanSeleccionado(null);
        }
        fetchPlanes();
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.detail}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditMode(false);
    setFormData({ nombre: "", descripcion: "", total_cuatrimestres: 10 });
  };

  const getMateriasCuatrimestre = () => {
    if (!planSeleccionado || !planSeleccionado.materias_por_cuatrimestre) {
      return [];
    }
    return planSeleccionado.materias_por_cuatrimestre[cuatrimestreVista] || [];
  };

  const getTotalHorasCuatrimestre = () => {
    const materias = getMateriasCuatrimestre();
    return materias.reduce((total, m) => total + m.horas_semanales, 0);
  };

  return (
    <div className="materias-page">
      <div className="materias-container">
        <div className="materias-header">
          <h1>Planes de Estudio</h1>
          <div className="header-actions">
            <button
              className="btn-liti"
              onClick={handleCrearPlanLITI}
              disabled={loading}
            >
              Cargar Plan ITIID
            </button>
            <button
              className="btn-agregar"
              onClick={() => {
                if (showForm) {
                  handleCancel();
                } else {
                  setShowForm(true);
                  setEditMode(false);
                  setFormData({
                    nombre: "",
                    descripcion: "",
                    total_cuatrimestres: 10,
                  });
                }
              }}
            >
              {showForm ? "X Cancelar" : "+ Nuevo Plan"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`message ${
              message.includes("Error") ? "error" : "success"
            }`}
          >
            {message}
          </div>
        )}

        {showForm && (
          <div className="form-section">
            <h2>
              {editMode ? "Editar Plan de Estudios" : "Nuevo Plan de Estudios"}
            </h2>
            <form onSubmit={handleSubmit} className="materia-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre del Plan</label>
                  <input
                    type="text"
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                    placeholder="Ej: LITI, TSU"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="total_cuatrimestres">
                    Total Cuatrimestres
                  </label>
                  <input
                    type="number"
                    id="total_cuatrimestres"
                    value={formData.total_cuatrimestres}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_cuatrimestres: e.target.value,
                      })
                    }
                    min="1"
                    max="12"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripcion</label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Descripcion del plan de estudios..."
                  rows="2"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  {editMode ? "Actualizar Plan" : "Guardar Plan"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de planes */}
        <div className="planes-list-section">
          <h2>Planes Registrados ({planes.length})</h2>
          {loading ? (
            <div className="loading">Cargando planes...</div>
          ) : planes.length === 0 ? (
            <div className="empty-state">
              <p>No hay planes de estudio registrados.</p>
              <p>Puede cargar el plan LITI predefinido o crear uno nuevo.</p>
            </div>
          ) : (
            <div className="planes-grid">
              {planes.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card ${
                    planSeleccionado?.id === plan.id ? "selected" : ""
                  }`}
                  onClick={() => {
                    setPlanSeleccionado(plan);
                    setCuatrimestreVista(1);
                  }}
                >
                  <div className="plan-card-header">
                    <h3>{plan.nombre}</h3>
                    <div className="plan-card-actions">
                      <button
                        className="btn-edit-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(plan);
                        }}
                        title="Editar plan"
                      >
                        ✎
                      </button>
                      <button
                        className="btn-delete-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(plan.id);
                        }}
                        title="Eliminar plan"
                      >
                        X
                      </button>
                    </div>
                  </div>
                  <p className="plan-desc">{plan.descripcion}</p>
                  <div className="plan-stats">
                    <span>{plan.total_cuatrimestres} cuatrimestres</span>
                    <span>{plan.total_materias} materias</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vista de materias del plan seleccionado */}
        {planSeleccionado && (
          <div className="plan-detail-section">
            <div className="plan-detail-header">
              <h2>Materias de {planSeleccionado.nombre}</h2>
              <button
                className="btn-agregar-materia"
                onClick={() => {
                  setShowMateriaForm(!showMateriaForm);
                  setMateriaFormData({
                    nombre: "",
                    horas_semanales: 4,
                    cuatrimestre: cuatrimestreVista,
                  });
                }}
              >
                {showMateriaForm ? "X Cancelar" : "+ Agregar Materia"}
              </button>
            </div>

            {showMateriaForm && (
              <div className="materia-form-inline">
                <form onSubmit={handleAgregarMateria} className="form-inline">
                  <div className="form-field">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={materiaFormData.nombre}
                      onChange={(e) =>
                        setMateriaFormData({
                          ...materiaFormData,
                          nombre: e.target.value,
                        })
                      }
                      placeholder="Ej: INGLES I"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Horas/Semana</label>
                    <input
                      type="number"
                      value={materiaFormData.horas_semanales}
                      onChange={(e) =>
                        setMateriaFormData({
                          ...materiaFormData,
                          horas_semanales: e.target.value,
                        })
                      }
                      min="1"
                      max="40"
                      required
                      style={{ width: "80px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label>Cuatrimestre</label>
                    <select
                      value={materiaFormData.cuatrimestre}
                      onChange={(e) =>
                        setMateriaFormData({
                          ...materiaFormData,
                          cuatrimestre: e.target.value,
                        })
                      }
                    >
                      {[...Array(planSeleccionado.total_cuatrimestres)].map(
                        (_, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            C{idx + 1}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <button type="submit" className="btn-submit-inline">
                    Agregar
                  </button>
                </form>
              </div>
            )}

            <div className="cuatrimestre-selector">
              {[...Array(planSeleccionado.total_cuatrimestres)].map(
                (_, idx) => (
                  <button
                    key={idx + 1}
                    className={`cuatri-btn ${
                      cuatrimestreVista === idx + 1 ? "active" : ""
                    }`}
                    onClick={() => setCuatrimestreVista(idx + 1)}
                  >
                    C{idx + 1}
                  </button>
                )
              )}
            </div>

            <div className="cuatrimestre-info">
              <h3>Cuatrimestre {cuatrimestreVista}</h3>
              <span className="total-horas">
                Total: {getTotalHorasCuatrimestre()} hrs/semana
              </span>
            </div>

            <div className="materias-table">
              <table>
                <thead>
                  <tr>
                    <th>Materia</th>
                    <th>Horas Semanales</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getMateriasCuatrimestre().length > 0 ? (
                    getMateriasCuatrimestre().map((materia) => (
                      <tr key={materia.id}>
                        <td>{materia.nombre}</td>
                        <td>{materia.horas_semanales} hrs</td>
                        <td>
                          <button
                            className="btn-delete-materia"
                            onClick={() => handleEliminarMateria(materia.id)}
                            title="Eliminar materia"
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="no-materias">
                        No hay materias en este cuatrimestre
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Materias;
