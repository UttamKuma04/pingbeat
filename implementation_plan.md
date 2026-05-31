# PinBEAT Frontend Enhancement Plan
## Inspired by Datadog, New Relic & Elastic APM

This plan enhances the PinBEAT frontend to match the page structure, features, and data presentation patterns of industry-leading monitoring platforms — **without any backend changes**. All features use existing API endpoints.

---

## Reference Platform Analysis Summary

| Feature Area | Datadog | New Relic | Elastic APM | PinBEAT Current | Gap |
|---|---|---|---|---|---|
| **Navigation** | Collapsible sidebar, global search, org switcher | Left sidebar, entity explorer, Cmd+K search | Collapsible sidebar, breadcrumbs, spaces | Top navbar only, 5 links | 🔴 Major |
| **Dashboard** | Widget-based, stats cards, host map, template vars | Entity explorer, golden signals, lookout view | Overview tiles, log rate chart, alerts | Simple list + 3 stat cards | 🟡 Moderate |
| **Monitor Detail** | Rich trace detail, flame graphs, span tables | Transaction breakdown, JVM metrics, error detail | Waterfall timeline, comparison mode, dependencies | Good foundation (chart, SLA, incidents, maintenance) | 🟢 Minor |
| **Analytics** | Metrics explorer, custom queries, dashboards | NRQL query builder, custom dashboards, SLO tracker | Lens editor, Kibana dashboards, ML anomalies | Basic (heatmap, slowest, incidents) | 🟡 Moderate |
| **APM** | Service list, trace explorer, flame graph, service map | APM summary, transactions, distributed tracing | Services, traces, service map, dependencies | Basic (traffic bars, endpoints, errors) | 🟡 Moderate |
| **Incidents** | Monitors list with status/mute/history | Alerts & AI, incident intelligence, correlations | Alert rules, execution history, connectors | Only in Analytics timeline | 🔴 Major |
| **Logs** | Log explorer, faceted search, patterns, live tail | Log stream, live tail, patterns, facets | Log stream, categories, anomalies | No dedicated page | 🔴 Major |
| **Status Pages** | N/A (3rd party) | N/A | N/A | Good (manager + public page) | 🟢 Minor |
| **Settings/Profile** | User settings, API keys, integrations | Account settings, API keys, user preferences | Stack management, integrations | None | 🔴 Major |
| **Common Patterns** | Time picker, filter chips, sparklines, tooltips | Time picker, NRQL, entity tags, drill-down | KQL, filter chips, comparison mode, annotations | Basic search/filter, simple selects | 🟡 Moderate |

---

## User Review Required

> [!IMPORTANT]
> This plan is **frontend-only** — no backend API changes. All features are built using existing endpoints from [api.js](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/services/api.js). Some "premium" features (like real-time log streaming, service maps) will use mock data or computed views from existing data until backend support is added.

> [!WARNING]
> The navigation redesign (Phase 1) changes the fundamental layout structure from a top navbar to a sidebar. This is a major structural change that affects every page. We should agree on this before proceeding.

---

## Open Questions

> [!IMPORTANT]
> **Q1: Sidebar Navigation — Do you want to move from the current top navbar to a collapsible sidebar (like Datadog/Elastic) or keep the top navbar and just enhance it?**
> - A sidebar gives more room for nested navigation as the product grows
> - A top navbar is simpler but gets crowded with more links
>
> **Q2: Dark Mode — Do you want a dark mode toggle?** All three reference platforms support dark themes. Your current design is light-only.
>
> **Q3: Priority — Which phases would you like done first?** I've organized by impact but can reorder based on your preference.

---

## Proposed Changes

### Phase 1 — Navigation & Layout Shell

Redesign the global navigation and page shell to match professional monitoring platforms.

**Inspiration:** Datadog's collapsible sidebar + New Relic's Cmd+K search + Elastic's breadcrumbs

---

#### [MODIFY] [Navbar.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/Navbar.jsx)

Transform from a simple horizontal navbar to a professional sidebar navigation:

- **Collapsible sidebar** (expanded = icon + label, collapsed = icon only)
  - Sections with headers: "Monitoring", "Performance", "Management"
  - Navigation items:
    - 📊 Dashboard (`/dashboard`)
    - 🖥️ Monitors → links to dashboard with monitor focus
    - 📈 Analytics (`/analytics`)
    - ⚡ APM (`/apm`)
    - 🚨 Incidents (`/incidents`) — **NEW page**
    - 📋 Logs (`/logs`) — **NEW page**
    - 🌍 Status Pages (`/status-pages`)
    - ⚙️ Settings (`/settings`) — **NEW page**
  - Active route indicator (highlighted background + left border accent)
  - Collapse/expand toggle button at bottom
  - Logo at top with collapse to icon
  - User avatar + menu at bottom of sidebar

