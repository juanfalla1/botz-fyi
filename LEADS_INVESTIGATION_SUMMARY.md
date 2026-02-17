# LEADS LOADING INVESTIGATION - SUMMARY REPORT

**Date**: February 17, 2026
**Investigation Focus**: Why adding a single lead doesn't trigger auto-loading, but manual reload does

---

## FINDINGS OVERVIEW

### The Core Issue
The application uses an **asynchronous refresh mechanism** based on a `dataRefreshKey` counter. When a lead is created:

1. ✓ `triggerDataRefresh()` IS called
2. ✓ Cache invalidation triggers  
3. ✓ Database query starts (ASYNC)
4. ✗ BUT modal closes immediately (300ms timeout)
5. ✗ New lead NOT visible yet (still fetching)

**Contrast with F5 reload**: Full page reload forces synchronous re-initialization and fresh cache, making new leads visible immediately.

---

## KEY COMPONENTS ANALYZED

### 1. STATE MANAGEMENT
- **`/app/start/MainLayout.tsx` (lines 300-303)**
  - `dataRefreshKey`: Counter state (0, 1, 2, ...)
  - `triggerDataRefresh()`: Increment counter by 1
  - Exported via `useAuth()` context to all components

### 2. LEAD CREATION FLOW
- **API**: `/app/api/leads/create/route.ts` (lines 16-170)
  - Handles single lead creation
  - Returns `{ ok: true, lead: {...} }`
  
- **UI**: `/app/start/components/LeadUpsertModal.tsx` (lines 93-221)
  - `handleSave()`: Create/edit/delete logic
  - Calls `triggerDataRefresh()` after insert (line 205)
  - Closes modal in 300ms (line 207) - **BEFORE async completes**

### 3. DATA RELOAD MECHANISM  
- **`/app/start/components/CRMFullView.tsx`**
  - `globalLeadsCache`: Module-level in-memory cache (lines 18-25)
  - `tableLeads`: State for main table display (line 219)
  - `fetchAllLeadsForTable()`: Paginated loader (lines 428-487)
  - **useEffect (line 812-866)**: Watches `dataRefreshKey` in dependencies (line 866)
  - When key changes → Cache invalid → Fetch new data

### 4. BULK UPLOAD (COMPARISON)
- **API**: `/app/api/upload-leads/route.ts` (lines 3-27)
  - Proxies to n8n webhook: `https://suncapital.app.n8n.cloud/webhook/carga-excel`
  
- **UI**: `/app/start/components/LeadsTable.tsx` (line 919)
  - After n8n returns: `window.location.reload()`
  - **Forces full page reload** → All state cleared → Fresh cache → Immediate load

---

## RACE CONDITION DIAGRAM

```
SINGLE LEAD CREATION:
├─ User creates lead in modal
├─ API call succeeds ✓
├─ triggerDataRefresh() called
│  └─ dataRefreshKey increments (0 → 1)
│     └─ CRMFullView useEffect triggered (async)
│        └─ fetchAllLeadsForTable() starts loading...
├─ Modal closes (300ms timeout)
└─ User doesn't see new lead yet ⏳ (fetch still in progress)

BULK UPLOAD:
├─ User uploads Excel file
├─ n8n processes leads
├─ window.location.reload() called
└─ Full page reload clears ALL state ✓
   └─ Fresh mount → Empty cache → Must fetch
      └─ All leads loaded fresh ✓
         └─ User sees new leads immediately ✓
```

---

## TECHNICAL DETAILS

### Cache Invalidation Logic
**File**: `/app/start/components/CRMFullView.tsx` (lines 827-832)

```typescript
const needsRefresh = globalLeadsCacheKey !== dataRefreshKey || tenantChanged;

if (!needsRefresh && globalLeadsCache.length > 0) {
  setTableLeads(globalLeadsCache);  // Use cache (instant)
  return;
}

// Cache invalid → fetch new data (async)
await fetchAllLeadsForTable(effectiveTenantId, { ... });
```

**Key Point**: Cache only valid if version keys match
- After `triggerDataRefresh()`: `globalLeadsCacheKey` (old) ≠ `dataRefreshKey` (new)
- Result: Cache invalid → MUST fetch
- But fetch is ASYNC and modal already closed

### Paginated Loading Strategy
**File**: `/app/start/components/CRMFullView.tsx` (lines 428-487)

```
500 rows per page, max 50 pages
├─ Page 0: rows 0-499
├─ Page 1: rows 500-999
├─ Page 2: rows 1000-1499
...
└─ Stop when page has < 500 rows
```

