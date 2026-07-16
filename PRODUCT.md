# Product

## Register

product

## Users

Two audiences, one primary.

- **Primary — field employees (kiosk).** Drivers and warehouse staff logging trip departures and arrivals, often on a shared kiosk terminal or their phone, in a hurry, sometimes with gloves or in poor light. Their job: record a salida/llegada and manage passengers in as few taps as possible, then get back to work. They are not technical and do not want to read.
- **Secondary — fleet admins.** Office staff (admin / superadmin roles) managing vehicles, users, companies, maintenance history, and surveys from dashboards. They need data density and control, but not at the expense of the kiosk flow.

## Product Purpose

Nethive's web app for managing enterprise vehicle fleets used for package delivery. It records trip departures and arrivals, tracks trips in progress, manages passengers, and keeps each vehicle's usage and maintenance history. Success = a field employee completes a departure/arrival log correctly on the first try without help, and an admin can trust the resulting fleet data.

## Brand Personality

Efficient, trustworthy, clear. A utilitarian B2B tool that gets out of the way: obvious next action, no decoration for its own sake, minimal reading. It should read as a serious piece of software from a competent software company (Nethive Soluciones Informáticas), not a toy and not a legacy intranet.

## Anti-references

- **Dated enterprise / ERP.** No grey SAP-style dense tables, tiny fonts, or 2005-intranet look.
- **Consumer / playful.** No rounded bubbly cartoon UI, gamified badges, or emoji-heavy surfaces.
- **Generic AI SaaS.** No purple gradients, no decorative glassmorphism, no hero-metric template, no endless identical icon-card grids.
- **Overloaded dashboard.** No cram-everything-at-once, no chart soup, no missing hierarchy.

## Design Principles

- **Kiosk-first.** The employee departure/arrival flow is the product's spine. Big touch targets, few steps, unmissable primary action. When kiosk needs and admin density conflict, kiosk wins.
- **One obvious action per screen.** The user should never wonder what to do next. Primary action is visually singular; everything else recedes.
- **Legible under pressure.** Designed for glances in poor light, in a hurry. High contrast, generous type, state that's readable at arm's length.
- **Honest density for admins.** Admin views can carry real data, but earn it with hierarchy and grouping — never dump.
- **Quiet confidence.** Restraint is the brand. Polish shows in spacing, states, and correctness, not in effects.

## Accessibility & Inclusion

Target WCAG 2.1 AA (inferred default — adjust if there's a stricter contractual requirement). Kiosk context raises the bar on: body/placeholder text ≥4.5:1 contrast; touch targets ≥44px; state legible at arm's length; full keyboard support for admin flows. Honor `prefers-reduced-motion` on every animation. Don't rely on color alone for status (pair with icon/label). Spanish-language UI.
