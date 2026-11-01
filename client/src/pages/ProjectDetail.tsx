import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

interface RequestRow {
  id: number;
  message: string;
  verdict: "PENDING" | "IN_SCOPE" | "OUT_OF_SCOPE" | "UNCLEAR";
  status: "OPEN" | "CHANGE_ORDER_SENT" | "APPROVED" | "DISMISSED";
}
interface Project {
  id: number;
  name: string;
  scopeText: string | null;
  client: { name: string };
  requests: RequestRow[];
}

const STATUSES: RequestRow["status"][] = ["OPEN", "CHANGE_ORDER_SENT", "APPROVED", "DISMISSED"];

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [scope, setScope] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const p = await api<Project>(`/api/projects/${id}`);
      setProject(p);
      setScope(p.scopeText ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  };
  useEffect(() => {
    load();
  }, [id]);

  const saveScope = async () => {
    await api(`/api/projects/${id}`, { method: "PATCH", body: { scopeText: scope } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const addRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await api(`/api/projects/${id}/requests`, { method: "POST", body: { message } });
    setMessage("");
    load();
  };
  const setStatus = async (requestId: number, status: string) => {
    await api(`/api/requests/${requestId}`, { method: "PATCH", body: { status } });
    load();
  };

  if (error) return <p className="text-red-400">{error}</p>;
  if (!project) return <p className="text-slate-400">Loading...</p>;

  const box = "w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 outline-none focus:border-teal-500";
  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-sm text-teal-300 underline">Back to projects</Link>
        <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
        <div className="text-slate-400">{project.client.name}</div>
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contract scope</h2>
        <textarea className={`${box} h-40`} placeholder="Paste the scope section of the contract here" value={scope} onChange={(e) => setScope(e.target.value)} />
        <button onClick={saveScope} className="rounded bg-teal-600 px-4 py-2 hover:bg-teal-500">{saved ? "Saved" : "Save scope"}</button>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Client requests</h2>
        <form onSubmit={addRequest} className="space-y-2">
          <textarea className={`${box} h-24`} placeholder="Paste a client message or request" value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="rounded bg-teal-600 px-4 py-2 hover:bg-teal-500">Log request</button>
        </form>
        {project.requests.map((r) => (
          <div key={r.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p>{r.message}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">Scope check: {r.verdict}</span>
              <select className="rounded bg-slate-800 px-2 py-1" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
