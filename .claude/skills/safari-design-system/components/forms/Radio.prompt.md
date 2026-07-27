Circular radio for single-choice groups (tour type, room type, payment method).

```jsx
<Radio name="trail" checked={trail === 'bike'} onChange={() => setTrail('bike')} label="Group Bike Tour" />
<Radio name="trail" checked={trail === 'private'} onChange={() => setTrail('private')} label="Private Safari" />
```

Group radios in a single `name` and render them stacked with 12px gaps.
