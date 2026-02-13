# UI Design Constraints

## Typography

### 1. No Italics
- **Rule**: Do NOT use italicized text anywhere in the application.
- **Enforcement**: 
  - CSS: `font-style: normal !important` is applied globally in `globals.css`.
  - Do not use the `italic` Tailwind class.
  - Do not use `<i>` or `<em>` tags unless explicitly styled as normal.

### 2. No All-Caps
- **Rule**: Do NOT use all-uppercase text styles for headings, buttons, badges, or labels.
- **Enforcement**:
  - Do not use the `uppercase` Tailwind class.
  - Do not use `text-transform: uppercase` in CSS.
  - Use **Title Case** or **Sentence case** for text content.
  - Avoid `tracking-widest` as it is typically paired with uppercase.

### 3. Tracking
- **Rule**: Use standard tracking or `tracking-tight` for headings.
- **Enforcement**:
  - Avoid `tracking-widest` (typically used with uppercase).
