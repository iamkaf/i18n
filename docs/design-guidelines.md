# i18n.kaf.sh Design Guidelines

## Product intent

i18n.kaf.sh is an atelier for Kaf's Minecraft mods.

- Not a SaaS
- Not a multi-tenant platform
- Not a generic translation service

Every design and copy decision should reinforce that this is a focused workshop.

## Visual principles

1. **Warm precision**: friendly but disciplined
2. **Clear hierarchy**: important actions are obvious
3. **Low noise**: avoid decorative clutter that hides information
4. **Purpose over novelty**: components exist to move translation work forward

## Voice and copy

Use:

- "atelier", "contributors", "trusted translators", "exports"
- direct, concise action labels
- technical clarity for auth/token/export behavior

Avoid:

- SaaS language ("customers", "plans", "workspaces", "growth")
- inflated marketing claims
- vague CTA copy

## Token system

Defined in `src/app/globals.css`:

- `--atelier-bg`
- `--atelier-surface`
- `--atelier-surface-soft`
- `--atelier-text`
- `--atelier-muted`
- `--atelier-accent`
- `--atelier-accent-strong`
- `--atelier-highlight`
- `--atelier-success`
- `--atelier-danger`
- `--atelier-border`
- `--atelier-shadow`
- `--atelier-radius`
- `--atelier-radius-lg`

Utility classes:

- `.atelier-page`
- `.atelier-shell`
- `.atelier-card`
- `.atelier-muted`
- `.atelier-ring`

## Typography

- Display: `var(--font-syne)` for major headlines
- Body/UI: `var(--font-geist-sans)`
- Code/token snippets: `var(--font-geist-mono)`

Rules:

- Keep headline density low
- Prefer sentence case for body and labels
- Reserve full uppercase for small metadata labels only

## Component patterns

Primary components live in `src/components/atelier/`:

- `app-shell.tsx`
- `hero-section.tsx`
- `section-heading.tsx`
- `feature-card.tsx`
- `status-pill.tsx`
- `action-row.tsx`
- `form-field.tsx`

Guidance:

- Use `FeatureCard` for information blocks
- Use `StatusPill` for finite states (public/private/trusted/approved/pending)
- Use `ActionRow` for section-level CTA groups
- Keep form helper text specific and short

## Interaction rules

- Focus states must be visible (`.atelier-ring`)
- Hover states should clarify affordance, not distract
- Motion should be subtle (150ms-250ms transitions)

## Accessibility baseline

- Preserve keyboard navigation order
- Ensure focusable elements have visible focus styles
- Maintain readable contrast for text and interactive controls
- Do not rely on color alone for critical state understanding

## Do / Don't

Do:

- keep layouts breathable and readable
- explain private/public export rules clearly
- prefer simple cards and direct actions

Don't:

- introduce dashboard complexity without workflow value
- add features that imply multi-tenant SaaS ambitions
- overload pages with decorative effects
