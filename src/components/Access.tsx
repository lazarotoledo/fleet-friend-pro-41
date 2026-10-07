import { createContext, useContext, type ReactNode } from "react";

export type FleetRole = "admin" | "consultor";
export const AccessContext = createContext<FleetRole | null>(null);
export const useCanEdit = () => useContext(AccessContext) === "admin";
export function AdminOnly({ children }: { children: ReactNode }) {
  return useCanEdit() ? <>{children}</> : null;
}