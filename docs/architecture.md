# Architektur

Leichtgewichtige C4-Dokumentation (Context + Container) für `carofuerhunde/carofuerhunde.github.io`. Stand: 2026-07-23. Kein voller arc42-Kapitelsatz — proportional zu einer kleinen statischen Marketing-/Info-Website.

## Context

Wer nutzt das System und mit welchen externen Systemen spricht es.

```mermaid
C4Context
    Person(besucher, "Website-Besucher", "Interessent:in für Hundetraining, Betreuung, Welpenkurse")
    Person(caro, "Caro (Betreiberin/Editorin)", "Pflegt Inhalte, verwaltet Anfragen und Buchungen")
    Person(agent, "Agent (geplant, M2+)", "Setzt Jira-Requirements automatisiert um")

    System(site, "caro-fuer-hunde.de", "Statische Jekyll-Website: Leistungen, Team, Preise, Welpen, Kontakt")

    System_Ext(github, "GitHub", "Quellcode, Actions CI/CD, Repo carofuerhunde/carofuerhunde.github.io")
    System_Ext(azure, "Azure Static Web Apps", "Kanonisches Hosting (dokumentarisch)")
    System_Ext(ghpages, "GitHub Pages", "Paralleles Hosting, technisch nicht abschaltbar")
    System_Ext(formspree, "Formspree", "Verarbeitet Kontaktformular-Einsendungen")
    System_Ext(etermin, "eTermin.net", "Terminbuchung für Workshops/Kurse")
    System_Ext(instagram, "Instagram Graph API", "Liefert die letzten Posts für die Startseite")
    System_Ext(jira, "Jira (geplant, M2+)", "Requirement-Quelle: Tickets CARO-xx, HUN-xx")

    Rel(besucher, site, "besucht, sendet Kontaktanfrage, bucht Termin")
    Rel(caro, github, "pflegt Inhalte via Git/PR")
    Rel(agent, jira, "liest Tickets (geplant)")
    Rel(agent, github, "öffnet PRs (geplant)")
    Rel(github, azure, "deployed bei Push auf main")
    Rel(github, ghpages, "deployed bei Push auf main (Legacy, nicht deaktivierbar)")
    Rel(site, formspree, "Formular-Submit (POST)")
    Rel(site, etermin, "Buchungslink")
    Rel(github, instagram, "Cron holt Posts alle 2h, committet _data/instagram.json")
```

## Container

Wie das System intern aufgebaut ist.

```mermaid
C4Container
    Person(besucher, "Website-Besucher")
    Person(caro, "Caro (Editorin)")

    System_Boundary(repo, "carofuerhunde/carofuerhunde.github.io") {
        Container(jekyll, "Jekyll-Site", "Jekyll 4, Ruby", "Layouts, Includes, Seiten (index, leistungen, team, preise, termine, welpen, kontakt, impressum, datenschutz)")
        Container(tailwind, "Tailwind Build", "Tailwind CSS 4", "input.css -> main.css, Design-Tokens in @theme")
        Container(alpine, "Alpine.js", "Alpine.js 3 (CDN)", "Mobile-Menü, kleine Interaktivität im Browser")
        Container(data, "_data/*.yml + instagram.json", "YAML/JSON", "Navigation, Services, Team, Welpen, Instagram-Cache")
        Container(instaScript, "fetch-instagram.js", "Node-Script", "Holt Posts via Instagram Graph API, schreibt _data/instagram.json")
        Container(ciAzure, "Azure Workflow", "GitHub Actions", "npm ci, css:build, jekyll build, Deploy zu Azure SWA")
        Container(ciPages, "Pages Build", "GitHub-managed", "Legacy Pages-Build/Deploy, nicht im Repo als Workflow-Datei")
        Container(ciInsta, "Instagram Workflow", "GitHub Actions, Cron 2h", "Führt fetch-instagram.js aus, committet Änderungen")
    }

    System_Ext(azureHost, "Azure Static Web Apps", "Hosting, kanonisch")
    System_Ext(ghpagesHost, "GitHub Pages", "Hosting, parallel")
    System_Ext(formspree, "Formspree")
    System_Ext(etermin, "eTermin.net")
    System_Ext(igApi, "Instagram Graph API")

    Rel(besucher, azureHost, "HTTPS")
    Rel(besucher, ghpagesHost, "HTTPS (falls verlinkt/indexiert)")
    Rel(caro, jekyll, "bearbeitet Inhalte via Git")
    Rel(jekyll, data, "liest zur Build-Zeit")
    Rel(jekyll, tailwind, "bindet main.css ein")
    Rel(jekyll, alpine, "lädt via CDN im Layout")
    Rel(ciAzure, jekyll, "baut")
    Rel(ciAzure, azureHost, "deployed")
    Rel(ciPages, jekyll, "baut (GitHub-intern)")
    Rel(ciPages, ghpagesHost, "deployed")
    Rel(ciInsta, instaScript, "führt aus")
    Rel(instaScript, igApi, "GET Posts")
    Rel(instaScript, data, "schreibt instagram.json")
    Rel(jekyll, formspree, "Kontaktformular POST (Client-seitig)")
    Rel(jekyll, etermin, "Buchungslink (Client-seitig)")
```

## Hinweise zu den Diagrammen

- **Zwei Hosting-Ziele parallel**: Azure Static Web Apps ist dokumentarisch kanonisch (Entscheidung 2026-07-23), GitHub Pages läuft technisch weiter mit (nicht abschaltbar, da Repo-Name `carofuerhunde.github.io`). Details: [`automation-plan.md`](./automation-plan.md).
- **Kein Backend/Datenbank**: alles statisch generiert zur Build-Zeit; einzige Laufzeit-Integrationen sind Formspree (Formular) und eTermin (Buchung), beide client-seitig verlinkt/gepostet.
- **Instagram-Daten sind gecacht**: `_data/instagram.json` wird alle 2h von einem Cron-Workflow aktualisiert und eingecheckt, nicht zur Laufzeit abgerufen.
- **Agent/Jira-Bausteine sind geplant** (M2+), noch nicht implementiert — im Context-Diagramm als Ausblick enthalten.
