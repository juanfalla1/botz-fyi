# LEADS SYSTEM - FILE & CODE LOCATIONS REFERENCE

## 1. API ROUTES

### POST /api/leads/create/route.ts
**Location**: `./app/api/leads/create/route.ts`

**Key Code Sections**:
- Lines 16-27: Request handler setup, auth validation
- Lines 29-62: User authorization checks (team_members, subscriptions)
- Lines 64-87: Lead payload construction
- Lines 89-161: Insert logic + duplicate handling
- Lines 16-170: Full endpoint implementation

**Key Functions**:
```typescript
withTimeout() - Wraps promises with timeout handling
POST(req: Request) - Main handler
```

**Response Types**:
```
Success: { ok: true, lead: {...} }
Duplicate: { ok: true, existing: true, lead: {...} }
Error: { ok: false, error: "message" }
```

---

### POST /api/upload-leads/route.ts
**Location**: `./app/api/upload-leads/route.ts`

**Key Code Sections**:
- Lines 3-27: Full implementation
- Line 9: n8n webhook URL
- Line 12: Fetch request to n8n
- Line 22: Response handling

**Key Variables**:
```typescript
N8N_URL = "https://suncapital.app.n8n.cloud/webhook/carga-excel"
```

---

### GET /api/lead-status/route.ts
**Location**: `./app/api/lead-status/route.ts`

**Purpose**: Fetch lead status by phone
**Lines**: 1-87

---

## 2. MAIN DASHBOARD PAGES

### /app/start/page.tsx
**Location**: `./app/start/page.tsx`

**Lead-Related Code**:
- Lines 108-151: Main component setup
- Lines 202-222: Lead state management
- Lines 296-322: fetchLeads() function for hipoteca mode
- Lines 318-322: useEffect calling fetchLeads

**Key State**:
```typescript
leadsOptions: LeadOption[]  // Line 202
loadingLeads: boolean       // Line 203
```

---

## 3. AUTHENTICATION & CONTEXT

### /app/start/MainLayout.tsx
**Location**: `./app/start/MainLayout.tsx`

**Data Refresh Key**:
- Line 300: `const [dataRefreshKey, setDataRefreshKey] = useState(0);`
- Lines 301-303: `triggerDataRefresh` callback
- Line 933: Exported in useAuth() context return

**useAuth Context Return** (lines ~230-270):
```typescript
{
  user,
  loading,
  isAdmin,
  isAsesor,
  isPlatformAdmin,
  hasPermission,
  userRole,
  tenantId,
  teamMemberId,
  userPlan,
  subscription,
  dataRefreshKey,        // ← KEY FOR AUTO-REFRESH
  triggerDataRefresh,    // ← FUNCTION TO TRIGGER REFRESH
  accessToken,
  // ... more
}
```

---

## 4. CRM FULL VIEW (MAIN DASHBOARD)

### /app/start/components/CRMFullView.tsx
**Location**: `./app/start/components/CRMFullView.tsx` (1900+ lines)

**Global Cache** (lines 18-25):
```typescript
let globalLeadsCache: any[] = [];           // Module-level cache
let globalLeadsCacheKey = 0;                // Cache version
let globalTenantIdCache: string | null = null;

export function invalidateLeadsCache() {
  globalLeadsCache = [];
  globalLeadsCacheKey = 0;
}
```

**Component Props** (lines 204-214):
```typescript
{
  globalFilter,
  openControlCenter,
  initialControlTab,
  onControlCenterClose
}
```

**State** (lines 218-227):
```typescript
metricRows: Lead[]              // Recent 30d for charts
tableLeads: Lead[]              // Full database for table
leadCounts: object | null       // Total/month/converted counts
loadingMetrics: boolean
loadingTable: boolean
timeFilter: 'week' | 'month'
```

**Key Functions**:

1. **fetchAllLeadsForTable()** (lines 428-487)
   - Paginated loader: 500 rows/page, max 50 pages
   - Filters by tenant_id
   - Filters by asesor_id/assigned_to for asesor users
   - Returns all leads for table display

2. **fetchLeadCounts()** (lines 489-520)
   - Counts total, monthly, converted leads

3. **fetchRecentFromTable()** (lines 401-425)
   - Time-windowed queries (7d or 30d)
   - Used for metrics/charts

**Key useEffect Hooks**:

1. **Metrics Load** (lines 596-809)
   - Dependency: [openControlCenter, authLoading, timeFilter, ...]
   - Fetches recent leads for charts
   - Has localStorage caching (10-min TTL)
   - Lines 632-652: Cache logic

