import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import "./ConsultarHorario.css";

const API_URL = "http://localhost:8000";

function ConsultarHorario() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [horarioGrupo, setHorarioGrupo] = useState(null);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState("matutino");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/grupos`);
      const data = await response.json();

      if (response.ok && data.grupos && data.grupos.length > 0) {
        setGrupos(data.grupos);
        // Seleccionar el primer grupo por defecto
        fetchHorarioPorGrupo(data.grupos[0].id, data.grupos[0].nombre);
        setGrupoSeleccionado(data.grupos[0]);
      }
    } catch (err) {
      console.error("Error al cargar grupos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHorarioPorGrupo = async (grupoId, grupoNombre) => {
    try {
      // Buscar el horario que contenga asignaciones de este grupo
      const response = await fetch(`${API_URL}/api/horarios`);
      const data = await response.json();

      if (response.ok && data.horarios && data.horarios.length > 0) {
        // Buscar el horario correspondiente al grupo
        for (const horario of data.horarios) {
          const horarioDetalle = await fetch(
            `${API_URL}/api/horarios/${horario.id}`
          );
          const detalleData = await horarioDetalle.json();

          // Verificar si este horario tiene asignaciones del grupo seleccionado
          if (detalleData.asignaciones && detalleData.asignaciones.length > 0) {
            // Buscar por nombre del grupo o por ID
            const tieneGrupo = detalleData.asignaciones.some(
              (a) =>
                a.grupo === grupoNombre || a.grupo.includes(grupoId.toString())
            );

            if (tieneGrupo) {
              setHorarioGrupo(detalleData);
              return;
            }
          }
        }
      }
      setHorarioGrupo(null);
    } catch (err) {
      console.error("Error al cargar horario del grupo:", err);
    }
  };

  const handleCambiarGrupo = (grupo) => {
    setGrupoSeleccionado(grupo);
    fetchHorarioPorGrupo(grupo.id, grupo.nombre);
  };

  const eliminarTodosHorarios = async () => {
    if (
      !window.confirm("¿Está seguro de eliminar TODOS los horarios generados?")
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/horarios`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGrupos([]);
        setGrupoSeleccionado(null);
        setHorarioGrupo(null);
        alert("Todos los horarios han sido eliminados");
        fetchGrupos();
      } else {
        alert("Error al eliminar horarios");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const exportarExcel = () => {
    if (
      !horarioGrupo ||
      !horarioGrupo.asignaciones ||
      horarioGrupo.asignaciones.length === 0
    ) {
      alert("No hay horario para exportar");
      return;
    }

    const dias = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
    ];

    // Filtrar por turno
    const asignacionesFiltradas = horarioGrupo.asignaciones.filter(
      (asignacion) => {
        const horaInicio = parseInt(asignacion.hora_inicio.split(":")[0]);
        if (turnoSeleccionado === "matutino") {
          return horaInicio >= 7 && horaInicio < 14;
        } else {
          return horaInicio >= 14 && horaInicio < 21;
        }
      }
    );

    // Agrupar por materia
    const materiaMap = {};
    asignacionesFiltradas.forEach((asignacion) => {
      const key = asignacion.materia;
      if (!materiaMap[key]) {
        materiaMap[key] = {
          materia: asignacion.materia,
          maestro: asignacion.maestro,
          horarios: {},
        };
      }
      if (!materiaMap[key].horarios[asignacion.dia]) {
        materiaMap[key].horarios[asignacion.dia] = [];
      }
      materiaMap[key].horarios[asignacion.dia].push(
        `${asignacion.hora_inicio}-${asignacion.hora_fin}`
      );
    });

    const materiasAgrupadas = Object.values(materiaMap);

    // Calcular total de horas
    let totalHoras = 0;
    asignacionesFiltradas.forEach((asig) => {
      const horaInicio = parseInt(asig.hora_inicio.split(":")[0]);
      const horaFin = parseInt(asig.hora_fin.split(":")[0]);
      totalHoras += horaFin - horaInicio;
    });

    // Colores para las materias (paleta de colores atractivos)
    const coloresMaterias = [
      { bg: "4472C4", font: "FFFFFF" }, // Azul
      { bg: "70AD47", font: "FFFFFF" }, // Verde
      { bg: "ED7D31", font: "FFFFFF" }, // Naranja
      { bg: "A855F7", font: "FFFFFF" }, // Púrpura
      { bg: "FFC000", font: "000000" }, // Amarillo
      { bg: "5B9BD5", font: "FFFFFF" }, // Azul claro
      { bg: "C00000", font: "FFFFFF" }, // Rojo
      { bg: "00B0F0", font: "FFFFFF" }, // Cian
      { bg: "92D050", font: "000000" }, // Verde lima
      { bg: "7030A0", font: "FFFFFF" }, // Violeta
      { bg: "FF6699", font: "FFFFFF" }, // Rosa
      { bg: "00B050", font: "FFFFFF" }, // Verde oscuro
    ];

    // Asignar color a cada materia
    const colorPorMateria = {};
    materiasAgrupadas.forEach((mat, idx) => {
      colorPorMateria[mat.materia] =
        coloresMaterias[idx % coloresMaterias.length];
    });

    // Crear datos para Excel
    const wsData = [];

    // Fila 1: Título
    wsData.push([
      {
        v: `Horario - ${grupoSeleccionado?.nombre || "N/A"}`,
        s: {
          font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A5F" } },
          alignment: { horizontal: "center", vertical: "center" },
        },
      },
    ]);

    // Fila 2: Turno
    wsData.push([
      {
        v: `Turno: ${
          turnoSeleccionado.charAt(0).toUpperCase() + turnoSeleccionado.slice(1)
        }`,
        s: {
          font: { bold: true, sz: 12, color: { rgb: "1E3A5F" } },
          alignment: { horizontal: "left" },
        },
      },
    ]);

    // Fila 3: Fecha
    wsData.push([
      {
        v: `Fecha de generación: ${new Date(
          horarioGrupo.fecha_generacion
        ).toLocaleDateString()}`,
        s: {
          font: { italic: true, sz: 10, color: { rgb: "666666" } },
          alignment: { horizontal: "left" },
        },
      },
    ]);

    // Fila vacía
    wsData.push([]);

    // Fila de encabezados de columnas
    const headerRow = [
      {
        v: "Materia",
        s: {
          font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2E7D32" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        },
      },
      {
        v: "Maestro",
        s: {
          font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2E7D32" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        },
      },
      ...dias.map((dia) => ({
        v: dia,
        s: {
          font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2E7D32" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        },
      })),
    ];
    wsData.push(headerRow);

    // Filas de datos con colores por materia
    materiasAgrupadas.forEach((materia) => {
      const colorMateria = colorPorMateria[materia.materia];
      const fila = [
        {
          v: materia.materia,
          s: {
            font: { bold: true, sz: 10, color: { rgb: colorMateria.font } },
            fill: { fgColor: { rgb: colorMateria.bg } },
            alignment: {
              horizontal: "left",
              vertical: "center",
              wrapText: true,
            },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          },
        },
        {
          v: materia.maestro,
          s: {
            font: { sz: 10 },
            fill: { fgColor: { rgb: "F5F5F5" } },
            alignment: {
              horizontal: "left",
              vertical: "center",
              wrapText: true,
            },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          },
        },
        ...dias.map((dia) => {
          const horarios = materia.horarios[dia];
          const tieneHorario = horarios && horarios.length > 0;
          return {
            v: tieneHorario ? horarios.join(" / ") : "-",
            s: {
              font: {
                sz: 10,
                color: { rgb: tieneHorario ? colorMateria.font : "999999" },
              },
              fill: {
                fgColor: { rgb: tieneHorario ? colorMateria.bg : "FFFFFF" },
              },
              alignment: {
                horizontal: "center",
                vertical: "center",
                wrapText: true,
              },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          };
        }),
      ];
      wsData.push(fila);
    });

    // Fila vacía
    wsData.push([]);

    // Fila de resumen
    wsData.push([
      {
        v: "Total Materias:",
        s: { font: { bold: true, sz: 11 }, alignment: { horizontal: "right" } },
      },
      {
        v: materiasAgrupadas.length,
        s: { font: { bold: true, sz: 11, color: { rgb: "2E7D32" } } },
      },
    ]);
    wsData.push([
      {
        v: "Total Horas Semanales:",
        s: { font: { bold: true, sz: 11 }, alignment: { horizontal: "right" } },
      },
      {
        v: totalHoras,
        s: { font: { bold: true, sz: 11, color: { rgb: "2E7D32" } } },
      },
    ]);

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar ancho de columnas
    ws["!cols"] = [
      { wch: 30 }, // Materia
      { wch: 25 }, // Maestro
      { wch: 14 }, // Lunes
      { wch: 14 }, // Martes
      { wch: 14 }, // Miércoles
      { wch: 14 }, // Jueves
      { wch: 14 }, // Viernes
      { wch: 14 }, // Sábado
    ];

    // Merge cells para el título
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Turno
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Fecha
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horario");

    // Descargar archivo
    XLSX.writeFile(
      wb,
      `Horario_${
        grupoSeleccionado?.nombre || "grupo"
      }_${turnoSeleccionado}.xlsx`
    );
  };

  const renderHorarioTable = () => {
    if (
      !horarioGrupo ||
      !horarioGrupo.asignaciones ||
      horarioGrupo.asignaciones.length === 0
    ) {
      return (
        <div className="no-data">
          <p>No hay datos de horario para este grupo</p>
        </div>
      );
    }

    // Filtrar asignaciones por turno basándose en las horas
    const asignacionesFiltradas = horarioGrupo.asignaciones.filter(
      (asignacion) => {
        const horaInicio = parseInt(asignacion.hora_inicio.split(":")[0]);

        if (turnoSeleccionado === "matutino") {
          // Matutino: 7:00 - 14:00
          return horaInicio >= 7 && horaInicio < 14;
        } else {
          // Vespertino: 14:00 - 21:00
          return horaInicio >= 14 && horaInicio < 21;
        }
      }
    );

    const dias = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
    ];

    // Agrupar asignaciones por materia
    const materiaMap = {};
    asignacionesFiltradas.forEach((asignacion) => {
      const key = asignacion.materia;
      if (!materiaMap[key]) {
        materiaMap[key] = {
          materia: asignacion.materia,
          maestro: asignacion.maestro,
          horarios: {}, // { "Lunes": ["7:00-9:00"], "Martes": ["9:00-11:00"] }
        };
      }
      // Agregar horario al día correspondiente
      if (!materiaMap[key].horarios[asignacion.dia]) {
        materiaMap[key].horarios[asignacion.dia] = [];
      }
      materiaMap[key].horarios[asignacion.dia].push(
        `${asignacion.hora_inicio}-${asignacion.hora_fin}`
      );
    });

    // Convertir a array para renderizar
    const materiasAgrupadas = Object.values(materiaMap);

    // Calcular total de horas semanales
    let totalHorasSemanales = 0;
    asignacionesFiltradas.forEach((asig) => {
      const horaInicio = parseInt(asig.hora_inicio.split(":")[0]);
      const horaFin = parseInt(asig.hora_fin.split(":")[0]);
      totalHorasSemanales += horaFin - horaInicio;
    });

    return (
      <div className="horario-table-container">
        <div className="horario-info-header">
          <div className="info-item">
            <span className="info-label">Grupo:</span>
            <span className="info-value">
              {grupoSeleccionado?.nombre || "N/A"}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Turno:</span>
            <span className="info-value">
              {turnoSeleccionado.charAt(0).toUpperCase() +
                turnoSeleccionado.slice(1)}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Materias:</span>
            <span className="info-value">{materiasAgrupadas.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Horas Semanales:</span>
            <span className="info-value">{totalHorasSemanales}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Fecha Generación:</span>
            <span className="info-value">
              {new Date(horarioGrupo.fecha_generacion).toLocaleDateString()}
            </span>
          </div>
        </div>

        <table className="horario-table">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Maestro</th>
              {dias.map((dia) => (
                <th key={dia}>{dia.substring(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materiasAgrupadas.length > 0 ? (
              materiasAgrupadas.map((materia, idx) => (
                <tr key={idx}>
                  <td className="materia-cell">{materia.materia}</td>
                  <td className="maestro-cell">{materia.maestro}</td>
                  {dias.map((dia) => (
                    <td key={dia} className="hora-cell">
                      {materia.horarios[dia]
                        ? materia.horarios[dia].map((hora, i) => (
                            <div key={i} className="hora-item">
                              {hora}
                            </div>
                          ))
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={dias.length + 2}
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  No hay asignaciones para el turno {turnoSeleccionado}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading && grupos.length === 0) {
    return <div className="loading">Cargando horarios...</div>;
  }

  return (
    <div className="consultar-horario-page">
      <div className="consultar-container">
        <div className="generar-nuevo-section"></div>

        {grupos.length === 0 ? (
          <div className="no-horario">
            <p>No hay horarios generados aún.</p>
            <button
              className="btn-crear-primero"
              onClick={() => navigate("/generar-horario")}
            >
              Crear Primer Horario
            </button>
          </div>
        ) : (
          <>
            {renderHorarioTable()}

            {/* Controles dinámicos ABAJO de la tabla */}
            <div className="horario-controls">
              <div className="control-section">
                <h3>Grupos</h3>
                <div className="control-buttons">
                  {grupos.map((grupo) => (
                    <button
                      key={grupo.id}
                      className={`btn-control ${
                        grupoSeleccionado?.id === grupo.id ? "active" : ""
                      }`}
                      onClick={() => handleCambiarGrupo(grupo)}
                    >
                      {grupo.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-section">
                <h3>Turnos</h3>
                <div className="control-buttons">
                  <button
                    className={`btn-control ${
                      turnoSeleccionado === "matutino" ? "active" : ""
                    }`}
                    onClick={() => setTurnoSeleccionado("matutino")}
                  >
                    Matutino
                  </button>
                  <button
                    className={`btn-control ${
                      turnoSeleccionado === "vespertino" ? "active" : ""
                    }`}
                    onClick={() => setTurnoSeleccionado("vespertino")}
                  >
                    Vespertino
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3>Acciones</h3>
                <div className="control-buttons">
                  <button
                    className="btn-control btn-export"
                    onClick={exportarExcel}
                  >
                    Exportar Excel
                  </button>
                  <button
                    className="btn-control btn-delete"
                    onClick={eliminarTodosHorarios}
                  >
                    Limpiar Horarios
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ConsultarHorario;
