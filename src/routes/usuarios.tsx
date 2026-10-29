import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/usuarios")({
  beforeLoad: () => { throw redirect({ to: "/pessoas", replace: true }); },
});
