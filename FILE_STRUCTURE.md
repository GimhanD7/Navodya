# File structure

The application uses one HTML entry point. Each screen has its own JavaScript
module; shared styles and layout remain centralized.

```text
public/
  index.html                  HTML entry point
  app.js                      Starts the application
  styles.css                  Shared styles
  polish.css                  Shared visual refinements
  js/
    application.js            Rendering, session startup, dashboard polling
    api.js                    Shared HTTP client
    state.js                  Shared application state
    icons.js                  Icons and DOM selectors
    services/
      data.js                 Loads workspace data
    ui/
      shell.js                Sidebar, header, navigation, logout
    pages/
      index.js                Page registry and event-handler mapping
      login.js                Sign-in form and submission
      dashboard.js            Readings and generator selection
      users.js                User list and add/edit/delete handlers
      generators.js           Generator list
      maintenance.js          Maintenance and service status
      notifications.js        Notification list
      configuration.js        Threshold forms and save handlers
routes/
  api.js                      Mounts feature routers
  auth.js                     Login, logout, session
  users.js                    User endpoints
  generators.js               Generator and telemetry endpoints
  notifications.js            Notification endpoints
  config.js                   Configuration endpoints
lib/
  auth.js                     Session signing and authentication middleware
  db.js                       Database connection pool
  status.js                   Status and threshold helpers
  status.test.js              Status helper tests
server.js                     Express setup and static file serving
```

Page modules export their markup function and, when needed, a binding function.
Binding functions receive the shared `render` callback, avoiding imports back
into the application entry point. Register pages and their bindings in
`public/js/pages/index.js`.

API URLs remain unchanged. Maintenance uses the configuration and generator
endpoints; it does not require a separate backend router.

Run `npm test` for the existing tests and
`npx eslint public/app.js public/js routes` to check the application modules.
