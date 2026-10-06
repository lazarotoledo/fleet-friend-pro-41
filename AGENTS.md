<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Auth gate is client-side in `AppShell` wrapping each page; data access goes directly through the browser client with owner-scoped RLS (`user_id = auth.uid()`) — single-user app, no server functions needed.
- Fleet business rules (contract time, km comparison, maintenance alerts) live in `src/lib/fleet.ts` so pages share one source of truth.
- Team changes are recorded in `historico_equipes` and mirrored to `veiculos.equipe_id` for the current team.
