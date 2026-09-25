# Smart Generator Monitoring

## Scope

Login leads to Dashboard. The sidebar contains Dashboard, Users, Generators,
Maintenance, Notifications, Configuration, and Logout. Keep the interface focused
on monitoring and basic administration, with no additional alert-management system.

## Screens

- Login: username and password, with accessible validation and error feedback.
- Dashboard: generator selection, generator status, AC voltage, AC current,
  frequency, temperature, fuel level, runtime, and maintenance status only.
- Users: name and role; add a user. Roles are Admin, Operator, and Viewer.
- Generators: name, location, and assigned user; add a generator by selecting a user.
- Maintenance: parameter, value, and evaluated status for temperature, voltage,
  frequency, and fuel; oil-service progress and hours remaining.
- Notifications: generator, condition, measured value or service reminder, and
  Active or Resolved state.
- Configuration: administrator-managed central thresholds and service interval.

## Data rules

Each generator has one assigned user; a user may have multiple generators.
Readings belong to a generator and include a measurement timestamp.
Do not present the wireframe's illustrative readings as live measurements.
Missing or stale telemetry must remain visibly unavailable or stale; never infer
Running or Normal from missing data.

Store runtime numerically in seconds and format it into hours and minutes.
Track oil service separately using runtime at the last service: service hours
equal total runtime minus runtime at the last service. Total runtime and service
hours must not be confused.

## Central configuration defaults from the brief

| Parameter   | Warning           | Critical          |
| ----------- | ----------------- | ----------------- |
| Temperature | 85 °C             | 95 °C             |
| Voltage     | Outside 210–250 V | Outside 190–260 V |
| Frequency   | Outside 49–51 Hz  | Outside 47–53 Hz  |
| Fuel        | 20%               | 10%               |

Oil service interval: 250 hours.

Evaluate critical conditions before warnings. Temperature uses upper limits and
fuel uses lower limits. Validate that warning ranges are inside critical ranges,
fuel percentages are 0–100, and service intervals are positive. Use the same
configuration and evaluation logic for dashboard, maintenance, and notifications.

## Outstanding integration decisions

- Working application versus visual prototype.
- Generator telemetry source, transport, units, refresh cadence, and stale timeout.
- Authentication provider and initial administrator provisioning for a working app.
- Exact role permissions beyond administrator-only configuration.

For a working application, authentication and authorization must be enforced on
the server. A visual prototype must explicitly label sample readings and must not
claim to provide secure login or durable shared records.
