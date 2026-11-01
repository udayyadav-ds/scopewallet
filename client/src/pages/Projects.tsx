import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

interface ClientRow {
  id: number;
  name: string;
}
interface ProjectRow {
  id: number;
  name: string;
  client: ClientRow;
  _count: { requests: number };
}

export default function Projects() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api<ClientRow[]>("/api/clients"), api<ProjectRow[]>("/api/projects")]);
      setClients(c);
      setProjects(p);
      if (!clientId && c.length) setClientId(String(c[0].id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const addClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    await api("/api/clients", { method: "POST", body: { name: clientName } });
    setClientName("");
    load();
  };
  const addProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientId) return;
    await api("/api/projects", { method: "POST", body: { clientId: Number(clientId), name: projectName } });
    setProjectName("");
    load();
  };

  const input = "rounded bg-slate-900 border border-slate-700 px-3 py-2 outline-none focus:border-teal-500";
  return (
    <div className="space-y-8">
      {error && <p className="text-red-400">{error}</p>}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Clients</h2>
        <form onSubmit={addClient} className="flex gap-2">
          <input className={`${input} flex-1`} placeholder="New client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <button className="rounded bg-teal-600 px-4 hover:bg-teal-500">Add</button>
        </form>
        <div className="text-sm text-slate-400">{clients.map((c) => c.name).join(", ") || "No clients yet"}</div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Projects</h2>
        {clients.length > 0 && (
          <form onSubmit={addProject} className="flex gap-2">
            <select className={input} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className={`${input} flex-1`} placeholder="New project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            <button className="rounded bg-teal-600 px-4 hover:bg-teal-500">Add</button>
          </form>
        )}
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="block rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-teal-500">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-slate-400">{p.client.name} - {p._count.requests} requests logged</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
