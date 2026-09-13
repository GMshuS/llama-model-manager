import { Routes, Route, NavLink } from 'react-router-dom'
import ModelBrowser from './components/ModelBrowser/ModelBrowser'
import Dashboard from './components/Dashboard/Dashboard'
import Settings from './components/Settings/Settings'
import { DashboardProvider } from './store/dashboard'

export default function App() {
  return (
    <DashboardProvider>
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside className="w-60 flex-shrink-0 border-r border-gray-800 p-4 flex flex-col">
        <h1 className="text-lg font-bold mb-6 text-cyan-400">llama.cpp Manager</h1>
        <nav className="flex flex-col gap-2 flex-1">
          <NavLink to="/" end className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-gray-800 text-cyan-300' : 'hover:bg-gray-800/50'}`}>
            模型浏览
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-gray-800 text-cyan-300' : 'hover:bg-gray-800/50'}`}>
            仪表盘
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-gray-800 text-cyan-300' : 'hover:bg-gray-800/50'}`}>
            设置
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<ModelBrowser />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
    </DashboardProvider>
  )
}
