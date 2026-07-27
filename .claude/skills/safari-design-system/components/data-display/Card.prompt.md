`Card` is the base white rounded container used everywhere (testimonials, why-direct points, departure rows). `FeatureCard` is the full-bleed photo card used for "Choose Your Trail" (bike vs. private).

```jsx
<Card hoverable>
  <h3>No agency markup</h3>
  <p>You're quoting directly with the operator who runs the trip.</p>
</Card>

<FeatureCard
  imageUrl="/photos/bike-tour.jpg"
  accent="var(--accent-bike)"
  badge="Group Bike Tours"
  heading="Ride the Bush"
  body="Expert-led group rides from Nairobi to the coast."
  cta="Explore Bike Tours"
  href="/tours"
/>
```

`Card` corners are 12px; `FeatureCard` corners are 16px (feature-card radius) with the image itself carrying the corner rounding via `overflow: hidden`.
