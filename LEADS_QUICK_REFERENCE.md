# LEADS SYSTEM - QUICK REFERENCE GUIDE

## TL;DR - The Problem

**Single lead creation**: Async reload → modal closes before visible
**Bulk upload (F5)**: Full reload → everything fresh → visible immediately

---

## KEY LINE NUMBERS

### MainLayout.tsx (State Management)
| What | Line |
|------|------|
| dataRefreshKey state | 300 |
| triggerDataRefresh fn | 301-303 |
| Export in useAuth | 933 |

### LeadUpsertModal.tsx (Create Lead)
| What | Line |
|------|------|
| handleSave() | 93 |
| triggerDataRefresh() call | 205 |
| Modal close timeout | 207 |

### LeadsTable.tsx (Bulk Upload)  
| What | Line |
|------|------|
| handleFileUpload() | 910 |
| window.location.reload() | 919 |

### CRMFullView.tsx (Data Management)
| What | Line |
|------|------|
| globalLeadsCache | 18-25 |
| tableLeads state | 219 |
| fetchAllLeadsForTable() | 428-487 |
| Cache check (line 827) | 812-866 |
| useEffect dependency | 866 |

---

## STATE FLOW DIAGRAM

```
User Action:
├─ Single Lead: leadsTable.tsx:609 → POST /api/leads/create → triggerDataRefresh() → async fetch
└─ Bulk Load:  leadsTable.tsx:919 → window.location.reload() → sync fresh mount

triggerDataRefresh():
├─ MainLayout.tsx:301 → setDataRefreshKey(prev+1)
├─ ALL components watching dataRefreshKey update
└─ CRMFullView.tsx:866 → useEffect re-runs

CRMFullView useEffect (line 812-866):
├─ Check: globalLeadsCacheKey === dataRefreshKey?
├─ If YES: use cache (instant) ✓
└─ If NO: 
    ├─ Invalidate cache (line 827)
    └─ fetchAllLeadsForTable() (async)
       ├─ Paginated 500-row queries
       ├─ Stream updates to UI
       └─ Update cache after complete

API Endpoints:
├─ POST /api/leads/create/route.ts → { ok: true, lead: {...} }
├─ POST /api/upload-leads/route.ts → proxy to n8n
└─ GET /api/lead-status/route.ts → check phone status
```

---

## COMPONENTS & THEIR ROLES

### CRMFullView.tsx
- **Module**: `/app/start/components/CRMFullView.tsx`
- **Responsibility**: Manage lead table data + metrics
- **Cache Key**: `globalLeadsCache`, `globalLeadsCacheKey`
- **State**: `tableLeads`, `metricRows`, `leadCounts`
- **Watch**: `dataRefreshKey` (line 866 dependency)
- **Load**: `fetchAllLeadsForTable()` (paginated)

### LeadsTable.tsx
- **Module**: `/app/start/components/LeadsTable.tsx`
- **Responsibility**: Display leads in table, handle create/delete
- **Create**: POST /api/leads/create (line 609)
- **Refresh**: Call `triggerDataRefresh()` (line 649)
- **Bulk**: POST /api/upload-leads → reload (line 919)
- **Delete**: Trigger `triggerDataRefresh()` (line 735)

### LeadUpsertModal.tsx
- **Module**: `/app/start/components/LeadUpsertModal.tsx`
- **Responsibility**: Create/edit/delete single lead
- **Action**: INSERT/UPDATE/DELETE via Supabase
- **Refresh**: Call `triggerDataRefresh()` (lines 125, 205, 236)
- **Close**: setTimeout 300ms (line 207) ← ISSUE IS HERE

### MainLayout.tsx
- **Module**: `/app/start/MainLayout.tsx`
- **Responsibility**: Auth context + global state management
- **State**: `dataRefreshKey` (line 300)
- **Function**: `triggerDataRefresh()` (line 301)
- **Export**: `useAuth()` hook with dataRefreshKey + function

---

## EXECUTION TIMELINE

### Single Lead Creation (300ms)
```
T+0ms:    User clicks Save
T+5ms:    API POST /api/leads/create
T+50ms:   API returns { ok: true, lead: {...} }
T+51ms:   triggerDataRefresh() called
T+52ms:   dataRefreshKey increments: 0 → 1
T+53ms:   CRMFullView useEffect triggered (async)
T+54ms:   fetchAllLeadsForTable() starts
T+100ms:  STILL FETCHING (500 rows from DB)
T+300ms:  Modal closes (setTimeout)
T+400ms:  STILL FETCHING...
T+800ms:  Fetch complete → setTableLeads() → UI update ✓
```

**Problem**: User closes modal at T+300ms, but new data not visible until T+800ms

