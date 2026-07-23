# Automatisierungs-Plan: Context/Agent/Harness Engineering

Status: Entwurf, entstanden in einer Planungs-Session am 2026-07-23. Noch nicht committet — erst review/absegnen.

## Ziel

Requirements werden von Agents automatisch umgesetzt. Startpunkt: PR-gated (Agent implementiert, öffnet PR, Mensch merged). Ziel-Ausbaustufe: Hybrid (risikoarme Änderungen auto-merge), später Voll-Autopilot.

## Ist-Zustand (verifiziert am 2026-07-23)

- **Aktives/kanonisches Repo**: `carofuerhunde/carofuerhunde.github.io` (public, Admin-Zugriff vorhanden). Lokal unter `/Users/Martin.Alter/Documents/homepage/caro-fuer-hunde`.
- `main` ist bereits der v2-Rebuild (Tailwind CSS 4 + Alpine.js). Der Branch `v2-preview` wurde bereits in `main` gemerged.
- Das Verzeichnis `/Users/Martin.Alter/Documents/homepage/caro-fuer-hundev2` ist ein **veralteter, verwaister Stand** ohne Git-Remote/Commits — nicht weiter verwenden, kann archiviert/gelöscht werden.
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

**M0 — Grundlage bereinigen**
Deploy-Redundanz auflösen, `caro-fuer-hundev2` archivieren, sicherstellen dass `main` sauber baut/deployed. Kein Coding, nur Aufräumen — Voraussetzung für alles Weitere.

**M1 — Context Engineering (leichtgewichtig)**
C4-Context+Container-Diagramm (Mermaid) + kurzes `architecture.md` im Repo. `CLAUDE.md` aktualisieren (aktueller Stand, Jira-Konventionen, Branch-Naming dokumentieren). `.claude/settings.json` für dieses Repo auf Automatisierung vorbereiten (Permissions, ggf. Hooks).

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
