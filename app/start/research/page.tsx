"use client";

import Link from "next/link";
import { FileSearch, Plus, ShieldCheck } from "lucide-react";
import { useAuth } from "../MainLayout";
import styles from "./research.module.css";

export default function ResearchEvidencePage() {
  const { user, loading, tenantId, isPlatformAdmin, hasFeatureAccess } = useAuth();

  if (loading) {
    return (
      <main className={styles.statePage}>
        <span className={styles.loader} />
        <p>Loading Research Evidence...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.statePage}>
        <section className={styles.accessCard}>
          <ShieldCheck size={34} />
          <h1>Sign in to access Research Evidence</h1>
          <p>Research projects are protected by your BOTZ account and tenant.</p>
          <Link href="/start?auth=1">Sign in</Link>
        </section>
      </main>
    );
  }

  if (!hasFeatureAccess("research")) {
    return (
      <main className={styles.statePage}>
        <section className={styles.accessCard}>
          <ShieldCheck size={34} />
          <h1>Research Evidence is not available for this account</h1>
          <p>Contact your BOTZ administrator to request access.</p>
          <Link href="/start">Return to BOTZ</Link>
        </section>
      </main>
    );
  }

  const workspaceLabel = isPlatformAdmin ? "Platform view" : "Client workspace";
  const tenantLabel = tenantId ? tenantId.slice(0, 8) : "No tenant selected";

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/start" className={styles.brand} aria-label="Return to BOTZ dashboard">
          botz<span>.</span>
        </Link>
        <div className={styles.workspace}>
          <span>{workspaceLabel}</span>
          <small>{tenantLabel}</small>
        </div>
        <div className={styles.avatar}>{(user.email || "B").slice(0, 1).toUpperCase()}</div>
      </header>

      <section className={styles.content}>
        <div className={styles.heading}>
          <div>
            <span>BOTZ TECHNOLOGIES</span>
            <h1>Research Evidence</h1>
            <p>Evidence-based research with verifiable sources and traceable claims.</p>
          </div>
          <button type="button" className={styles.primaryAction} disabled title="Available in the next phase">
            <Plus size={17} />
            New Research
          </button>
        </div>

        <section className={styles.recent} aria-labelledby="recent-research-title">
          <div className={styles.sectionHeading}>
            <div>
              <span>RESEARCH WORKSPACE</span>
              <h2 id="recent-research-title">Recent Research</h2>
            </div>
          </div>

          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FileSearch size={30} />
            </div>
            <h3>No research projects yet.</h3>
            <p>Start your first evidence-based research project.</p>
            <button type="button" className={styles.primaryAction} disabled title="Available in the next phase">
              <Plus size={17} />
              New Research
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
