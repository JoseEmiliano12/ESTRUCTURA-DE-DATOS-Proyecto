import { Link } from "react-router-dom";
import "./Inicio.css";

function Inicio() {
  return (
    <div className="inicio-page">
      <div className="inicio-container">
        <div className="inicio-header">
          <h1>Sistema de Generacion de Horarios</h1>
          <p>Bienvenido al sistema de generacion automatica de horarios UPV</p>
        </div>

        <div className="inicio-cards">
          <Link to="/materias" className="inicio-card">
            <div className="card-icon">P</div>
            <h2>Plan de Estudios</h2>
            <p>
              Gestiona los planes de estudio con sus materias por cuatrimestre
            </p>
          </Link>

          <Link to="/docentes" className="inicio-card">
            <div className="card-icon">D</div>
            <h2>Gestion de Docentes</h2>
            <p>
              Administra la informacion de los profesores y sus horarios
              disponibles
            </p>
          </Link>

          <Link to="/generar-horario" className="inicio-card">
            <div className="card-icon">G</div>
            <h2>Generar Horario</h2>
            <p>
              Crea nuevos horarios automaticamente con el algoritmo de
              optimizacion
            </p>
          </Link>

          <Link to="/consultar-horario" className="inicio-card">
            <div className="card-icon">H</div>
            <h2>Consultar Horarios</h2>
            <p>Visualiza y consulta los horarios generados previamente</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Inicio;
