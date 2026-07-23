# Automatisierungs-Plan: Context/Agent/Harness Engineering

Status: Entwurf, entstanden in einer Planungs-Session am 2026-07-23. Noch nicht committet — erst review/absegnen.

## Ziel

Requirements werden von Agents automatisch umgesetzt. Startpunkt: PR-gated (Agent implementiert, öffnet PR, Mensch merged). Ziel-Ausbaustufe: Hybrid (risikoarme Änderungen auto-merge), später Voll-Autopilot.

## Ist-Zustand (verifiziert am 2026-07-23)

- **Aktives/kanonisches Repo**: `carofuerhunde/carofuerhunde.github.io` (public, Admin-Zugriff vorhanden). Lokal unter `/Users/Martin.Alter/Documents/homepage/caro-fuer-hunde`.
- `main` ist bereits der v2-Rebuild (Tailwind CSS 4 + Alpine.js). Der Branch `v2-preview` wurde bereits in `main` gemerged.
- Das Verzeichnis `/Users/Martin.Alter/Documents/homepage/caro-fuer-hundev2` war ein **veralteter, verwaister Stand** ohne Git-Remote/Commits — am 2026-07-23 nach `caro-fuer-hundev2.archived-2026-07-23` umbenannt (reversibel, nicht gelöscht). Kann bei Bedarf endgültig entfernt werden.
- **Zwei parallele Deploy-Pipelines** laufen aktuell bei jedem Push auf `main`:
  - GitHub Pages (`.github/workflows/...` über Pages-Build, Status: `built`, live unter `carofuerhunde.github.io`)
  - Azure Static Web Apps (`.github/workflows/azure-static-web-apps-brave-smoke-037a8b003.yml`)
  → **Entschieden (2026-07-23)**: Azure Static Web Apps bleibt kanonisches Deploy-Ziel. GitHub Pages sollte entfernt werden, ist aber technisch nicht abschaltbar: Repo heißt `carofuerhunde.github.io` (Org/User-Pages-Repo), GitHub verweigert die Deaktivierung über die API (`422 Deactivating GitHub pages for this repository is not allowed`) — vermutlich auch über die Settings-UI nicht möglich, da an den Repo-Namen gekoppelt. Pages bleibt daher parallel aktiv; Azure gilt als kanonisch nur auf Doku-/DNS-Ebene, technisch laufen weiterhin beide Deploys.
- **Bestehende Automatisierung als Präzedenzfall**: `.github/workflows/instagram.yml` läuft alle 2h per Cron und committet automatisch Instagram-Post-Updates — funktionierendes Beispiel für "Agent läuft regelmäßig und verändert das Repo".
- **Branch-Namenskonvention deutet auf Jira hin**: Branches wie `CARO-2`, `CARO-11`, `CARO-16`, `CARO-21`, `HUN-5` legen zwei Jira-Projekte nahe (Keys `CARO` und ggf. ein zweites Projekt `HUN`). Für die Jira-Anbindung (Milestone 2) werden noch benötigt: Jira-Site-URL, relevante Projekt-Key(s), Auth-Weg (API-Token oder MCP-Integration).

## Bestätigte Entscheidungen

- **Requirement-Quelle**: Jira (nicht GitHub Issues, nicht Confluence-kombiniert).
- **Autonomie-Rollout**: Start PR-gated → später Hybrid (Risiko-basiert) → später Voll-Autopilot. Stufenweise, nicht direkt.
- **Doku-Tiefe (arc42/C4)**: Leichtgewichtig — ein C4 Context+Container-Diagramm plus kurzes `architecture.md`, kein voller arc42-Kapitelsatz, keine Confluence-Spiegelung (proportional zu einer kleinen statischen Marketing-Seite).
- **Repo**: bestehendes `carofuerhunde/carofuerhunde.github.io` wird weiterverwendet, kein neues Repo.

## Offene Punkte (vor Umsetzung zu klären)

1. Jira-Site-URL + relevante Projekt-Key(s) + Auth-Methode.
2. Arbeitsverzeichnis für zukünftige Sessions/Scheduled-Agents ist ab jetzt `/Users/Martin.Alter/Documents/homepage/caro-fuer-hunde` (nicht mehr `caro-fuer-hundev2`) — `CLAUDE.md`/`.claude/settings.json` hier ggf. an die Automatisierung anpassen.

