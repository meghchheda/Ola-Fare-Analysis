import { createContext, ReactNode, useContext, useState } from "react";
import { useApi } from "./api";

type Ctx = {
  health: any;
  healthError: string | null;
  config: any;
  models: any;
  dataset: any;
  filter: { start: string; end: string };
  setFilter: (f: { start: string; end: string }) => void;
};

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const health = useApi("/api/health");
  const config = useApi("/api/config");
  const models = useApi("/api/models/status");
  const dataset = useApi("/api/dataset");
  const [filter, setFilter] = useState({ start: "", end: "" });
  return (
    <AppCtx.Provider
      value={{
        health: health.data,
        healthError: health.error,
        config: config.data,
        models: models.data,
        dataset: dataset.data,
        filter,
        setFilter,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}
