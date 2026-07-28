# AgentPress Design System Token Documentation

## Overview

This document outlines the design tokens established in Stage 1 of the UI modernization project. These tokens provide a consistent language for colors, shadows, spacing, and transitions across the codebase.

**Last Updated:** 2026-06-30

---

## Color Tokens

### Semantic Colors

All semantic colors are now aliased to stable Tailwind palettes. When you need to change a semantic meaning (e.g., make success more prominent), update the token alias in `tailwind.config.ts`, not individual components.

| Token | Tailwind Base | Usage | Examples |
|-------|---------------|-------|----------|
| `success` | `emerald` | Positive outcomes, confirmations | ✅ `bg-success-50`, `text-success-700` |
| `warning` | `amber` | Pending states, caution | ⚠️ `bg-warning-50`, `text-warning-700` |
| `danger` | `rose` | Errors, destructive actions | ❌ `bg-danger-50`, `text-danger-700` |
| `info` | `sky` | Informational content, hints | ℹ️ `bg-info-50`, `text-info-700` |
| `brand` | Custom blue-purple | Brand primary, interactive elements | 🎨 `bg-brand-600`, `text-brand-700` |

**Color Palette Scales:**
- `{token}-50` — Extra light background, hover state
- `{token}-100` — Light background, disabled state
- `{token}-200` — Border, muted text
- `{token}-500` — Solid fill, emphasis
- `{token}-600` — Darker interaction, icon on light
- `{token}-700` — Darkest text, high contrast

**Usage Examples:**

```tsx
// Alert with semantic color
<Alert variant="success">Order confirmed</Alert>

// Badge with semantic color
<Badge variant="danger">Pending Review</Badge>

// Button danger action
<Button variant="danger">Delete Item</Button>
```

---

## Shadow Tokens

Shadows create elevation and depth. Use the appropriate shadow level for the context:

| Token | CSS | Use Case |
|-------|-----|----------|
| `shadow-card` | `0 1px 2px / 0 1px 3px` | Flat cards, list items, inputs — default elevation |
| `shadow-card-hover` | `0 4px 6px / 0 2px 4px` | Card hover state, elevated surfaces |
| `shadow-elevated` | `0 10px 15px / 0 4px 6px` | Floating UI, dropdowns, modals |
| `shadow-popover` | `0 20px 25px / 0 8px 10px` | Tooltips, popovers, dialogs |
| `shadow-ring` | Focus ring shadow | Used with `ring-*` classes (implicit) |

**Usage:**

```tsx
// Base card
<div className="rounded-lg border shadow-card">Content</div>

// Hoverable card — transitions to elevated on hover
<div className="transition-shadow hover:shadow-card-hover">Card</div>

// Modal backdrop
<div className="shadow-popover">Modal</div>
```

---

## Spacing Rhythm

Section spacing follows a three-tier system matched to breakpoints, preventing arbitrary `py-10`/`py-12` throughout:

| Class | Value | Breakpoint | Use Case |
|-------|-------|-----------|----------|
| `py-section-sm` | 2rem (32px) | All | Tight spacing: list sections, form sections |
| `py-section-md` | 3rem (48px) | All | Default: most sections, features |
| `py-section-lg` | 5rem (80px) | All | Hero, featured sections, major breaks |

Combine with responsive prefixes:

```tsx
// Responds to screen size: tight on mobile, wider on desktop
<section className="py-section-sm sm:py-section-md lg:py-section-lg">
  Featured content here
</section>
```

---

## Component Variants

### Button

**Variants:**
- `primary` (default) — High-emphasis dark action
- `secondary` — Medium-emphasis brand action
- `outline` — Lowest-emphasis bordered action
- `ghost` — Flat text action
- `danger` — Destructive/warning action (red)

**Sizes:**
- `sm` — 36px height, 12px text (form/inline)
- `md` (default) — 44px height, 14px text
- `lg` — 48px height, 14px text (hero CTAs)
- `icon` — 40px square (icon-only buttons)

