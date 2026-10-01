import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RutaProtegida } from './components/RutaProtegida';
import { DashboardPage } from './pages/DashboardPage';
import { DiagnosticoPage } from './pages/DiagnosticoPage';
import { EntregasPage } from './pages/EntregasPage';
import { LoginPage } from './pages/LoginPage';
import { NuevaOrdenPage } from './pages/NuevaOrdenPage';
import { OrdenesPage } from './pages/OrdenesPage';
import { ReparacionPage } from './pages/ReparacionPage';
import { ReportesPage } from './pages/ReportesPage';
import { SeguimientoPage } from './pages/SeguimientoPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* pública, sin autenticación: la ve el cliente desde el link de seguimiento */}
      <Route path="/seguimiento/:id" element={<SeguimientoPage />} />
      <Route
        path="/"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="ordenes" element={<OrdenesPage />} />
        <Route path="ordenes/nueva" element={<NuevaOrdenPage />} />
        {/* Compatibilidad con enlaces antiguos: la orden entra por diagnóstico. */}
        <Route path="ordenes/:id" element={<DiagnosticoPage />} />
        <Route path="diagnosticos" element={<DiagnosticoPage />} />
        <Route path="diagnosticos/:id" element={<DiagnosticoPage />} />
        <Route path="reparaciones" element={<ReparacionPage />} />
        <Route path="reparaciones/:id" element={<ReparacionPage />} />
        <Route path="entregas" element={<EntregasPage />} />
        <Route path="reportes" element={<RutaProtegida roles={['ADMIN', 'SUPER_ADMIN']}><ReportesPage /></RutaProtegida>} />
        <Route path="usuarios" element={<RutaProtegida roles={['ADMIN', 'SUPER_ADMIN']}><UsuariosPage /></RutaProtegida>} />
      </Route>
    </Routes>
  );
}