- **Top bar** (slim, always visible):
  - Breadcrumb trail (e.g., `Dashboard > Monitor > my-api`)
  - Global search (Cmd+K style) — searches monitors, incidents, status pages
  - Global time range picker (Last 1h, 6h, 24h, 7d, 30d, custom)
  - Auto-refresh indicator
  - Notification bell (shows recent incidents)

---

#### [NEW] [Breadcrumb.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/Breadcrumb.jsx)

Breadcrumb navigation component:
- Auto-generates from current route
- Clickable segments
- Truncates long names with tooltip
- Reference: Elastic APM breadcrumb pattern

---

#### [NEW] [GlobalSearch.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/GlobalSearch.jsx)

Cmd+K search modal:
- Keyboard shortcut `Ctrl+K` / `Cmd+K`
- Searches across: monitor names, URLs, status page titles
- Recently visited items
- Quick actions (create monitor, view analytics)
- Reference: New Relic Quick Find, Datadog global search

---

#### [NEW] [TimeRangePicker.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/TimeRangePicker.jsx)

Global time range selector:
- Preset options: Last 15m, 1h, 6h, 24h, 7d, 30d
- Custom date range with calendar picker
- "Live" / auto-refresh mode indicator
- Applied time range shown as chip
- Reference: All three platforms have this as a fundamental pattern

---

### Phase 2 — Dashboard Overhaul

Transform the dashboard from a simple monitor list into a comprehensive monitoring overview.

**Inspiration:** Datadog's widget dashboard + New Relic's golden signals + Elastic's overview tiles

---

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/Dashboard.jsx)

**Current State:** 3 stat cards (Total, UP, DOWN) + filter bar + monitor list

**Enhanced Structure:**

**Section 1: Summary Metrics Bar** (like New Relic golden signals)
- Replace 3 basic cards with 5-6 richer metric cards:
  - **Total Monitors** — with mini sparkline showing trend (computed from data)
  - **Uptime %** — overall SLA across all monitors (from `/api/analytics/`)
  - **Active Incidents** — count with pulsing indicator if > 0
  - **Avg Response Time** — with color coding (green < 200ms, amber < 500ms, red > 500ms)
  - **SSL Expiring Soon** — count of monitors with SSL expiring within 30 days
  - **Monitors Paused** — count with info icon
- Each card has: icon, value, label, delta indicator (↑↓ vs previous period), mini sparkline

**Section 2: Fleet Health Overview** (like Datadog Host Map)
- Visual grid/tile map of all monitors
- Each tile = one monitor, color-coded by status (green/red/amber/gray)
- Tile size represents response time (larger = slower)
- Hover shows: name, URL, status, response time, last checked
- Click navigates to monitor detail
- Toggle between tile view and list view

**Section 3: Enhanced Filter Bar**
- Keep existing search + status filter + tag filter
- Add: sort dropdown (name, status, response time, last checked, created date)
- Add: view toggle (list / grid / compact)
- Add: items per page selector
- Filter chips showing active filters (removable, like Elastic)

**Section 4: Monitor List (Enhanced)**
- Keep existing list but add:
  - **Mini sparkline** per monitor showing 24h response time trend (computed from recent data)
  - **Uptime badge** (e.g., "99.9% 7d") per monitor row
  - **Alert indicator** — small bell icon if monitor has active incidents
  - **SSL status** — lock icon with color (green = OK, amber = expiring, red = expired)
  - Keyboard navigation (arrow keys to move between monitors, Enter to open)
  - Row hover preview popover (shows quick stats without navigating)

---

### Phase 3 — Monitor Detail Enhancements

Enrich the monitor detail page with patterns from all three platforms.

**Inspiration:** New Relic's APM transaction breakdown + Elastic's comparison mode + Datadog's metric overlays

---

#### [MODIFY] [MonitorDetail.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/MonitorDetail.jsx)

**Current State:** Good foundation — has response chart, SLA cards, incidents, maintenance, logs table

**Enhancements:**

**A. Tabbed Interface** (like Elastic APM Service Detail)
- Replace single scrolling page with tabs:
  - **Overview** — current summary view (status, SLA, response chart)
  - **Response Times** — enhanced chart section
  - **Incidents** — dedicated incidents list with timeline
  - **Logs** — paginated check logs table
  - **Maintenance** — maintenance window manager
  - **Configuration** — monitor settings/edit view