**Props:**
- `loading` — Show spinner, disable button
- `loadingText` — Optional text to show while loading (replaces children)
- `fullWidth` — Stretch to container width
- `leftIcon` / `rightIcon` — Icon nodes

```tsx
<Button variant="danger" loading>Deleting...</Button>
<Button size="icon" leftIcon={<TrashIcon />} />
<Button fullWidth>Submit</Button>
```

### Alert

**Variants:**
- `success` — Confirms successful actions
- `error` — Displays errors
- `warning` — Alerts and caution
- `info` (default) — General information

**Props:**
- `title` — Bold header text
- `children` — Description/details
- `onDismiss` — Callback to show close button

```tsx
<Alert variant="error" title="Something went wrong">
  Please try again or contact support.
</Alert>

<Alert 
  variant="success" 
  title="Saved!" 
  onDismiss={() => setShowAlert(false)}
/>
```

### Badge

**Variants:**
- Same semantic colors as Alert: `success`, `warning`, `danger`, `info`, `neutral`, `brand`

**Props:**
- `size` — `sm` (10px text) or `md` (12px text)
- `dot` — Show colored dot prefix

```tsx
<Badge variant="warning" dot>Pending</Badge>
<Badge variant="success" size="sm">Live</Badge>
```

### EmptyState

**Sizes:**
- `sm` — Compact inline empty state (forms)
- `md` (default) — Standard empty state (lists)
- `lg` — Full-page empty state (no results page)

**Props:**
- `icon` — Lucide icon component (required)
- `title` — Heading (required)
- `description` — Subheading
- `actions` — JSX for button(s)

```tsx
<EmptyState
  icon={SearchIcon}
  title="No results found"
  description="Try adjusting your search filters"
  actions={<Button>Clear filters</Button>}
  size="lg"
/>
```

---

## Utility Classes

### Global Focus Ring

All native interactive elements (`<button>`, `<a>`, `<input>`) get a consistent focus ring via `*:focus-visible` in globals.css. For custom interactive divs, add the `.focus-ring` class:

```tsx
<div 
  role="button" 
  tabIndex={0}
  className="focus-ring cursor-pointer"
  onClick={handleClick}
>
  Custom button
</div>
```

### Transition Base

Use `.transition-base` for smooth state changes (hover, active, etc.):

```tsx
<div className="transition-base hover:shadow-card-hover">
  Hover to see effect
</div>
```

### Interactive Surface

For cards/items that link out, use `.interactive-surface` to get consistent hover lift:

```tsx
<Link className="interactive-surface rounded-lg p-4">
  Card content
</Link>
```

---

## Migration Guide

### For Existing Code

If you're updating old code that uses raw color names (emerald, rose, amber, sky), prefer semantic tokens:

**Before:**
```tsx
<div className="bg-emerald-50 text-emerald-700">Success</div>
<div className="bg-rose-50 text-rose-700">Error</div>
```

**After:**
```tsx
<div className="bg-success-50 text-success-700">Success</div>
<div className="bg-danger-50 text-danger-700">Error</div>
```

### New Features

When building new UI, use components and tokens:

```tsx
// ✅ Use component
<Alert variant="success" title="Done!">Task completed</Alert>

// ✅ Use token classes directly
<div className="rounded-lg bg-info-50 p-4 text-info-700">
  Informational card
</div>

// ❌ Avoid hardcoding colors
<div className="rounded-lg bg-blue-50 p-4">Don't do this</div>
```

---

## Design Files & References

- **Tailwind Config:** `tailwind.config.ts`
- **Global Styles:** `src/app/globals.css`
- **Components:** `src/components/ui/`
- **UI Components:** `src/components/ui/`

---

## Notes

- Stage 2 and 3 UI work (mobile fixes, unified alerts, Sonner toasts, hero, empty states, navigation refactor) has been completed in v0.6.x.
- This document serves as a living reference for the design token system.
