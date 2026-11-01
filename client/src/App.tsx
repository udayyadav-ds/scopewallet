import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import AuthPage from "./pages/AuthPage";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "./pages/Projects";

export default function App() {
  const { token, agency, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <Link to="/" className="text-lg font-bold text-teal-400">ScopeWallet</Link>
        <div className="flex items-center gap-4 text-sm">
          {token ? (
            <>
              <span className="text-slate-400">{agency}</span>
              <button onClick={logout} className="rounded bg-slate-800 px-3 py-1 hover:bg-slate-700">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-teal-300">Log in</Link>
              <Link to="/register" className="rounded bg-teal-600 px-3 py-1 hover:bg-teal-500">Sign up</Link>
            </>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Routes>
          <Route path="/" element={token ? <Projects /> : <Navigate to="/login" />} />
          <Route path="/projects/:id" element={token ? <ProjectDetail /> : <Navigate to="/login" />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Routes>
      </main>
    </div>
  );
}
