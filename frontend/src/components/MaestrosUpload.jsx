import { useState } from "react";
import "./MaestrosUpload.css";

const API_URL = "http://localhost:8000";

function MaestrosUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Por favor selecciona un archivo CSV");
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/maestros/upload-csv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`${data.message}`);
        setFile(null);
        // Reset file input
        document.getElementById("csv-file-input").value = "";
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (error) {
      setMessage(`Error de conexion: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="file-input-wrapper">
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={loading}
        />
        {file && <span className="file-name">{file.name}</span>}
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="btn-upload"
      >
        {loading ? "Cargando..." : "Cargar CSV"}
      </button>

      {message && (
        <div
          className={`message ${
            message.includes("Error") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Formato CSV esperado:</strong>
        </p>
        <code>nombre,email,horas_max_dia,materias,dias_disponibles</code>
        <p style={{ marginTop: "8px", fontSize: "0.9em" }}>
          Ejemplo:{" "}
          <code>Juan Perez,juan@upv.edu.mx,8,INGLES I|INGLES II,0|1|2|3|4</code>
        </p>
        <p
          style={{
            marginTop: "4px",
            fontSize: "0.85em",
            color: "var(--text-secondary)",
          }}
        >
          Dias: 0=Lun, 1=Mar, 2=Mie, 3=Jue, 4=Vie | Separar materias y dias con
          |
        </p>
      </div>
    </div>
  );
}

export default MaestrosUpload;
