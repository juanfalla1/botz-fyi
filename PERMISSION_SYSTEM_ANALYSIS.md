# Botz Permission System Analysis

## Overview
The Botz platform implements a **multi-level permission system** with three distinct user types:
1. **Platform Admins** - Application owners (manage platform, clients, all features)
2. **Tenant Admins** - Company owners who purchase plans (create team members, control features)
3. **Team Members (Asesores)** - Employees of tenant (limited access based on plan + role)

---

## 1. Database Schema: User & Permission Tables

### 1.1 Platform Admins Table
**Location:** `supabase/migrations/004_support_chat_platform_admin.sql`

```sql
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Track Botz staff/owners with full system access

**RLS Policies:** Only platform admins can view/manage the list

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.auth_user_id = auth.uid()
  );
$$;
```

---

### 1.2 Team Members Table
**Location:** `sql_setup_team_members.sql` + migrations

**Schema:**
```sql
CREATE TABLE team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT,
    rol TEXT NOT NULL DEFAULT 'asesor',  -- 'admin' or 'asesor'
    tenant_id UUID,
    auth_user_id UUID,  -- Links to Supabase Auth user
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `rol`: Determines what features the team member can access
  - `'admin'`: Tenant owner - full tenant access
  - `'asesor'`: Employee - limited access (only assigned leads)
- `tenant_id`: Which tenant/company this person belongs to
- `auth_user_id`: Links to Supabase Auth users table
- `activo`: Soft delete flag

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_team_members_auth_user_id ON team_members(auth_user_id);
CREATE INDEX idx_team_members_tenant_id ON team_members(tenant_id);
```

---

### 1.3 Admin Invites Table
**Location:** `supabase/migrations/009_create_admin_invites_table.sql`

```sql
CREATE TABLE admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer',  -- 'developer', 'guest', 'support'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'rejected', 'revoked'
  access_level TEXT NOT NULL DEFAULT 'full',  -- 'full', 'readonly', 'limited'
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(email)
);
```

**Purpose:** Manage platform admin invitations (not tenant team members)

**Access Levels:**
- `'full'`: Unrestricted access to all features
- `'readonly'`: View-only access to data
- `'limited'`: Restricted access to specific features

**RLS Policies:** Only platform admins can manage invites

---

### 1.4 Invite Tokens Table
**Location:** `supabase/migrations/010_create_invite_tokens_table.sql`

```sql
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES admin_invites(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used BOOLEAN DEFAULT FALSE,
  metadata JSONB
);
```

**Purpose:** Track invitation link tokens and their usage

---

## 2. Feature Access Control

### 2.1 Plan-Based Feature Gating
**Location:** `app/start/MainLayout.tsx` (lines 56-90)

The system uses **subscription plans** to control which features are enabled:

```typescript
const ALL_FEATURES = [
  "demo",           // Operación en Vivo
  "hipoteca",       // Cálculo Hipotecario (Motor Hipotecario)
  "channels",       // Gestión de Canales (WhatsApp, etc.)
  "agents",         // Agentes IA
  "n8n-config",     // Dashboard Ejecutivo
  "crm",            // CRM en Vivo
  "sla",            // Alertas SLA
  "kanban",         // Tablero Kanban
];

const PLAN_FEATURES = {
  free: ["demo"],
  "Básico": ALL_FEATURES,
  "Basico": ALL_FEATURES,
  Growth: ALL_FEATURES,
  "A la Medida": ALL_FEATURES,
  Enterprise: ALL_FEATURES,
  Administrator: ALL_FEATURES,
};
```

**Rule:** If user has ANY paid plan (not "free"), ALL features are enabled.

### 2.2 Feature-to-Plan Mapping
```typescript
const FEATURE_MIN_PLAN = {
  demo: "free",
  hipoteca: "Growth",
  channels: "Básico",
  agents: "Básico",
  "n8n-config": "A la Medida",
  crm: "Growth",
  sla: "A la Medida",
  kanban: "Growth",
};
```

### 2.3 Feature Label Mapping
```typescript
const FEATURE_LABELS = {
  demo: "Operación en Vivo",
  hipoteca: "Motor Hipotecario",
  channels: "Gestión de Canales",
  agents: "Agentes IA",
  crm: "CRM en Vivo",
  kanban: "Tablero Kanban",
  sla: "Alertas SLA",
  "n8n-config": "Dashboard Ejecutivo",
};
```

### 2.4 How Feature Access is Checked

**In Main UI** (`MainLayout.tsx:908-922`):
```typescript
const hasFeatureAccess = useCallback(
  (featureId: string): boolean => {
    if (isPlatformAdmin) return true;  // Platform admins see all features
    const resolvedId = featureId === "control-center" ? "crm" : featureId;
    const hasAccess = enabledFeatures.includes(resolvedId);
    console.log(`🔐 Verificando acceso a "${resolvedId}": ${hasAccess}`);
    return hasAccess;
  },
  [enabledFeatures, isPlatformAdmin]
);
```

**In Tab Navigation** (`MainLayout.tsx:2530`):
```typescript
navTabs.map((tab) => {
  const isActive = activeTab === tab.id;
  const isLocked = !hasFeatureAccess(tab.id);  // Check if feature is accessible
  
  return (
    <button
      onClick={() => handleTabClick(tab.id, tab.label)}
      style={{
        opacity: isLocked ? 0.6 : 1,  // Dim locked tabs
        color: isLocked ? "#475569" : "#94a3b8",  // Gray out locked tabs
      }}
    >
      {tab.label}
      {isLocked && isSidebarExpanded && (
        <Lock size={12} color="#64748b" />  // Show lock icon
      )}
    </button>
  );
});
```

When user clicks locked feature:
- Modal shows: "Feature Locked"
- Displays: Required plan and upgrade CTA
- Uses `setLockedModalOpen()` to trigger modal

---

## 3. Sign-Up & Onboarding Flow

### 3.1 OTP Sign-Up (Email-Based)
**Location:** `app/api/auth/request-otp/route.ts` + `app/api/auth/verify-otp/route.ts`

**Flow:**
1. User requests OTP code for email
2. OTP created in `otp_sessions` table with expiration
3. User verifies OTP code (3 attempts before block)
4. Session marked as `is_verified: true`
5. User can then proceed to login/signup

**Code:** Managed via `otp_sessions` table (not shown in provided files, but referenced in verify-otp)

### 3.2 Normal User Registration (Tenant Admin Path)
**Current State:** Limited documented flow

When a normal user signs up:
1. They create an auth account via email/password
2. **No automatic team_member record created**
3. System treats them as **Tenant Admin** (owner) by default
4. They're assigned a subscription plan (free or paid)
5. Features enabled based on plan

### 3.3 Subscription & Feature Assignment
**Location:** `app/start/MainLayout.tsx:321-343`

```typescript
const applySubscription = useCallback((activeSub: any | null) => {
  if (activeSub) {
    setSubscription(activeSub);
    const tenantPlan = activeSub.plan || "free";
    setUserPlan(tenantPlan);
    
    // Map plan to available features
    const planFeatures = PLAN_FEATURES[tenantPlan] || PLAN_FEATURES["free"];
    setEnabledFeatures(planFeatures);
    
    console.log("🎯 [SUB] Plan:", tenantPlan, "| Features:", planFeatures);
  } else {
    console.log("ℹ️ [SUB] No active subscription → plan free");
    setUserPlan("free");
    setEnabledFeatures(PLAN_FEATURES["free"]);  // Only "demo" feature
  }
  setSubscriptionUpdateKey((prev) => prev + 1);
}, []);
```

---

## 4. Invitation S