### Bulk Upload (Immediate)
```
T+0ms:    User selects Excel file
T+50ms:   POST /api/upload-leads
T+100ms:  Proxied to n8n webhook
T+...ms:  n8n processes Excel (external)
T+1000ms: Response received
T+1001ms: window.location.reload() called
T+1100ms: Page fully reloaded
T+1101ms: All components re-mount fresh
T+1102ms: globalLeadsCache = []
T+1103ms: CRMFullView useEffect runs
T+1104ms: fetchAllLeadsForTable() with empty cache
T+1500ms: Fetch complete → ALL leads visible ✓
```

**Advantage**: Full reload forces fresh cache + simultaneous fetch

---

## CACHE INVALIDATION LOGIC

### How Cache Works
```typescript
// globalLeadsCacheKey = 0, dataRefreshKey = 0 (initial)
// Cache is VALID ✓

// User creates lead → triggerDataRefresh()
// globalLeadsCacheKey = 0, dataRefreshKey = 1 (after increment)
// Cache is INVALID ✗ (keys don't match)

// Must fetch: await fetchAllLeadsForTable()
// Returns allLeads

// After fetch:
// globalLeadsCacheKey = 1 (updated to match)
// globalLeadsCache = allLeads (updated data)
// Cache is VALID ✓
```

### Check Logic (CRMFullView:827)
```typescript
const needsRefresh = 
  globalLeadsCacheKey !== dataRefreshKey ||  // version mismatch
  tenantChanged;                              // tenant switched

if (!needsRefresh && globalLeadsCache.length > 0) {
  setTableLeads(globalLeadsCache);  // instant
  return;  // SKIP FETCH
}

// else: fetch new data (async)
```

---

## API RESPONSE FORMATS

### Lead Created
```json
{
  "ok": true,
  "lead": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+34123456789",
    "status": "NUEVO",
    "origen": "manual",
    "tenant_id": "tenant-uuid",
    "user_id": "user-uuid",
    "created_at": "2026-02-17T09:00:00Z"
  }
}
```

### Lead Duplicate
```json
{
  "ok": true,
  "existing": true,
  "lead": { ...existing_lead_data... }
}
```

### Lead Error
```json
{
  "ok": false,
  "error": "No autorizado para ese tenant"
}
```

---

## DEPENDENCY ARRAYS

### CRMFullView useEffect (Line 812-866)
```typescript
}, [
  openControlCenter,
  user,
  tenantId,
  isPlatformAdmin,
  userRole,
  dataRefreshKey  // ← WATCH THIS
]);
```

When any of these change, useEffect re-runs and potentially fetches new leads.

---

## FUNCTIONS TO CALL FOR REFRESH

### Direct
```typescript
triggerDataRefresh()  // Only available via useAuth()
```

### Via useAuth Hook (All components)
```typescript
const { triggerDataRefresh } = useAuth();
triggerDataRefresh();  // Call when lead changes
```

### Used in:
- LeadUpsertModal.tsx (line 205, 125, 236)
- LeadsTable.tsx (line 649, 735)
- KanbanBoard.tsx (line 324, 370)

---

## DEBUGGING TIPS

### Check if refresh is being called:
```typescript
console.log("dataRefreshKey:", dataRefreshKey);
const { triggerDataRefresh } = useAuth();
console.log("triggerDataRefresh exists:", typeof triggerDataRefresh);
triggerDataRefresh();
console.log("Called, key should increment");
```

### Check cache status:
```typescript
// In CRMFullView
console.log("globalLeadsCacheKey:", globalLeadsCacheKey);
console.log("dataRefreshKey:", dataRefreshKey);
console.log("Cache valid:", globalLeadsCacheKey === dataRefreshKey);
console.log("Cache size:", globalLeadsCache.length);
```

### Check if fetch completes:
```typescript
// Add in fetchAllLeadsForTable
console.log("Fetch started");
// ... after complete ...
console.log("Fetch completed, leads:", out.length);
```

---

## ABSOLUTE PATHS (WINDOWS)

```
C:\Users\USUARIO\botz-fyi\app\api\leads\create\route.ts
C:\Users\USUARIO\botz-fyi\app\api\upload-leads\route.ts
C:\Users\USUARIO\botz-fyi\app\start\MainLayout.tsx
C:\Users\USUARIO\botz-fyi\app\start\components\CRMFullView.tsx
C:\Users\USUARIO\botz-fyi\app\start\components\LeadsTable.tsx
C:\Users\USUARIO\botz-fyi\app\start\components\LeadUpsertModal.tsx
```

---

## COMPLETE DOCUMENTS

For detailed analysis, see:
1. **LEADS_LOADING_ANALYSIS.md** - Deep dive into mechanism
2. **LEADS_CODE_LOCATIONS.md** - Code snippets + line numbers
3. **LEADS_INVESTIGATION_SUMMARY.md** - Investigation report

