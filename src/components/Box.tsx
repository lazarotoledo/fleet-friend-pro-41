import type { ReactNode } from "react";

export function Box({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border bg-card p-5 shadow-card"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}
