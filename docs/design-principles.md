# App Design Principles & Philosophy

This document summarizes the core principles and philosophies to follow when designing and developing new features for this project. Use these as a reference to ensure consistency and alignment with the project's vision.

## 1. User Data Ownership
- The system gives users full control over their data.
- Do **not** store or retain user data on the server or in any centralized location unless absolutely necessary.
- All data operations should prioritize user privacy and transparency.

## 2. UI/UX Design
- **Card-based UI:** Use card layouts as the primary design pattern for displaying and interacting with content.
- **Minimalism:** Keep interfaces clean, simple, and free of unnecessary elements.
- **Essential Features Only:** Implement only the most essential features. Avoid feature bloat and unnecessary complexity.
- **Conciseness:** Use minimal text and clear iconography. Avoid verbose instructions or labels.
- **No Over-Engineering:** Solutions should be as simple as possible. Avoid adding layers of abstraction or complexity unless justified by real user needs.

### UI Design Conventions (Based on Current App)
- **Consistent Spacing & Padding:** Use consistent spacing between cards, sections, and UI elements for a balanced look.
- **Rounded Corners:** All cards, buttons, and input fields should use a consistent border-radius for a modern, friendly feel.
- **Shadow & Elevation:** Use subtle shadows for cards and modals to create depth, but avoid heavy or distracting effects.
- **Primary Color Usage:** Stick to the defined primary color palette for main actions, highlights, and navigation. Avoid introducing new colors unless necessary.
- **Iconography:** Use clear, recognizable icons. Prefer outlined icons for actions, and filled icons for status/indicators.
- **Button Design:** Buttons should be clearly distinguishable (primary, secondary, destructive). Use full-width buttons for mobile, and compact buttons for desktop where appropriate.
- **Form Inputs:** Inputs should have clear focus states, labels, and error messages. Use placeholders sparingly.
- **Modal & Dialogs:** Use modals for critical actions or confirmations only. Avoid excessive use of popups.
- **Responsiveness:** All UI components must be responsive and work well on both desktop and mobile devices.
- **Section Headings:** Use clear, bold section headings. Avoid unnecessary sub-headings or visual clutter.
- **Feedback & Loading:** Always provide user feedback for actions (loading spinners, success/error toasts, etc.).
- **Navigation:** Sidebar navigation for desktop, bottom navigation for mobile. Keep navigation options minimal and intuitive.

## 3. Internationalization
- All new features must support both English and Vietnamese.
- Ensure UI elements, messages, and content are easily translatable and tested in both languages.

## 4. General Principles
- Prioritize user empowerment and autonomy in all design decisions.
- Maintain consistency in design, code structure, and user experience.
- Document new features and design decisions clearly for future reference.

---

**Always review this document before starting new features or making significant changes.**
