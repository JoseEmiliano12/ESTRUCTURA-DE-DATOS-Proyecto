import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Inicio from './pages/Inicio'
import Docentes from './pages/Docentes'
import Materias from './pages/Materias'
import GenerarHorario from './pages/GenerarHorario'
import ConsultarHorario from './pages/ConsultarHorario'

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/docentes" element={<Docentes />} />
          <Route path="/materias" element={<Materias />} />
          <Route path="/generar-horario" element={<GenerarHorario />} />
          <Route path="/consultar-horario" element={<ConsultarHorario />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
