import { createContext, ReactNode, useContext, useState } from "react";

interface AuthState {
  token: string | null;
  agency: string | null;
  login: (token: string, agency: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({ token: null, agency: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [agency, setAgency] = useState(localStorage.getItem("agency"));

  const login = (t: string, a: string) => {
    localStorage.setItem("token", t);
    localStorage.setItem("agency", a);
    setToken(t);
    setAgency(a);
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("agency");
    setToken(null);
    setAgency(null);
  };

  return <AuthContext.Provider value={{ token, agency, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
