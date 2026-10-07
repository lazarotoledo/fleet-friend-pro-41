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
- AppShell verifies identity and loads database roles before rendering the shared fleet; role-scoped RLS enforces admin writes and member reads independently of UI.
- Access context and AdminOnly hide mutation controls for consultants; user_roles is the only source of privileges.
- Privileged user invitations/listing use authenticated server functions that verify the admin role before loading the admin client; invites let users set their own passwords.
- Fleet business rules (contract time, km comparison, maintenance alerts) live in `src/lib/fleet.ts` so pages share one source of truth.
- Team changes are recorded in `historico_equipes` and mirrored to `veiculos.equipe_id` for the current team.
