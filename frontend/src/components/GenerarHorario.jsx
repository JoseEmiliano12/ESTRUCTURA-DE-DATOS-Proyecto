import { useState } from 'react'

const API_URL = 'http://localhost:8000'

function GenerarHorario({ onHorarioGenerado }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleGenerar = async () => {
        setLoading(true)
        setMessage('')

        try {
            const response = await fetch(`${API_URL}/api/generar-horario`, {
                method: 'POST',
            })

            const data = await response.json()

            if (response.ok) {
                setMessage(`✅ ${data.message} - ${data.total_asignaciones} asignaciones creadas`)
                if (onHorarioGenerado) onHorarioGenerado(data.horario_id)
            } else {
                setMessage(`❌ Error: ${data.detail}`)
            }
        } catch (error) {
            setMessage(`❌ Error de conexión: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="generar-container">
            <p className="info-text">
                Asegúrate de haber cargado maestros, materias y grupos antes de generar el horario.
            </p>

            <button
                onClick={handleGenerar}
                disabled={loading}
                className="btn-generate"
            >
                {loading ? '⏳ Generando horario...' : '⚡ Generar Horario con Cython'}
            </button>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="info-box">
                <p><strong>El algoritmo aplicará las siguientes restricciones:</strong></p>
                <ul>
                    <li>✓ Sin empalmes de horario para maestros</li>
                    <li>✓ Máximo 3 horas consecutivas</li>
                    <li>✓ Máximo 2 horas libres consecutivas</li>
                    <li>✓ Sin empalmes para grupos</li>
                </ul>
            </div>
        </div>
    )
}

export default GenerarHorario
