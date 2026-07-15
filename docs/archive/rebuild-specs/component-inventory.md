# Component Inventory (React / Next.js)

Mapped to screens in [../01-information-architecture.md](../01-information-architecture.md). Names are proposals for the rebuild.

## Primitives (design-system package `@app/ui`)
`Button` (variants: primary/ghost/text/danger, sizes, loading, disabled), `IconButton`, `Input`, `TextArea`, `Select`, `Combobox` (async + local, ARIA), `Checkbox`, `RadioGroup`, `DatePicker`, `FileUpload` (presigned), `Badge`/`Chip`, `Tag`, `Avatar` (with progress ring), `Tooltip`, `Card`, `Table` (sortable, empty state, row actions), `Tabs` (count badges), `Stepper`, `Modal`/`Dialog`, `ConfirmDialog`, `Toast`/`Toaster`, `Dropdown`/`Menu`, `Pagination`, `Spinner`/`Skeleton`, `EmptyState`, `StatTile` (KPI), `Chart` (Recharts wrapper), `Map` (MapLibre wrapper), `RichTextEditor`.

## App shell
`AppShell` (top utility bar + primary nav + `OverflowMenu` for Clients/Insights), `PlanBadge`, `SettingsSidebar` (grouped), `PageHeader`, `Footer`, `SupportWidget`.

## Requests
`RequestBoard` (status `StatusTabs` with counts, `HandledByFilter`, `SortSelect`, `RequestSearch`), `RequestList`/`RequestCard`, `AddRequestWizard` (`Step1ClientInfo`, `Step2RequestDetails`, `ExistingClientPicker`, `TemplatePicker`, `RepeatableRows` for group/room), `RequestDetail` (`RequestSubTabs`: Info/Quotes/TourInfo/Tasks/Notes), `InlineEdit` (ref/date/source/handled-by), `StatusActions` (setBooked/prebooked/notbooked/archive), `TravelersTable`, `FlightsTable`, `TasksChecklist`, `NotesList`, `ResponsibleUser`, `TourStaffTable`, `VehiclesTable`.

## Quote builder
`QuoteWizard` (`WizardNav`: day-by-day/pricing/preview/finish), `DayByDayBuilder` (`DayCard`: `CountrySelect`, `AccommodationPicker`, `ActivityPicker`, `MealPlan`, `OptionsEditor`, day controls copy/clear/delete/add-before/after), `PricingEditor` (`PositionRow`, `MarginControls`, `CurrencySelect`, `PaxTierPricing`, `AddMissingPositions`), `PreviewEditor` (`RichTextEditor`, `ImagePicker`, `DigitalPreview`), `FinishStep` (`SendQuoteForm`, `GeneratePdfButton`, `VersionList`).

## Public proposal (separate Next.js route/app)
`DigitalProposal` (hero, day-by-day timeline, gallery, inclusions/exclusions, pricing summary, T&C, CTA), responsive + tenant-branded; server-rendered; same template feeds PDF.

## Content Library
`ContentLibraryHub` (section grid + `ContentFilterTabs` with/without/archived), `ContentList`, `ContentItemEditor` (`MediaTabs`: Description/Images/Covers/Videos), `UploadForm`, plus type-specific: `DestinationEditor`, `ActivityEditor`, `ThemeEditor`, `CountryEditor`, `VehicleEditor`, `TourStaffEditor`.

## Accommodations
`AccommodationsDirectory` (`FacetSidebar`: countries/type/class/services/facilities/amenities/room-types/location, `GeoRadiusSearch`, `ViewToggle` list/map, `SortSelect`, `FavoritesTabs`, `PremiumBadge`), `AccommodationCard`, `AccommodationMap`, `AccommodationDetail`.

## Clients (CRM)
`ClientsTable` (search + pagination), `ClientForm`, `ClientDetail` (requests rollup).

## Insights
`InsightsDashboard` (`DateRangeFilter`, `UserFilter`, `IncludeArchivedToggle`), `KpiRow` (`StatTile`×N), `SourceChart`, `ConversionFunnel`.

## Settings
`ProfilePage` (`ProfileForm`, `SignatureEditor`, `TwoFactorSetup`, `NotificationSettings`, `AccountProgress`), `SystemSettingsForm` (currencies/date/refno/quote-version), `UsersTable` (`InviteUserModal`, `UserRow` lifecycle actions), `CompanyForm`, `BillingForm`, `SubscriptionPanel`, `AddonStore` (`AddonCard`, `AddonDetail`).

## Cross-cutting
`AuthProvider`, `TenantProvider`, `ReferenceDataProvider` (version-map cache), `RequireRole`, `ErrorBoundary`, `NotFound`/`Forbidden`/`ServerError` pages.
