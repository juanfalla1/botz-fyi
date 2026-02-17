# LEADS SYSTEM ANALYSIS - COMPLETE INDEX

## Investigation Overview

This analysis examines why adding a single lead doesn't trigger automatic table reload, but manual page refresh (F5) does.

**Created**: February 17, 2026
**Scope**: Complete lead loading and state management system
**Key Finding**: Race condition between async data fetch and modal close timeout

---

## Documents in This Analysis

### 1. LEADS_QUICK_REFERENCE.md (308 lines) ⭐ START HERE
**Best for**: Quick lookup, debugging, line numbers
- TL;DR summary of the problem
- Key line numbers for all files
- State flow diagrams
- Execution timelines
- Cache invalidation logic
- Debugging tips

### 2. LEADS_LOADING_ANALYSIS.md (203 lines)
**Best for**: Understanding the mechanism
- Executive summary
- Components overview
- API endpoints detailed
- State management explained
- Lead loading mechanisms
- Why single leads don't auto-load
- Why manual reload works
- Race condition analysis
- Solution options

### 3. LEADS_CODE_LOCATIONS.md (333 lines)
**Best for**: Code snippets and detailed reference
- Exact file paths and line numbers
- Code snippets for each component
- Function descriptions
- Type definitions
- Execution path diagrams
- Complete call graph
- Summary table of function calls

### 4. LEADS_INVESTIGATION_SUMMARY.md (234 lines)
**Best for**: Investigation report and evidence
- Findings overview
- Key components analyzed
- Race condition diagram
- Technical details
- Evidence trail
- Root cause explanation
- Recommendations
- Missing features

---

## Quick Navigation

### Finding Information About...

**How leads are created**:
- File: `/app/api/leads/create/route.ts` (lines 16-170)
- Reference: LEADS_CODE_LOCATIONS.md § "Create/Load Endpoints"
- UI Flow: LEADS_QUICK_REFERENCE.md § "Execution Timeline"

**Auto-refresh mechanism**:
- File: `/app/start/MainLayout.tsx` (lines 300-303)
- Reference: LEADS_QUICK_REFERENCE.md § "KEY LINE NUMBERS"
- Detail: LEADS_LOADING_ANALYSIS.md § "State Management for Leads"

**Data cache system**:
- File: `/app/start/components/CRMFullView.tsx` (lines 18-25, 812-866)
- Reference: LEADS_QUICK_REFERENCE.md § "Cache Invalidation Logic"
- Detail: LEADS_CODE_LOCATIONS.md § "CRM FULL VIEW"

**Why F5 reload works**:
- File: `/app/start/components/LeadsTable.tsx` (line 919)
- Reference: LEADS_LOADING_ANALYSIS.md § "Why Manual Page Reload Works"
- Diagram: LEADS_QUICK_REFERENCE.md § "Execution Timeline"

**The modal close issue**:
- File: `/app/start/components/LeadUpsertModal.tsx` (line 207)
- Analysis: LEADS_INVESTIGATION_SUMMARY.md § "ROOT CAUSE"
- Timeline: LEADS_QUICK_REFERENCE.md § "Single Lead Creation"

---

## Key Findings Summary

### Problem Statement
When user creates a single lead in the application:
1. Lead successfully created in database ✓
2. Refresh mechanism triggered ✓
3. Database query starts (async) ✓
4. Modal closes immediately (300ms) ✗
5. User sees nothing because query still fetching ✗
6. Eventually new lead appears (user might not notice)

### Why Manual F5 Reload Works
1. `window.location.reload()` called
2. Full page reload (ALL state cleared)
3. Component tree rebuilt
4. Cache invalidated (empty)
5. Fresh data fetch begins
6. All leads loaded fresh from database
7. New leads visible immediately ✓

### Root Cause
**Race Condition**:
- Modal close timeout (300ms, LeadUpsertModal.tsx:207)
- Async database query (network-dependent)
- Modal closes BEFORE fetch completes
- New lead not visible during modal transition

---

## File Locations (Quick List)

| Component | File Path |
|-----------|-----------|
| **API: Create Lead** | `/app/api/leads/create/route.ts` |
| **API: Bulk Upload** | `/app/api/upload-leads/route.ts` |
| **API: Lead Status** | `/app/api/lead-status/route.ts` |
| **State Manager** | `/app/start/MainLayout.tsx` |
| **CRM Dashboard** | `/app/start/components/CRMFullView.tsx` |
| **Leads Table** | `/app/start/components/LeadsTable.tsx` |
| **Lead Modal** | `/app/start/components/LeadUpsertModal.tsx` |
| **Kanban Board** | `/app/start/components/KanbanBoard.tsx` |

