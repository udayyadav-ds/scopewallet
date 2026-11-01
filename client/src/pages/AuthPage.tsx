import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface AuthResponse {
  token: string;
  user: { agencyName: string };
}

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const [form, setForm] = useState({ agencyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const body = mode === "register" ? form : { email: form.email, password: form.password };
      const data = await api<AuthResponse>(`/api/auth/${mode}`, { method: "POST", body });
      login(data.token, data.user.agencyName);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  const field = "w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 outline-none focus:border-teal-500";
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{mode === "login" ? "Log in" : "Create your agency account"}</h1>
      {mode === "register" && (
        <>
          <input className={field} placeholder="Agency name" value={form.agencyName} onChange={set("agencyName")} />
          <input className={field} placeholder="Your name" value={form.name} onChange={set("name")} />
        </>
      )}
      <input className={field} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
      <input className={field} type="password" placeholder="Password (8+ characters)" value={form.password} onChange={set("password")} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="w-full rounded bg-teal-600 py-2 font-semibold hover:bg-teal-500">
        {mode === "login" ? "Log in" : "Sign up"}
      </button>
    </form>
  );
}
