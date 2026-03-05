import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard.jsx'
import { Login } from './pages/Login.jsx'
import { Register } from './pages/Register.jsx'
import { DocEditor } from './pages/DocEditor.jsx'
import { PublicSign } from './pages/PublicSign.jsx'
import { getToken } from './lib/auth.js'

function App() {
  const isAuthed = Boolean(getToken())

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthed ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={isAuthed ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuthed ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/docs/:docId" element={isAuthed ? <DocEditor /> : <Navigate to="/login" replace />} />
        <Route path="/sign/:token" element={<PublicSign />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
