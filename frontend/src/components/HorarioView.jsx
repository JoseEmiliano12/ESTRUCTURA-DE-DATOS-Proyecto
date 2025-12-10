import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000'

function HorarioView({ horarioId }) {
    const [horario, setHorario] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (horarioId) {
            fetchHorario()
        }
    }, [horarioId])

    const fetchHorario = async () => {
        try {
            const response = await fetch(`${API_URL}/api/horarios/${horarioId}`)
            const data = await response.json()

            if (response.ok) {
                setHorario(data)
            } else {
                setError('Error al cargar horario')
            }
        } catch (err) {
            setError(`Error de conexión: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="loading">⏳ Cargando horario...</div>
    if (error) return <div className="error">{error}</div>
    if (!horario) return null

    // Agrupar asignaciones por día
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    const asignacionesPorDia = {}

    dias.forEach(dia => {
        asignacionesPorDia[dia] = horario.asignaciones.filter(a => a.dia === dia)
    })

    return (
        <div className="horario-view">
            <div className="horario-header">
                <p><strong>ID del Horario:</strong> {horario.id}</p>
                <p><strong>Fecha de Generación:</strong> {new Date(horario.fecha_generacion).toLocaleString()}</p>
                <p><strong>Total de Asignaciones:</strong> {horario.asignaciones.length}</p>
            </div>

            <div className="horario-grid">
                {dias.map(dia => (
                    <div key={dia} className="dia-column">
                        <h3>{dia}</h3>
                        <div className="asignaciones-list">
                            {asignacionesPorDia[dia].length === 0 ? (
                                <p className="empty-day">Sin clases</p>
                            ) : (
                                asignacionesPorDia[dia]
                                    .sort((a, b) => parseInt(a.hora_inicio) - parseInt(b.hora_inicio))
                                    .map((asig, idx) => (
                                        <div key={idx} className="asignacion-card">
                                            <div className="time">{asig.hora_inicio} - {asig.hora_fin}</div>
                                            <div className="materia">{asig.materia}</div>
                                            <div className="grupo">{asig.grupo}</div>
                                            <div className="maestro">{asig.maestro}</div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default HorarioView