**B. Response Time Chart Enhancements**
- **Comparison mode** (like Elastic): overlay "previous period" data as dashed line
- **Percentile lines**: show P50, P95, P99 on the chart (computed from logs data)
- **Anomaly markers**: highlight data points that deviate significantly from average
- **Brush selection**: click and drag on chart to zoom into time range
- **Chart type toggle**: line, area, or bar
- **Downtime bands**: shade red regions where monitor was DOWN
- **Time range tabs**: 1h, 6h, 24h, 7d, 30d (currently fixed at 24h)

**C. Enhanced SLA Section**
- **SLA progress rings/arcs** instead of plain numbers (circular gauge)
- **Error budget visualization** (like Datadog SLO widget): "X% error budget remaining"
- **SLA trend chart**: sparkline showing SLA over time
- **Comparison with previous period**: "↑ 0.2% vs last week"

**D. Status Timeline Bar** (like Elastic Uptime)
- Horizontal bar segmented by time showing UP/DOWN/MAINTENANCE status
- Each segment is color-coded
- Hover shows duration and details
- Spans the configured time range (24h, 7d, 30d)

**E. Recent Checks Table Enhancements**
- Add column sorting (click headers)
- Add column for "Duration" (time since previous check)
- Color-coded status code cells (2xx = green, 4xx = amber, 5xx = red)
- Expandable rows showing full error messages
- CSV export button (already exists — make it a table-header action)

---

### Phase 4 — Analytics Page Upgrade

Transform the analytics page into a comprehensive observability dashboard.

**Inspiration:** Datadog's dashboard widgets + New Relic's custom dashboards + Elastic's Lens

---

#### [MODIFY] [Analytics.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/Analytics.jsx)

**Current State:** 4 stat cards + slowest services + heatmap + incidents timeline

**Enhanced Structure:**

**Section 1: Time Range & Filters**
- Integrate global time range picker
- Add monitor group filter (filter analytics by tag group)
- Add environment filter (if monitors have tags like "production", "staging")

**Section 2: Golden Signals Dashboard** (like New Relic)
- Redesign stat cards as larger, richer widgets:
  - **Overall Uptime** — large donut chart with percentage in center
  - **Avg Response Time** — metric + area chart sparkline
  - **Active Incidents** — count + severity breakdown
  - **Total Checks** — count for the selected period
  - **Monitors by Status** — small pie/donut chart (UP/DOWN/PAUSED breakdown)
  - **Mean Time to Recovery (MTTR)** — computed from incident data

**Section 3: Response Time Distribution** (NEW)
- **Histogram/distribution chart** showing response time distribution across all monitors
- X-axis: response time buckets, Y-axis: count of checks
- Reference: Elastic APM latency distribution

**Section 4: Monitor Performance Table** (like Datadog Top List)
- Table of ALL monitors with columns: Name, Uptime %, Avg Latency, P95 Latency, Incidents, Last Checked
- Sortable by any column
- Color-coded cells
- Click to navigate to monitor detail
- Inline sparklines for latency trend
- Reference: Datadog's Top List widget + Elastic's transaction groups table

**Section 5: Downtime Heatmap (Enhanced)**
- Keep existing heatmap but enhance:
  - Toggle between "by hour of day" and "by day of week" views
  - Add "day × hour" matrix view (like GitHub contribution grid)
  - Intensity = number of incidents

**Section 6: Incidents Timeline (Enhanced)**
- Keep existing timeline but add:
  - Filter by status (active/resolved/all)
  - Filter by monitor
  - Duration distribution chart
  - MTTR trend line

---

### Phase 5 — APM Dashboard Upgrade

Elevate the APM dashboard to match professional APM platforms.

**Inspiration:** Datadog APM + New Relic APM + Elastic APM Services

---

#### [MODIFY] [ApmDashboard.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/ApmDashboard.jsx)

**Current State:** Register app form + app cards + 4 metric cards + traffic bars + latency + endpoints + errors

**Enhanced Structure:**

**A. Service Health Overview** (like New Relic APM Summary)
- Replace basic metric cards with richer KPI widgets:
  - **Total Requests** — with rate (req/min) and trend arrow
  - **Avg Response Time** — with P50/P95/P99 breakdown
  - **Error Rate** — with severity gauge (green/amber/red)
  - **Apdex Score** — computed from response times (< 500ms = satisfied, < 2s = tolerating, else frustrated)
  - **Active Applications** — with environment tags

