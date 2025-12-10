import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000'

function MaestrosList() {
    const [maestros, setMaestros] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchMaestros()
    }, [])

    const fetchMaestros = async () => {
        try {
            const response = await fetch(`${API_URL}/api/maestros`)
            const data = await response.json()

            if (response.ok) {
                setMaestros(data.maestros)
            } else {
                setError('Error al cargar maestros')
            }
        } catch (err) {
            setError(`Error de conexión: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="loading">⏳ Cargando maestros...</div>
    if (error) return <div className="error">{error}</div>

    return (
        <div className="maestros-list">
            {maestros.length === 0 ? (
                <p className="empty-state">No hay maestros registrados. Carga un archivo CSV para comenzar.</p>
            ) : (
                <>
                    <p className="count-badge">Total: {maestros.length} maestros</p>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Horas Máx/Día</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maestros.map((maestro) => (
                                    <tr key={maestro.id}>
                                        <td>{maestro.id}</td>
                                        <td>{maestro.nombre}</td>
                                        <td>{maestro.email}</td>
                                        <td>{maestro.horas_max_dia}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

export default MaestrosList
