import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

const effectiveDate = "June 18, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300 mb-3">
          Legal
        </p>
        <h1 className="text-3xl font-bold text-cyan-400 mb-3">
          Terms and Conditions
        </h1>
        <p className="text-white/70 mb-8">Effective date: {effectiveDate}</p>

        <p className="mb-4">
          These Terms and Conditions (the "Terms") govern your access to and use
          of BOTZ, available at{" "}
          <a href="https://www.botz.fyi" className="text-cyan-400">
            https://www.botz.fyi
          </a>
          , including our websites, applications, dashboards, APIs, AI content
          generation tools, AI video generation tools, social media publishing
          features, account management features, integrations, support services,
          and related products (collectively, the "Service"). The Service is
          operated by BOTZ ("BOTZ," "we," "us," or "our").
        </p>

        <p className="mb-4">
          By creating an account, connecting a third-party platform, authorizing
          access through OAuth, purchasing a subscription, or otherwise using the
          Service, you agree to these Terms. If you use the Service on behalf of
          a company, agency, brand, or other organization, you represent that you
          have authority to bind that organization, and "you" includes that
          organization. If you do not agree, you must not use the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. Description of the Service</h2>
        <p className="mb-4">
          BOTZ is a software-as-a-service platform that helps users create,
          manage, schedule, and publish content with artificial intelligence.
          The Service may include AI-assisted text generation, image or video
          ideation, AI video generation, campaign planning, content libraries,
          automated posting to social media platforms, analytics, workflow
          automation, and integrations with platforms such as TikTok, LinkedIn,
          Google services, OpenAI, Supabase, Google Cloud, payment providers,
          and other third-party APIs.
        </p>
        <p className="mb-4">
          The Service is intended to support content operations and marketing
          workflows. BOTZ does not guarantee that generated content, publishing
          results, engagement metrics, account growth, revenue, platform review
          outcomes, or moderation decisions by third-party platforms will meet
          your expectations.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. Eligibility</h2>
        <p className="mb-4">
          You must be at least 18 years old, or the age of majority in your
          jurisdiction, to use the Service. You may not use the Service if you
          are barred from doing so under applicable law, if your account has
          been suspended or terminated for violation of these Terms, or if your
          use would violate sanctions, export control, consumer protection,
          advertising, privacy, intellectual property, or platform-specific
          rules.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. Account Registration and Management</h2>
        <p className="mb-4">
          To access certain features, you may need to create an account and
          provide accurate information, including your name, email address,
          organization details, billing information, and authentication
          credentials. You are responsible for keeping your account information
          current and for maintaining the confidentiality of your login
          credentials, OAuth authorizations, API keys, connected social accounts,
          and any user permissions you configure.
        </p>
        <p className="mb-4">
          You are responsible for all activity under your account, including
          activity by employees, contractors, collaborators, agencies, or other
          users you invite. You must promptly notify us at{" "}
          <a href="mailto:info@botz.fyi" className="text-cyan-400">
            info@botz.fyi
          </a>{" "}
          if you believe your account, credentials, connected accounts, or OAuth
          tokens have been compromised.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. Acceptable Use</h2>
        <p className="mb-4">You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4 text-white/90">
          <li>Violate any applicable law, regulation, court order, or third-party platform policy.</li>
          <li>Create, upload, publish, distribute, or promote unlawful, deceptive, fraudulent, infringing, defamatory, harassing, hateful, violent, sexually exploitative, or otherwise harmful content.</li>
          <li>Impersonate any person or organization, misrepresent affiliations, or create misleading endorsements.</li>
          <li>Generate or publish spam, scams, phishing material, malware, malicious links, or manipulative engagement activity.</li>
          <li>Collect, infer, process, or publish personal data without a valid legal basis or required consent.</li>
          <li>Use automation in a way that violates TikTok, LinkedIn, Google, Meta, X, YouTube, or any other third-party platform terms.</li>
          <li>Reverse engineer, scrape, overload, interfere with, or attempt unauthorized access to the Service or its infrastructure.</li>
          <li>Bypass usage limits, security controls, content moderation, subscription restrictions, or technical protections.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. User Responsibility</h2>
        <p className="mb-4">
          You are solely responsible for your inputs, prompts, files, brand
          materials, instructions, connected accounts, approval workflows,
          scheduled posts, published content, and decisions made using the
          Service. You must review and approve content before publication where
          appropriate, ensure that content is accurate and lawful, and maintain
          all required rights, licenses, permissions, disclosures, and consents.
        </p>
        <p className="mb-4">
          You are responsible for complying with advertising rules, influencer
          disclosure requirements, consumer protection laws, intellectual
          property laws, privacy laws, sector-specific regulations, and the terms
          and community guidelines of each social or business platform you use.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. User Content</h2>
        <p className="mb-4">
          "User Content" means content, data, prompts, files, media, brand
          assets, account information, captions, videos, images, comments,
          instructions, and other materials that you submit to, generate with,
          store in, or publish through the Service. As between you and BOTZ, you
          retain ownership of your User Content, subject to the rights and
          licenses you grant in these Terms.
        </p>
        <p className="mb-4">
          You grant BOTZ a worldwide, non-exclusive, royalty-free license to
          host, store, reproduce, process, transmit, display, format, modify as
          technically necessary, and use your User Content solely to provide,
          secure, maintain, improve, and support the Service, including to
          publish content to third-party platforms when you direct us to do so.
        </p>
        <p className="mb-4">
          You represent and warrant that you have all rights necessary to provide
          and use User Content with the Service and that your User Content does
          not violate these Terms, applicable law, or third-party rights.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. AI-Generated Content Disclaimer</h2>
        <p className="mb-4">
          The Service may use artificial intelligence models and third-party AI
          providers, including OpenAI and other model or media-generation APIs,
          to generate text, concepts, recommendations, images, video assets,
          scripts, captions, hashtags, summaries, or other outputs
          ("AI Outputs"). AI Outputs may be inaccurate, incomplete, offensive,
          repetitive, non-unique, infringing, unsuitable for your audience, or
          inconsistent with platform rules.
        </p>
        <p className="mb-4">
          You are responsible for independently reviewing, editing, fact-checking,
          and approving AI Outputs before relying on them or publishing them. BOTZ
          does not provide legal, financial, medical, professional, advertising,
          or compliance advice, and AI Outputs should not be treated as such.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8. Third-Party Integrations</h2>
        <p className="mb-4">
          The Service may allow you to connect third-party services, including
          TikTok, LinkedIn, Google, OpenAI, Supabase, Google Cloud, payment
          processors, analytics providers, and other APIs. Your use of those
          services is governed by their own terms, policies, permissions,
          developer rules, rate limits, review requirements, and data practices.
        </p>
        <p className="mb-4">
          When you connect TikTok or another platform through OAuth, you authorize
          BOTZ to access, process, and use the permitted account data and tokens
          necessary to provide the requested features, such as account
          identification, authorization validation, content preparation,
          scheduling, publishing, and status retrieval. You may revoke third-party
          access through your BOTZ account settings, where available, or through
          the relevant third-party platform settings.
        </p>
        <p className="mb-4">
          BOTZ is not responsible for third-party services, outages, API changes,
          moderation decisions, account restrictions, removal of content, loss of
          access, data processing by third parties, or any consequences of your
          use of third-party platforms. We may modify or discontinue integrations
          if required by technical, legal, commercial, or platform-policy reasons.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">9. Intellectual Property</h2>
        <p className="mb-4">
          BOTZ and its licensors own all rights, title, and interest in and to
          the Service, including software, interfaces, workflows, designs,
          trademarks, logos, service marks, documentation, templates, systems,
          and underlying technology. Except for the limited right to use the
          Service under these Terms, no rights are transferred to you.
        </p>
        <p className="mb-4">
          You may provide feedback, ideas, or suggestions about the Service. You
          grant BOTZ a perpetual, irrevocable, worldwide, royalty-free right to
          use that feedback without restriction or compensation.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">10. Plans, Payments, and Subscriptions</h2>
        <p className="mb-4">
          Certain features may require a paid plan, subscription, usage package,
          or other paid access. Prices, included features, usage limits, billing
          intervals, taxes, and renewal terms are presented at purchase or in the
          applicable order, invoice, or plan description. Unless stated otherwise,
          subscriptions renew automatically until canceled.
        </p>
        <p className="mb-4">
          You authorize BOTZ and its payment processors to charge all applicable
          fees, taxes, overages, and renewal amounts using your selected payment
          method. Fees are non-refundable except where required by law or
          expressly stated in writing. We may change pricing or plan features on
          reasonable notice, and changes may apply at renewal or as otherwise
          permitted by law.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">11. Suspension and Termination</h2>
        <p className="mb-4">
          You may stop using the Service at any time and may request account
          deletion as described in our Privacy Policy. We may suspend, restrict,
          or terminate your account or access to the Service if we reasonably
          believe that you violated these Terms, failed to pay fees, created risk
          for BOTZ or other users, violated third-party platform rules, caused a
          security or legal concern, or used the Service in a harmful or abusive
          manner.
        </p>
        <p className="mb-4">
          Upon termination, your right to use the Service ends immediately. We may
          retain or delete data in accordance with our Privacy Policy, legal
          obligations, backup practices, and legitimate business needs. Sections
          that by their nature should survive termination will survive, including
          intellectual property, payment obligations, disclaimers, limitation of
          liability, indemnification, governing law, and dispute provisions.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">12. Disclaimers and No Warranties</h2>
        <p className="mb-4">
          The Service is provided on an "as is" and "as available" basis. To the
          maximum extent permitted by law, BOTZ disclaims all warranties, whether
          express, implied, statutory, or otherwise, including warranties of
          merchantability, fitness for a particular purpose, title,
          non-infringement, accuracy, availability, reliability, security, and
          uninterrupted or error-free operation.
        </p>
        <p className="mb-4">
          BOTZ does not warrant that AI Outputs will be accurate, lawful,
          original, safe, accepted by third-party platforms, or suitable for your
          purpose. BOTZ does not warrant that integrations, APIs, social platform
          access, posting features, analytics, or third-party services will remain
          available or unchanged.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">13. Limitation of Liability</h2>
        <p className="mb-4">
          To the maximum extent permitted by law, BOTZ and its owners, officers,
          employees, contractors, suppliers, and affiliates will not be liable for
          indirect, incidental, special, consequential, exemplary, or punitive
          damages, or for loss of profits, revenue, goodwill, data, content,
          business opportunities, platform access, reputation, or anticipated
          savings, even if advised of the possibility of such damages.
        </p>
        <p className="mb-4">
          To the maximum extent permitted by law, BOTZ's total aggregate liability
          for all claims arising out of or relating to the Service or these Terms
          will not exceed the greater of (a) the amounts you paid to BOTZ for the
          Service in the three months before the event giving rise to the claim,
          or (b) USD $100.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">14. Indemnification</h2>
        <p className="mb-4">
          You agree to defend, indemnify, and hold harmless BOTZ and its owners,
          officers, employees, contractors, suppliers, and affiliates from and
          against any claims, damages, liabilities, losses, costs, and expenses,
          including reasonable legal fees, arising out of or related to your User
          Content, your use of the Service, your connected accounts, your
          violation of these Terms, your violation of law or third-party rights,
          your published or scheduled content, or your breach of any third-party
          platform terms or policies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">15. Changes to the Service or Terms</h2>
        <p className="mb-4">
          We may update the Service and these Terms from time to time. If changes
          are material, we will take reasonable steps to notify you, such as by
          posting the updated Terms on this page, updating the effective date, or
          sending notice through the Service or by email. Your continued use of
          the Service after changes become effective means you accept the updated
          Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">16. Governing Law and Jurisdiction</h2>
        <p className="mb-4">
          These Terms are governed by the laws of the Province of Ontario and the
          federal laws of Canada applicable therein, without regard to conflict of
          law principles. Subject to any mandatory rights you may have under
          applicable law, the courts located in Toronto, Ontario, Canada will have
          exclusive jurisdiction over disputes arising out of or relating to these
          Terms or the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">17. Contact Information</h2>
        <p className="mb-4">
          For questions about these Terms, contact BOTZ at{" "}
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