## Meilensteine

**M0 — Grundlage bereinigen** ✅ (2026-07-23)
- Deploy-Redundanz auflösen → **blockiert**: GitHub Pages technisch nicht abschaltbar (s. Ist-Zustand), Azure gilt nur dokumentarisch als kanonisch, beide Deploys laufen weiter.
- `caro-fuer-hundev2` archivieren → erledigt, umbenannt in `caro-fuer-hundev2.archived-2026-07-23`.
- Sicherstellen dass `main` sauber baut → erledigt: `bundle install`, `npm install`, `npm run css:build` und `JEKYLL_ENV=production bundle exec jekyll build` laufen fehlerfrei durch. (`npm run build` inkl. `fetch-instagram` schlägt lokal ohne `INSTAGRAM_ACCESS_TOKEN` fehl — erwartet, das Secret existiert nur in CI.)
- Offen/nicht Teil von M0, aber notiert: `npm audit` meldet 2 critical vulnerabilities — beide `shell-quote` (transitive Dependency von `concurrently`, nur `devDependency` für `npm run dev`, nicht im Produktionsbuild). Fix verfügbar via `npm audit fix`, aber noch nicht angewendet/geprüft (könnte `concurrently`-Major-Version bumpen).

**M1 — Context Engineering (leichtgewichtig)** ✅ (2026-07-23)
- C4-Context+Container-Diagramm (Mermaid) + kurzes `architecture.md` im Repo → erledigt.
- `CLAUDE.md` aktualisieren (aktueller Stand, Jira-Konventionen, Branch-Naming dokumentieren) → erledigt.
- `.claude/settings.json` für dieses Repo auf Automatisierung vorbereiten (Permissions, ggf. Hooks) → Permissions-Allowlist ergänzt (Build-/Git-Read-/`gh pr`-Kommandos, `gh api` eng auf lesbare Sub-Pfade wie `pulls`, `issues`, `commits`, `actions/runs|workflows` beschränkt, sensible Endpunkte wie `pages`, `hooks`, `keys`, `collaborators` explizit auf `deny`).
- **Offen/blockierend erkannt**: `.gitignore` schließt aktuell das komplette `.claude/`-Verzeichnis aus (Zeile `.claude/`). Dadurch ist `settings.json` nie eingecheckt — die Permissions-Vorbereitung existiert nur lokal auf diesem Rechner, nicht im Repo, und erreicht weder Teammitglieder noch einen künftigen automatisierten Agenten. Muss vor M3 (Scheduled Agent) behoben werden, z.B. durch gezieltes Aufheben des Ignores nur für `settings.json` (nicht für `settings.local.json`). Bewusst noch nicht geändert (Entscheidung 2026-07-23).

**M2 — Jira-Anbindung (Requirement-Quelle)**
Jira-Site/Projekt(e) anbinden. Konvention definieren: Ticket → Branch (`CARO-xx`, bereits etabliert) → PR mit Ticket-Referenz. Agent liest Ticket, versteht Akzeptanzkriterien, implementiert.

**M3 — PR-gated Agent-Loop**
Scheduled Agent (z.B. via `/schedule`) pollt Jira periodisch nach offenen Tickets, implementiert, öffnet PR, verlinkt Ticket. Mensch reviewt und merged manuell. Review-Gates (`code-review`, `verify`) laufen automatisch auf jedem PR.

**M4 — Guardrails verstärken**
CI-Pflichtchecks vor Merge (Build, Lint, ggf. Broken-Link-Check) — Voraussetzung, um den Human-Gate später zu lockern.

**M5 — Hybrid**
Risiko-Klassifizierung: Content-only-Änderungen (Texte, Preise, Team-Daten in `_data/`) nach grünen Checks auto-mergen; strukturelle/Layout-Änderungen bleiben PR-gated.

**M6 — Voll-Autopilot (später, opt-in)**
Human-Gate auch für Low-Risk-Kategorien entfernen — erst wenn M4/M5 stabil laufen und ein Rollback-Mechanismus existiert.