**B. Traffic & Latency Charts** (like Elastic APM Overview)
- Replace simple bar chart with professional time-series chart:
  - **Throughput chart**: area chart with requests/min, overlaid with error requests in red
  - **Latency chart**: multi-line showing avg, P95, P99 latencies over time
  - **Error rate chart**: line chart with error percentage
  - All three charts synced on same time axis
  - Hover crosshair syncs across all charts
  - Click-and-drag to zoom

**C. Endpoint Performance Table** (like Elastic APM Transactions)
- Enhance current endpoint table:
  - Add **Impact score** column (like Elastic): `latency × throughput × error_rate`
  - Add **P95 Latency** column
  - Add inline **sparkline** for each endpoint's traffic trend
  - Add **Latency bar** visual indicator (horizontal bar showing relative latency)
  - Sortable by any column
  - Click endpoint → expand detail with mini response time chart
  - Reference: Elastic APM Transaction Groups table

**D. Error Analytics** (like New Relic Error Analytics)
- Enhance error breakdown:
  - **Error timeline chart**: line chart of errors over time
  - **Error groups table**: group by status code + endpoint combination
  - **Error rate by endpoint**: horizontal bar chart
  - **Top error endpoints**: ranked list with error count and rate
  - Status code color coding: 4xx = amber, 5xx = red

**E. Application Management** (Enhanced)
- Move register form to a modal (not inline)
- App cards: add last activity timestamp, health indicator
- API key management: show/hide toggle, copy with feedback, regenerate option
- Environment badge styling (production = blue, staging = amber, development = gray)

---

### Phase 6 — New Pages

Create entirely new pages to fill gaps identified in the reference platform analysis.

---

#### [NEW] [IncidentsPage.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/IncidentsPage.jsx)

**Dedicated Incidents Management Page** (like Datadog Monitors + New Relic Alerts)

Uses: `getIncidents()` API

**Structure:**
1. **Summary Bar**
   - Active incidents count (with pulsing indicator)
   - Resolved today count
   - MTTR (mean time to recovery)
   - Longest ongoing incident

2. **Active Incidents Section**
   - Cards for each active incident with:
     - Monitor name + URL
     - Duration (live counting)
     - Error message
     - Severity indicator
     - "View Monitor" link
     - Acknowledge action (frontend-only state)

3. **Incidents History Table**
   - Columns: Monitor, Started, Resolved, Duration, Error Message, Status
   - Sortable by all columns
   - Filterable by monitor, status (active/resolved), date range
   - Pagination
   - Color-coded rows (active = red tint, resolved = neutral)
   - Reference: Datadog Triggered Monitors + New Relic Incident Management

4. **Incidents Timeline** (visual)
   - Gantt-style chart showing incidents as bars on a timeline
   - Color-coded by monitor
   - Hover for details
   - Reference: Elastic Uptime status history

---

#### [NEW] [LogsExplorer.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/LogsExplorer.jsx)

**Dedicated Logs Explorer Page** (like Datadog Log Explorer + New Relic Logs + Elastic Log Stream)

Uses: `getLogs()` API