Streams updates to UI via `onPage` callback (line 845)

---

## FILES CREATED (REFERENCE)

1. **LEADS_LOADING_ANALYSIS.md** (203 lines)
   - Executive summary
   - Key differences (single vs bulk)
   - Root cause analysis
   - Solution options

2. **LEADS_CODE_LOCATIONS.md** (333 lines)
   - File locations with line numbers
   - Code snippets for each component
   - Execution path diagrams
   - Summary table of function calls

3. **LEADS_INVESTIGATION_SUMMARY.md** (this file)
   - High-level overview
   - Quick reference

---

## ABSOLUTE FILE PATHS

| Component | Path |
|-----------|------|
| Lead Creation API | `/C:/Users/USUARIO/botz-fyi/app/api/leads/create/route.ts` |
| Lead Upload API | `/C:/Users/USUARIO/botz-fyi/app/api/upload-leads/route.ts` |
| State Manager | `/C:/Users/USUARIO/botz-fyi/app/start/MainLayout.tsx` |
| CRM Dashboard | `/C:/Users/USUARIO/botz-fyi/app/start/components/CRMFullView.tsx` |
| Leads Table | `/C:/Users/USUARIO/botz-fyi/app/start/components/LeadsTable.tsx` |
| Lead Modal | `/C:/Users/USUARIO/botz-fyi/app/start/components/LeadUpsertModal.tsx` |

---

## QUICK ANSWER: WHY NO AUTO-LOAD?

**Question**: Why doesn't adding a single lead trigger auto-reload of the table?

**Answer**: It DOES trigger a reload, but it's **asynchronous**:

1. Lead created → `triggerDataRefresh()` called
2. `dataRefreshKey` increments
3. CRMFullView useEffect starts (line 866 dependency)
4. `fetchAllLeadsForTable()` begins async query
5. Modal closes (300ms) **before fetch completes**
6. User sees nothing (fetch still running)
7. Eventually, `setTableLeads()` updates
8. New lead appears (but user might not notice)

**Why bulk upload (F5) works immediately**: `window.location.reload()` forces full page reload, clearing cache and forcing fresh fetch from database on next mount.

---

## ROOT CAUSE

**Race Condition** between:
- Modal close timeout (300ms, LeadUpsertModal.tsx:207)
- Async database fetch (indeterminate, network-dependent)

The modal closes BEFORE the new data loads, creating user perception of "no auto-load".

---

## RECOMMENDATIONS

### Option 1: Wait for Refresh
Delay modal close until fetch completes

### Option 2: Real-Time Subscriptions  
Add Supabase `.on('INSERT', ...)` listeners for true real-time updates

### Option 3: Optimistic Updates
Show new lead in table immediately, reconcile after fetch

### Option 4: Increase Timeout
Change `setTimeout(() => onClose(), 300)` to `setTimeout(..., 1500)` or wait for refresh completion flag

---

## EVIDENCE TRAIL

**Single Lead Creation**:
- ✓ API call succeeds (creates in DB)
- ✓ `triggerDataRefresh()` called (line 205, LeadUpsertModal.tsx)
- ✓ `dataRefreshKey` increments (line 301, MainLayout.tsx)  
- ✓ CRMFullView useEffect triggered (line 866 dependency)
- ✓ Cache invalidation detected (line 827, CRMFullView.tsx)
- ✓ `fetchAllLeadsForTable()` executes (line 428, CRMFullView.tsx)
- ✓ Paginated loading starts (lines 459-483, CRMFullView.tsx)
- ✗ Modal closes before completion (line 207, LeadUpsertModal.tsx)
- ✗ User doesn't see new lead until fetch finishes

**Bulk Upload**:
- ✓ Excel file sent to n8n
- ✓ n8n processes and inserts leads
- ✓ Response received
- ✓ `window.location.reload()` called (line 919, LeadsTable.tsx)
- ✓ Full page reload clears state
- ✓ Fresh mount initializes everything
- ✓ `fetchAllLeadsForTable()` executes fresh
- ✓ All leads visible immediately

---

## MISSING FEATURES

1. **Real-Time Subscriptions**: No `.on()` listeners for database changes
2. **WebSocket Updates**: No live push notifications
3. **Optimistic UI**: No immediate visual feedback before API response
4. **Loading States**: Modal doesn't indicate pending refresh

---

END OF INVESTIGATION REPORT
