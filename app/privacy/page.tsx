import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

const effectiveDate = "June 18, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300 mb-3">
          Legal
        </p>
        <h1 className="text-3xl font-bold text-cyan-400 mb-3">
          Privacy Policy
        </h1>
        <p className="text-white/70 mb-8">Effective date: {effectiveDate}</p>

        <p className="mb-4">
          This Privacy Policy explains how BOTZ ("BOTZ," "we," "us," or
          "our") collects, uses, stores, shares, protects, and deletes personal
          information when you use our website at{" "}
          <a href="https://www.botz.fyi" className="text-cyan-400">
            https://www.botz.fyi
          </a>{" "}
          and our software-as-a-service platform, including AI content
          generation, AI video generation, social media publishing, account
          management, OAuth integrations, support, APIs, and related services
          (collectively, the "Service").
        </p>
        <p className="mb-4">
          This Privacy Policy is designed to describe our data practices for
          users, customers, website visitors, and platform reviewers, including
          reviewers for TikTok Developer Platform and other business platforms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
        <p className="mb-4">We may collect the following categories of information:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4 text-white/90">
          <li>Account information, such as name, email address, password or authentication identifiers, organization name, role, profile settings, and user preferences.</li>
          <li>Contact and support information, such as messages, requests, phone number, support tickets, feedback, and communications with BOTZ.</li>
          <li>Billing and subscription information, such as plan selection, invoices, transaction identifiers, billing address, tax information, and payment status. Payment card details are processed by payment providers and are not intended to be stored directly by BOTZ.</li>
          <li>User content, such as prompts, scripts, captions, brand guidelines, media files, AI-generated outputs, scheduled posts, published content, comments, campaign data, and other materials you submit or create through the Service.</li>
          <li>Connected account information from third-party integrations, such as account IDs, usernames, display names, profile metadata, permissions, OAuth tokens, token expiration data, pages or channels available for publishing, posting status, and platform API responses.</li>
          <li>Device, usage, and log data, such as IP address, browser type, device identifiers, operating system, pages viewed, features used, timestamps, error logs, authentication events, API requests, referral URLs, and approximate location derived from IP address.</li>
          <li>Cookies and similar technologies, as described below.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. TikTok OAuth Data</h2>
        <p className="mb-4">
          If you connect a TikTok account to BOTZ, we collect and process data
          made available through TikTok OAuth and TikTok APIs based on the scopes
          and permissions you approve. This may include your TikTok open ID or
          account identifier, display name, avatar or profile image, authorized
          scopes, access tokens, refresh tokens where provided, token expiration
          information, account authorization status, video or publishing
          permissions, upload or posting status, and API responses necessary to
          prepare, schedule, publish, or verify content that you instruct BOTZ to
          manage.
        </p>
        <p className="mb-4">
          BOTZ uses TikTok OAuth data only to provide the TikTok-connected
          features you request, maintain account connections, display connected
          account status, publish or manage content as authorized, troubleshoot
          errors, comply with TikTok Developer Platform requirements, protect the
          Service, and honor deletion or revocation requests. BOTZ does not sell
          TikTok user data and does not use TikTok OAuth data for unrelated
          advertising or profiling.
        </p>
        <p className="mb-4">
          You may revoke BOTZ's access to TikTok through your TikTok account
          settings, through BOTZ account settings where available, or by
          contacting us at{" "}
          <a href="mailto:info@botz.fyi" className="text-cyan-400">
            info@botz.fyi
          </a>
          . Revocation may disable TikTok-related features.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. Information About User Accounts</h2>
        <p className="mb-4">
          We process user account information to create and authenticate accounts,
          manage organizations and team access, apply user permissions, maintain
          security controls, provide customer support, send service notices,
          manage subscriptions, and operate the Service. If you are invited to a
          workspace by another user or organization, that organization may be able
          to view your profile information, activity within the workspace,
          connected accounts, generated content, scheduled posts, and related
          usage information according to its permissions and settings.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. How We Use Information</h2>
        <p className="mb-4">We use personal information to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4 text-white/90">
          <li>Provide, operate, maintain, secure, and improve the Service.</li>
          <li>Create accounts, authenticate users, manage sessions, and prevent unauthorized access.</li>
          <li>Generate AI-assisted content and videos based on your prompts and instructions.</li>
          <li>Connect to third-party platforms through OAuth and APIs, including TikTok, LinkedIn, Google services, and other supported integrations.</li>
          <li>Schedule, publish, verify, and manage content on connected platforms when you direct us to do so.</li>
          <li>Process subscriptions, billing, invoices, taxes, and payment status.</li>
          <li>Provide support, respond to inquiries, troubleshoot errors, and communicate service updates.</li>
          <li>Monitor performance, debug issues, analyze usage trends, and improve product functionality.</li>
          <li>Detect, prevent, and respond to fraud, abuse, spam, security incidents, policy violations, and unlawful activity.</li>
          <li>Comply with legal obligations, platform developer rules, audits, enforcement requests, and dispute resolution.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. Cookies and Similar Technologies</h2>
        <p className="mb-4">
          We may use cookies, local storage, pixels, and similar technologies to
          keep you signed in, remember preferences, secure sessions, understand
          product usage, measure website performance, detect abuse, and improve
          the Service. Some cookies are necessary for authentication and security.
          Others may support analytics or product improvement.
        </p>
        <p className="mb-4">
          You can control cookies through your browser settings. Blocking certain
          cookies may limit functionality, including authentication, account
          management, dashboard access, or security features.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. Analytics and Tracking</h2>
        <p className="mb-4">
          We may use analytics and monitoring tools to understand how users find
          and use the Service, diagnose technical issues, monitor uptime,
          evaluate feature adoption, and improve user experience. Analytics data
          may include device and usage data, approximate location, referral
          source, pages viewed, feature interactions, and performance metrics. We
          do not use TikTok OAuth data for unrelated behavioral advertising.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. Data Storage</h2>
        <p className="mb-4">
          BOTZ uses cloud infrastructure and managed services to store and process
          data, including Supabase for backend, authentication, database, and
          storage functions, Google Cloud for infrastructure and related cloud
          services, OpenAI and other AI providers for model processing, and other
          processors that help us operate the Service. Data may be stored in
          production databases, object storage, logs, secure backups, and support
          systems.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8. Data Retention</h2>
        <p className="mb-4">
          We retain personal information for as long as necessary to provide the
          Service, maintain your account, comply with legal and platform
          obligations, resolve disputes, enforce agreements, prevent fraud, keep
          security records, and support legitimate business operations. Retention
          periods vary based on data type, account status, contractual needs,
          legal requirements, backup cycles, and technical constraints.
        </p>
        <p className="mb-4">
          OAuth tokens and connected account data are retained while the
          integration remains active or as needed for security, audit, error
          handling, or legal purposes. User content may remain until you delete
          it, close your account, or request deletion, subject to backups,
          platform records, legal obligations, and legitimate retention needs.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">9. Data Deletion Requests</h2>
        <p className="mb-4">
          You may request deletion of your account, personal information,
          connected account data, OAuth tokens, or specific User Content by
          contacting us at{" "}
          <a href="mailto:info@botz.fyi" className="text-cyan-400">
            info@botz.fyi
          </a>
          . Please include the email address associated with your BOTZ account,
          the data or integration you want deleted, and any information needed to
          verify your identity and authority over the account.
        </p>
        <p className="mb-4">
          We will process verified deletion requests within a reasonable period
          and in accordance with applicable law. Some information may be retained
          where required or permitted for security, fraud prevention, legal
          compliance, dispute resolution, financial records, backups, audit logs,
          or enforcement of our Terms. Content already published to third-party
          platforms may need to be deleted directly on those platforms or through
          available platform APIs, depending on platform capabilities and
          permissions.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">10. Security Measures</h2>
        <p className="mb-4">
          We use reasonable administrative, technical, and organizational measures
          designed to protect personal information, including authentication
          controls, role-based access where appropriate, encryption in transit,
          managed cloud security features, access restrictions, monitoring,
          backups, and incident response procedures. No method of transmission or
          storage is completely secure, and we cannot guarantee absolute security.
        </p>
        <p className="mb-4">
          You are responsible for protecting your login credentials, connected
          accounts, devices, API keys, OAuth authorizations, and administrative
          permissions. Notify us promptly if you suspect unauthorized access.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">11. Providers and External Processors</h2>
        <p className="mb-4">
          We may share information with service providers and processors that
          help us operate the Service, including cloud hosting providers, database
          and storage providers, authentication providers, AI model providers,
          video or media-processing APIs, payment processors, analytics tools,
          monitoring and logging services, email and communication providers,
          customer support tools, and professional advisors.
        </p>
        <p className="mb-4">
          These providers may process information only as needed to provide their
          services to BOTZ, comply with law, secure their systems, or fulfill
          their contractual obligations. Examples of providers or integration
          categories include Supabase, Google Cloud, OpenAI, TikTok, LinkedIn,
          Google services, payment processors, email delivery providers, and
          analytics or monitoring vendors.
        </p>
        <p className="mb-4">
          We may also disclose information if required by law, legal process,
          platform compliance review, security investigation, enforcement of our
          Terms, protection of rights or safety, corporate transaction, merger,
          acquisition, financing, reorganization, or sale of assets.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">12. International Data Transfers</h2>
        <p className="mb-4">
          BOTZ may process and store information in Canada, the United States,
          and other countries where we, our providers, or connected platforms
          operate. These countries may have data protection laws different from
          those in your jurisdiction. Where required, we rely on appropriate legal
          mechanisms for international transfers, such as contractual safeguards,
          consent, adequacy decisions, or other lawful transfer mechanisms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">13. User Rights</h2>
        <p className="mb-4">
          Depending on your location, you may have rights to access, correct,
          update, export, restrict, object to, or delete your personal
          information, and to withdraw consent where processing is based on
          consent. You may also have the right to complain to a privacy regulator
          or supervisory authority.
        </p>
        <p className="mb-4">
          We will not discriminate against you for exercising privacy rights. Some
          rights may be limited by legal obligations, security needs, business
          records, platform requirements, or our need to provide the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">14. Privacy Request Procedure</h2>
        <p className="mb-4">To submit a privacy request:</p>
        <ol className="list-decimal pl-6 space-y-2 mb-4 text-white/90">
          <li>Email us at <a href="mailto:info@botz.fyi" className="text-cyan-400">info@botz.fyi</a> with the subject line "Privacy Request."</li>
          <li>Identify the request type, such as access, correction, deletion, OAuth revocation, data export, or restriction.</li>
          <li>Provide the email address associated with your BOTZ account and enough information for us to verify your identity.</li>
          <li>If you make a request on behalf of an organization or another person, provide proof of authority.</li>
        </ol>
        <p className="mb-4">
          We may request additional information to verify your identity and
          protect account security. We will respond within the timeframe required
          by applicable law, or within a reasonable period if no specific
          timeframe applies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">15. Children</h2>
        <p className="mb-4">
          The Service is not intended for children under 13, and it is generally
          intended for business users who are at least 18 years old or the age of
          majority in their jurisdiction. We do not knowingly collect personal
          information from children. If you believe a child has provided personal
          information to us, contact us so we can take appropriate action.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">16. Changes to This Privacy Policy</h2>
        <p className="mb-4">
          We may update this Privacy Policy from time to time to reflect changes
          in the Service, legal requirements, provider practices, or platform
          rules. If changes are material, we will take reasonable steps to notify
          you, such as posting the updated policy, changing the effective date,
          or providing notice through the Service or by email.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">17. Contact Information</h2>
        <p className="mb-4">
          For privacy questions, deletion requests, OAuth data requests, or other
          privacy rights requests, contact BOTZ at{" "}
          <a href="mailto:info@botz.fyi" className="text-cyan-400">
            info@botz.fyi
          </a>{" "}
          or by phone at{" "}
          <a href="tel:+14374351594" className="text-cyan-400">
            +1 (437) 435-1594
          </a>
          .
        </p>
      </div>
    </div>
  );
}
