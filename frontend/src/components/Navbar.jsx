import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./Navbar.css";

const API_URL = "http://localhost:8000";

function Navbar() {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  // Obtener información para las notificaciones
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/maestros`);
      const data = await response.json();

      if (response.ok) {
        const notifs = [];
        const totalMaestros = data.maestros?.length || 0;
        const minimo = data.minimo_maestros || 40;
        const maestrosPorGrupo = data.maestros_por_grupo_extra || 3;

        // Notificación de capacidad
        notifs.push({
          id: 1,
          type: "info",
          title: "Capacidad de maestros",
          message: `${totalMaestros} de ${minimo} maestros mínimos registrados`,
          details: [
            `Mínimo requerido: ${minimo} maestros para 2 grupos por cuatrimestre`,
            `Para 1 grupo extra: ~${maestrosPorGrupo} maestros adicionales`,
          ],
        });

        // Advertencia si no se puede eliminar
        if (!data.puede_eliminar) {
          notifs.push({
            id: 2,
            type: "warning",
            title: "Límite de maestros",
            message: "No es posible eliminar docentes",
            details: [
              `Se requiere un mínimo de ${minimo} maestros para cubrir todos los horarios`,
            ],
          });
        }

        // Si hay pocos maestros
        if (totalMaestros < minimo) {
          notifs.push({
            id: 3,
            type: "alert",
            title: "Maestros insuficientes",
            message: `Faltan ${minimo - totalMaestros} maestros`,
            details: [
              "Agrega más maestros para poder generar horarios completos",
            ],
          });
        }

        setNotifications(notifs);
      }
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar notificaciones al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determinar el título según la ruta actual
  const getTitle = () => {
    if (location.pathname.includes("docentes")) return "Docentes";
    if (location.pathname.includes("materias")) return "Materias";
    if (
      location.pathname.includes("generar") ||
      location.pathname.includes("consultar")
    )
      return "Horario Upv";
    return "Horario Upv";
  };

  // Contar notificaciones importantes (warnings y alerts)
  const importantCount = notifications.filter(
    (n) => n.type === "warning" || n.type === "alert"
  ).length;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          {getTitle()}
        </Link>

        <ul className="navbar-menu">
          <li>
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              Inicio
            </Link>
          </li>
          <li>
            <Link
              to="/docentes"
              className={location.pathname === "/docentes" ? "active" : ""}
            >
              Docentes
            </Link>
          </li>
          <li>
            <Link
              to="/materias"
              className={location.pathname === "/materias" ? "active" : ""}
            >
              Plan de Estudios
            </Link>
          </li>
          <li>
            <Link
              to="/generar-horario"
              className={
                location.pathname === "/generar-horario" ? "active" : ""
              }
            >
              Generar Horario
            </Link>
          </li>
          <li>
            <Link
              to="/consultar-horario"
              className={
                location.pathname === "/consultar-horario" ? "active" : ""
              }
            >
              Consultar horario
            </Link>
          </li>

          {/* Botón de notificaciones */}
          <li className="notifications-wrapper" ref={notifRef}>
            <button
              className="notifications-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notificaciones"
            >
              <svg
                className="bell-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {importantCount > 0 && (
                <span className="notifications-badge">{importantCount}</span>
              )}
            </button>

            {/* Panel de notificaciones */}
            {showNotifications && (
              <div className="notifications-panel">
                <div className="notifications-header">
                  <h3>Notificaciones</h3>
                  <button
                    className="notifications-close"
                    onClick={() => setShowNotifications(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <p className="notifications-empty">No hay notificaciones</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`notification-item ${notif.type}`}
                      >
                        <div className="notification-content">
                          <h4>{notif.title}</h4>
                          <p>{notif.message}</p>
                          {notif.details && (
                            <ul className="notification-details">
                              {notif.details.map((detail, idx) => (
                                <li key={idx}>{detail}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
