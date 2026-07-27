Underline tab bar for switching sub-views (admin content tabs: Tours / Destinations / Accommodations).

```jsx
<Tabs tabs={['Tours', 'Destinations', 'Accommodations']} value={active} onChange={setActive} />
```

Active tab gets a 2px olive underline and darker text — no background pill.
