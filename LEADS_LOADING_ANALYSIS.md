# LEAD MANAGEMENT SYSTEM ANALYSIS

## EXECUTIVE SUMMARY
The application has an asynchronous data refresh mechanism using a `dataRefreshKey` state variable. When a single lead is created:
- triggerDataRefresh() is called
- dataRefreshKey increments 
- CRMFullView useEffect re-runs to fetch fresh data
- BUT this is async and the modal closes before new data loads
- Manual F5 reload forces synchronous cache clear + reload

## KEY DIFFERENCES

### Single Lead Creation
1. API call to POST /api/leads/create (async)
2. triggerDataRefresh() called
3. dataRefreshKey increments: 0 → 1
4. CRMFullView useEffect triggered
5. fetchAllLeadsForTable() starts (async)
6. Modal closes immediately (300ms timeout)
7. New lead eventually appears (async completion)

### Bulk Upload (Excel)
1. API call to POST /api/upload-leads 
2. Proxied to n8n webhook
3. window.location.reload() executed
4. ENTIRE PAGE RELOADS
5. All state cleared, cache invalidated
6. fetchAllLeadsForTable() runs fresh
7. All leads visible immediately

## FILES & LOCATIONS

### Lead Creation API
- File: /app/api/leads/create/route.ts (lines 16-170)
- Authorization: Bearer token validation
- Creates single lead in database
- Returns { ok: true, lead: {...} }

### Lead Upload API  
- File: /app/api/upload-leads/route.ts (lines 3-27)
- Proxies FormData to n8n: https://suncapital.app.n8n.cloud/webhook/carga-excel
- Triggers: window.location.reload() on success (LeadsTable.tsx:919)

### State Management
- Location: /app/start/MainLayout.tsx (lines 300-303)
- dataRefreshKey: useState(0)
- triggerDataRefresh: useCallback(() => setDataRefreshKey((prev) => prev + 1))
- Exported via useAuth() context to all components

### Global Leads Cache
- Location: /app/start/components/CRMFullView.tsx (lines 18-25)
- globalLeadsCache: Module-level in-memory cache
- globalLeadsCacheKey: Version tracking
- invalidateLeadsCache(): Export function to clear cache
- Cache only invalidated by dataRefreshKey mismatch or page reload

### CRM Full View
- Location: /app/start/components/CRMFullView.tsx
- metricRows (line 218): Recent 30-day window for charts
- tableLeads (line 219): Full database for table display
- Separate load mechanisms for metrics vs table
- fetchAllLeadsForTable() (lines 428-487): Paginated 500-row loads

### Leads Table
- Location: /app/start/components/LeadsTable.tsx
- Single lead creation (line 609): POST /api/leads/create
- Local state update (line 646): setLeads((prev) => [newLead, ...prev])
- triggerDataRefresh() called (line 649): Start async global refresh
- Modal close (line 207): setTimeout(() => onClose(), 300)

### Lead Upsert Modal
- Location: /app/start/components/LeadUpsertModal.tsx
- handleSave() (lines 93-221): Main save logic
- Calls triggerDataRefresh() on create/edit/delete (lines 125, 205, 236)

## ROOT CAUSE ANALYSIS

The issue is a RACE CONDITION:

```
1. User creates lead → API call succeeds ✓
2. triggerDataRefresh() called immediately
3. dataRefreshKey increments (0 → 1)
4. Modal closes in 300ms (LINE 207)
5. BUT CRMFullView useEffect (LINE 866 dependency) is still fetching...
6. User doesn't see new lead until fetch completes
```

The cache invalidation happens correctly, but the async nature means:
- Modal closes before new data loads
- User moved on already
- New lead not visible in table yet

## AUTO-LOAD MECHANISM EXPLAINED

When dataRefreshKey changes (line 866), CRMFullView useEffect runs:

1. Check cache validity:
   - globalLeadsCacheKey !== dataRefreshKey → invalid cache
   
2. Cache is invalid, so proceed to load:
   - Call fetchAllLeadsForTable(effectiveTenantId)
   
3. Paginated loading:
   - 500 rows per page
   - Max 50 pages (25,000 leads)
   - Streams updates via onPage callback
   
4. Update cache after load:
   - globalLeadsCache = allLeads
   - globalLeadsCacheKey = dataRefreshKey

## MANUAL RELOAD MECHANISM

File: LeadsTable.tsx (line 919)

```typescript
const handleFileUpload = async (event) => {
  const res = await fetch("/api/upload-leads", { method: "POST", body: formData });
  if (res.ok) window.location.reload();  // ← FULL PAGE RELOAD
};
```

Why this works:
1. window.location.reload() → entire page reloads
2. ALL component state is cleared
3. globalLeadsCache reset to []
4. globalLeadsCacheKey reset to 0  
5. dataRefreshKey reset to 0
6. CRMFullView re-mounts fresh
7. Cache is definitely invalid (different keys)
8. fetchAllLeadsForTable() runs without cache
9. All leads loaded fresh from database
10. New leads visible immediately

## LEAD LOADING FLOW

### Getting All Leads for Table
File: CRMFullView.tsx (lines 428-487)

Strategy: Paginated queries
- Query 500 leads per page
- Order by created_at descending
- Filter by tenant_id
- Filter by asesor_id/assigned_to if asesor user
- Stream results via onPage callback
- Stop when page has < 500 results

### Getting Recent Metrics  
File: CRMFullView.tsx (lines 596-809)

Strategy: Time-windowed queries
- Default 30 days, option for 7 days
- Separate localStorage cache
- 10-minute TTL on cache
- Used for chart metrics only
- Not for main table display

## MISSING PIECE: NO REAL-TIME SUBSCRIPTIONS

The codebase does NOT use Supabase real-time subscriptions:
- No .on('INSERT', ...) listeners
- No real-time push updates
- Only polling via dataRefreshKey

This is why:
- Other users' new leads don't auto-appear
- Need manual refresh or F5 reload
- "database completa" only updates on refresh

## SOLUTION OPTIONS

### Option 1: Increase Modal Close Delay
Delay modal close until fetch completes (not optimal)

### Option 2: Add Supabase Real-Time Listener
Listen for lead INSERT events:
```typescript
supabase
  .from('leads')
  .on('INSERT', payload => triggerDataRefresh())
  .subscribe();
```

### Option 3: Use Optimistic Updates
Show new lead immediately, clean up if API fails

### Option 4: Skip Modal Close Delay
Don't setTimeout, wait for refresh then close

## SUMMARY

| Feature | Implementation | Status |
|---------|-----------------|--------|
| Single Lead Create | POST /api/leads/create | ✓ Works but async |
| Bulk Lead Upload | POST /api/upload-leads → n8n | ✓ Works, triggers reload |
| Auto Refresh | dataRefreshKey mechanism | ✓ Works but delayed |
| Manual Reload | window.location.reload() | ✓ Works, immediate |
| Real-Time Sync | Supabase subscriptions | ✗ Not implemented |
| Cache System | globalLeadsCache + key | ✓ Working |
| Metrics Load | Recent window (30d) | ✓ Separate mechanism |
| Full Table Load | Paginated 500-row queries | ✓ Paginated |

