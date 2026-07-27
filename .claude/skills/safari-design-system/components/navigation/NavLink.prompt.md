Header building blocks: `LanguageToggle` (EN / العربية switch, always in the header's far end) and `NavLink` (plain text nav item with an active state — no underline, weight/color change only).

```jsx
<LanguageToggle value={lang} onChange={setLang} />
<NavLink active>Tours</NavLink>
<NavLink>Departures</NavLink>
```

`LanguageToggle` always sits after a vertical hairline divider at the end of the nav, before the "Request Quote" CTA.
