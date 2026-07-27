Transient confirmation toast (booking confirmed, settings saved) — floats bottom-center or bottom-right, auto-dismisses after a few seconds.

```jsx
<Toast variant="success" onClose={() => setShow(false)}>Your booking request has been sent.</Toast>
```

Dark Bush surface (matches CTA bands) rather than a light card — keeps toasts visually distinct from page content. Accent dot signals success (olive) or error (red).