**Structure:**
1. **Search & Filter Bar**
   - Text search for error messages
   - Monitor filter dropdown (select which monitor's logs to view)
   - Status filter (UP/DOWN/MAINTENANCE)
   - Response time range slider
   - Status code filter (2xx, 3xx, 4xx, 5xx)

2. **Log Stream**
   - Chronological list of check results (newest first)
   - Each entry shows: timestamp, monitor name, status icon, status code, response time, region
   - Color-coded by status (green/red/amber)
   - Expandable rows with full details (error message, SSL info, failure reason)
   - Infinite scroll or pagination
   - Reference: Elastic Log Stream + Datadog Log Explorer

3. **Facet Sidebar** (like Datadog)
   - Left panel showing distribution of logs by:
     - Status (UP/DOWN count)
     - Status Code (200, 404, 500, etc. with counts)
     - Monitor (list with counts)
     - Region
   - Click a facet value to filter

4. **Log Detail Panel**
   - Click a log → right panel slides in
   - Full details: all fields, error message, SSL info
   - "View Monitor" link
   - "View Surrounding Logs" (previous/next 5 entries)
   - Reference: New Relic Log Detail Panel

---

#### [NEW] [SettingsPage.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/SettingsPage.jsx)

**User Settings & Profile Page** (like all three platforms)

Uses: `getMe()` API

**Structure:**
1. **Profile Section**
   - Username display
   - Email display
   - Change password form (frontend form — submits to backend)
   - Avatar/initials display

2. **Preferences Section**
   - Default time range preference
   - Default dashboard view (list/grid)
   - Notification preferences (browser notifications on/off)
   - Auto-refresh interval setting

3. **API & Integrations Section**
   - APM application API keys overview (links to APM page)
   - Webhook URL testing interface
   - Integration status overview

4. **About & System Info**
   - PinBEAT version info
   - Links to docs, about page
   - System status

---

### Phase 7 — Shared Component Library

Create reusable components used across multiple pages.

---

#### [NEW] [SparklineChart.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/SparklineChart.jsx)

Tiny inline chart component:
- Takes array of values, renders SVG sparkline
- Color variants (emerald, red, amber, blue)
- Used in: Dashboard monitor rows, Analytics tables, APM endpoint table
- Reference: Datadog inline sparklines, New Relic sparklines

---

#### [NEW] [MetricCard.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/MetricCard.jsx)

Enhanced metric display card:
- Icon, label, value, unit
- Delta indicator (↑↓ percentage change)
- Optional sparkline
- Optional progress ring
- Color tone variants
- Loading skeleton state
- Used in: Dashboard, Analytics, APM, Incidents
- Reference: Datadog Query Value widget, New Relic Billboard

---

#### [NEW] [StatusTimeline.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/StatusTimeline.jsx)

Horizontal status bar:
- Segmented bar showing UP/DOWN/MAINTENANCE periods
- Color-coded segments with hover tooltips
- Configurable time range
- Used in: Monitor Detail, Status Page
- Reference: Elastic Uptime status history, Datadog SLO timeline

---

#### [NEW] [DataTable.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/DataTable.jsx)

Professional data table component:
- Sortable columns (click header)
- Column visibility toggle
- Pagination with rows-per-page selector
- Loading skeleton
- Empty state
- Row hover highlight
- Expandable rows
- CSV export action
- Used in: Logs, Incidents, Endpoints, Monitor checks
- Reference: All three platforms use rich data tables

---

#### [NEW] [FilterChips.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/FilterChips.jsx)

Active filter display:
- Shows applied filters as removable chips/tags
- X button to remove individual filters
- "Clear all" action
- Reference: Elastic filter chips pattern

---

#### [NEW] [DonutChart.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/DonutChart.jsx)

SVG donut/ring chart:
- Center label (percentage or count)
- Multiple segments with colors
- Hover tooltips
- Animated transitions
- Used in: Analytics (uptime donut), Dashboard (status breakdown)
- Reference: New Relic pie charts, Elastic donut

---

#### [NEW] [EmptyState.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/components/EmptyState.jsx)

Standardized empty state component:
- Icon, title, description, action button
- Used consistently across all pages
- Reference: All platforms have consistent empty states

---

### Phase 8 — Polish & Cross-Cutting Enhancements

Final polish to match the premium feel of reference platforms.

---

#### [MODIFY] [index.css](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/index.css)

- Add CSS custom properties (design tokens) for consistent theming
- Add dark mode support via `prefers-color-scheme` + toggle class
- Add new animation keyframes for chart transitions, card entrances
- Add focus-visible styles for keyboard navigation (accessibility)
- Add scrollbar styling for sidebar

---

#### [MODIFY] [App.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/App.jsx)

- Add routes for new pages: `/incidents`, `/logs`, `/settings`
- Wrap pages in sidebar layout shell
- Add route-based breadcrumb context

---

#### [MODIFY] [LandingPage.jsx](file:///c:/Users/uttam/Desktop/PinBEAT/frontend/src/pages/LandingPage.jsx)

- Update feature list to reflect new capabilities (incidents page, logs explorer, APM)
- Add new screenshots/previews of enhanced pages
- Ensure landing page doesn't use sidebar layout (standalone)

---

#### Cross-Cutting UI Patterns to Apply Everywhere:

| Pattern | Reference | Apply To |
|---|---|---|
| Loading skeletons | All three | Every data-fetching section |
| Error boundaries | New Relic | Every page |
| Keyboard shortcuts | Datadog (Cmd+K) | Global search, navigation |
| Toast notifications | New Relic | Actions (create, delete, copy) |
| Responsive design | All three | Every page (mobile/tablet/desktop) |
| Transition animations | Elastic | Page transitions, card entrances |
| Tooltips | All three | All abbreviated/truncated content |

---

## Verification Plan

### Automated Tests
- Run `npm run dev` and manually test each page after changes
- Verify all existing API calls still work (no backend changes)
- Test responsive layouts at mobile (375px), tablet (768px), desktop (1440px)
- Test keyboard navigation and Cmd+K search

### Manual Verification
- Visual comparison with Datadog/New Relic/Elastic screenshots
- User flow testing: login → dashboard → monitor detail → back
- Verify dark mode consistency
- Browser testing: Chrome, Firefox, Edge
- Performance check: ensure no regression in page load times