---

## Critical Line Numbers

| File | Line(s) | What |
|------|---------|------|
| MainLayout.tsx | 300 | dataRefreshKey state |
| MainLayout.tsx | 301-303 | triggerDataRefresh() function |
| LeadUpsertModal.tsx | 205 | triggerDataRefresh() call (CREATE) |
| LeadUpsertModal.tsx | 207 | Modal close timeout |
| LeadsTable.tsx | 609 | POST /api/leads/create |
| LeadsTable.tsx | 649 | triggerDataRefresh() call |
| LeadsTable.tsx | 919 | window.location.reload() |
| CRMFullView.tsx | 18-25 | globalLeadsCache |
| CRMFullView.tsx | 219 | tableLeads state |
| CRMFullView.tsx | 428-487 | fetchAllLeadsForTable() |
| CRMFullView.tsx | 827 | Cache invalidation check |
| CRMFullView.tsx | 866 | useEffect dependency (dataRefreshKey) |

---

## Use Cases

### Use Case 1: I need to fix the auto-load issue
1. Read: LEADS_QUICK_REFERENCE.md (1-5 min)
2. Review: LEADS_INVESTIGATION_SUMMARY.md § "RECOMMENDATIONS" (5 min)
3. Implement: Option 2 (Real-Time Subscriptions) is recommended

### Use Case 2: I need to understand the system
1. Start: LEADS_LOADING_ANALYSIS.md (10 min)
2. Deep-dive: LEADS_CODE_LOCATIONS.md (15 min)
3. Reference: Keep LEADS_QUICK_REFERENCE.md handy

### Use Case 3: I need to debug a lead issue
1. Check: LEADS_QUICK_REFERENCE.md § "DEBUGGING TIPS"
2. Reference: LEADS_CODE_LOCATIONS.md for exact code
3. Look up: Line numbers from file summaries

### Use Case 4: I need to know what changed where
1. Check: LEADS_CODE_LOCATIONS.md § "EXECUTION PATH" sections
2. Trace: Call graph showing what calls what
3. Reference: Line numbers for precise location

---

## Key Functions

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `triggerDataRefresh()` | MainLayout.tsx | 301-303 | Increment refresh key |
| `fetchAllLeadsForTable()` | CRMFullView.tsx | 428-487 | Load all leads paginated |
| `handleSave()` | LeadUpsertModal.tsx | 93-221 | Create/edit/delete lead |
| `handleFileUpload()` | LeadsTable.tsx | 910-923 | Upload Excel file |
| `invalidateLeadsCache()` | CRMFullView.tsx | 22-25 | Clear cache |
| `fetchLeadCounts()` | CRMFullView.tsx | 489-520 | Count leads |
| `fetchRecentFromTable()` | CRMFullView.tsx | 401-425 | Load time-windowed data |

---

## State Variables

| Variable | Component | Type | Purpose |
|----------|-----------|------|---------|
| `dataRefreshKey` | MainLayout | number | Version key for cache |
| `tableLeads` | CRMFullView | Lead[] | Main table display data |
| `metricRows` | CRMFullView | Lead[] | Recent data for charts |
| `globalLeadsCache` | CRMFullView | any[] | Module-level cache |
| `globalLeadsCacheKey` | CRMFullView | number | Cache version |
| `leadCounts` | CRMFullView | object | Totals/month/converted |

---

## API Endpoints

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | `/api/leads/create` | route.ts | Create single lead |
| POST | `/api/upload-leads` | route.ts | Bulk upload (proxies to n8n) |
| GET | `/api/lead-status` | route.ts | Check lead status by phone |

---

## Dependencies & Hooks

| Hook | Provider | Used In |
|------|----------|---------|
| `useAuth()` | MainLayout.tsx | All components needing auth/refresh |
| `useState()` | React | All components managing state |
| `useEffect()` | React | Data loading, subscriptions |
| `useCallback()` | React | Function memoization |

---

## Testing & Debugging

### To Test Auto-Load
1. Open browser DevTools Console
2. Add lead via modal
3. Check console: `dataRefreshKey` should increment
4. Monitor CRMFullView: Should call `fetchAllLeadsForTable()`
5. Timing: Note time between modal close and new lead appearance

### To Verify Cache Works
```javascript
// In browser console
window.location.pathname = '/start'  // Navigate to CRM
// Then in CRMFullView component, log:
console.log(globalLeadsCacheKey)
console.log(dataRefreshKey)
// Should see matching numbers after first load
```

---

## Recommendations (Prioritized)

1. **High Priority**: Add Supabase real-time subscriptions
   - Eliminates polling dependency
   - Provides true real-time updates
   - Better