2. **Table Load** (lines 812-866)
   - **Dependency: [openControlCenter, user, tenantId, isPlatformAdmin, userRole, dataRefreshKey]** ← KEY DEPENDENCY
   - Fetches ALL leads for table
   - Lines 827-832: Cache invalidation check
   - Lines 843-851: Paginated fetch with streaming updates
   - Lines 853-855: Cache update after load

**Key Decision Point** (lines 827-832):
```typescript
const tenantChanged = globalTenantIdCache !== effectiveTenantId;
const needsRefresh = globalLeadsCacheKey !== dataRefreshKey || tenantChanged;

if (!needsRefresh && globalLeadsCache.length > 0) {
  setTableLeads(globalLeadsCache);
  return;  // ← SKIP FETCH IF CACHE VALID
}
```

---

## 5. LEADS TABLE

### /app/start/components/LeadsTable.tsx
**Location**: `./app/start/components/LeadsTable.tsx` (2100+ lines)

**Props** (lines 272-310):
```typescript
initialLeads: Lead[]
globalFilter?: string
onLeadPatch?: (id, patch) => void
```

**useAuth Hook** (line 371):
```typescript
const { triggerDataRefresh, isAsesor, teamMemberId, tenantId: authTenantId, user, accessToken } = useAuth();
```

**Key Functions**:

1. **handleAddLead()** (lines ~530-657)
   - Validates lead data
   - POST /api/leads/create (line 609)
   - Local state update: setLeads (line 646)
   - **triggerDataRefresh()** called (line 649)
   - **Modal closes 300ms later** (line 207)

2. **handleFileUpload()** (lines 910-923)
   - Posts to /api/upload-leads
   - **window.location.reload()** on success (line 919)

3. **confirmDeleteLead()** (lines 670-750)
   - Deletes from database
   - Triggers **triggerDataRefresh()** (line 735)

---

## 6. LEAD MODAL

### /app/start/components/LeadUpsertModal.tsx
**Location**: `./app/start/components/LeadUpsertModal.tsx`

**useAuth Hook** (line 26):
```typescript
const { user, isAsesor, teamMemberId, tenantId: authTenantId, triggerDataRefresh } = useAuth();
```

**handleSave()** (lines 93-221):

CREATE path (lines 128-207):
```typescript
// Lines 201-207: Insert + Refresh
const { error } = await supabase.from("leads").insert([payload]);
if (error) throw error;

setMsg("✓ Creado");
triggerDataRefresh();    // ← LINE 205
onSaved?.();
setTimeout(() => onClose(), 300);
```

EDIT path (lines 104-127):
```typescript
// Line 125: triggerDataRefresh() also called
const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
if (error) throw error;

setMsg("✓ Guardado");
triggerDataRefresh();    // ← LINE 125
onSaved?.();
setTimeout(() => onClose(), 300);
```

DELETE path (lines 223-245):
```typescript
// Line 236: triggerDataRefresh() also called
const { error } = await supabase.from("leads").delete().eq("id", lead.id);
if (error) throw error;

setMsg("✓ Eliminado");
triggerDataRefresh();    // ← LINE 236
onSaved?.();
setTimeout(() => onClose(), 300);
```

---

## 7. KANBAN & OTHER COMPONENTS

### /app/start/components/KanbanBoard.tsx
**Lines**: 77, 324, 370

```typescript
const { ..., triggerDataRefresh } = useAuth();  // Line 77

// When lead is updated or moved:
triggerDataRefresh();  // Lines 324, 370
```

---

## 8. SUPABASE CLIENT

### /app/start/supabaseClient.ts
**Location**: `./app/supabaseClient.ts` (or `/app/start/components/supabaseClient.ts`)

**Purpose**: Direct Supabase client instance
- Used for real-time subscriptions (not currently used for leads)
- Used for direct insert/update/delete operations

---

## 9. TYPES & INTERFACES

### Lead Type
**Location**: `/app/start/components/LeadsTable.tsx` (line ~372)

```typescript
interface Lead {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string;
  status: string;
  next_action: string;
  calificacion: string;
  origen: string;
  source: string;
  asesor_id?: string | null;
  assigned_to?: string | null;
  asesor_nombre?: string | null;
  estado_operacion?: string | null;
  tenant_id: string;
  user_id: string;
  sourceTable?: string;
}
```

---

## SUMMARY TABLE: What Calls What

| File | Line(s) | Calls | Purpose |
|------|---------|-------|---------|
| LeadUpsertModal.tsx | 205, 125, 236 | triggerDataRefresh() | After create/edit/delete |
| LeadsTable.tsx | 649 | triggerDataRefresh() | After single lead created via form |
| LeadsTable.tsx | 735 | triggerDataRefresh() | After lead deleted |
| LeadsTable.ts
