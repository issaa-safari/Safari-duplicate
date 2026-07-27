Centered modal for short admin create/edit flows (new destination, new activity). Dark forest scrim behind, white rounded sheet, footer bar for actions.

```jsx
<Dialog
  title="Create Destination"
  onClose={close}
  footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button variant="primary">Create</Button></>}
>
  <Field label="Name" required />
  <TextareaField label="Description (English)" rows={3} />
</Dialog>
```

Scrim is `rgba(26,46,19,0.55)` (forest-tinted, not neutral black). Click outside or the × to close.
