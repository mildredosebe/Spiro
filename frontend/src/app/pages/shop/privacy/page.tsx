import { Link } from "react-router";

const LAST_UPDATED = "June 9, 2025";

export function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">

        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary/40 hover:text-primary transition-colors mb-10"
        >
          ← Back to Store
        </Link>

        {/* Title block */}
        <div className="mb-10 pb-8 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-primary/40 mb-3">
            Legal
          </p>
          <h1 className="text-3xl font-black text-primary mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-primary/50">
            Last Updated: {LAST_UPDATED} &nbsp;·&nbsp; SPIRO Online Store &nbsp;·&nbsp; Nairobi, Kenya
          </p>
        </div>

        {/* Intro */}
        <p className="text-sm text-primary/70 leading-relaxed mb-12">
          Welcome to SPIRO Online Store. We respect your privacy and are committed
          to protecting the personal information you provide to us. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your
          information when you use our website, mobile application, or services.
          Our practices are aligned with the Kenya Data Protection Act, 2019.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <section>
            <h2 className="text-base font-black text-primary mb-3">1. Information We Collect</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              We may collect the following types of information:
            </p>

            <p className="text-sm font-bold text-primary mb-1">Personal Information</p>
            <ul className="space-y-1 text-sm text-primary/70 leading-relaxed list-disc pl-4 mb-4">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Delivery address</li>
              <li>Account credentials</li>
              <li>Payment details (processed securely via our payment partners)</li>
            </ul>

            <p className="text-sm font-bold text-primary mb-1">Automatically Collected Information</p>
            <ul className="space-y-1 text-sm text-primary/70 leading-relaxed list-disc pl-4 mb-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device and operating system information</li>
              <li>Pages visited and time spent on the platform</li>
              <li>Usage data and analytics</li>
            </ul>

            <p className="text-sm font-bold text-primary mb-1">Cookies and Tracking Technologies</p>
            <p className="text-sm text-primary/70 leading-relaxed">
              We use cookies and similar technologies to keep you logged in,
              remember your cart, analyse traffic, and personalise your experience.
              You may disable cookies in your browser settings, though some features
              may not work correctly without them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">2. How We Use Your Information</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-2">
              We may use your information to:
            </p>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>Provide and maintain our services</li>
              <li>Process and fulfil your orders</li>
              <li>Communicate with you regarding orders, deliveries, and support</li>
              <li>Improve our products and platform</li>
              <li>Monitor and analyse usage patterns</li>
              <li>Personalise your shopping experience</li>
              <li>Comply with legal obligations under Kenyan law</li>
              <li>Detect and prevent fraud and security threats</li>
              <li>Send promotional messages — only with your explicit consent, and you may opt out at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">3. Sharing of Information</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              We may share your information with:
            </p>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4 mb-4">
              <li>Service providers and delivery partners who assist in fulfilling your orders, under strict confidentiality obligations</li>
              <li>Payment processors (e.g., M-Pesa / Safaricom) who handle transaction data in compliance with PCI DSS standards</li>
              <li>Analytics providers who receive aggregated, anonymised usage data</li>
              <li>Legal authorities when required by Kenyan law or a court order</li>
              <li>Successors in the event of a merger, acquisition, or sale of SPIRO assets</li>
            </ul>
            <p className="text-sm text-primary/70 leading-relaxed">
              We do <strong className="text-primary">not</strong> sell, rent, or
              trade your personal information to third parties for their own
              marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">4. Data Security</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              We implement reasonable administrative, technical, and physical
              safeguards to protect your information — including HTTPS encryption
              for all data in transit and access controls that restrict employee
              access to personal data. However, no method of transmission over the
              internet is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">5. Data Retention</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              We retain personal information only as long as necessary for the
              purposes described in this policy or as required by law. As a guide:
            </p>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li><strong className="text-primary font-bold">Account data</strong> — retained while your account is active; deleted within 90 days of account closure on request.</li>
              <li><strong className="text-primary font-bold">Order records</strong> — retained for a minimum of 5 years for financial and legal compliance.</li>
              <li><strong className="text-primary font-bold">Analytics data</strong> — aggregated and anonymised; may be retained indefinitely.</li>
              <li><strong className="text-primary font-bold">Marketing consent</strong> — retained until you withdraw consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">6. Your Rights</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              Under the Kenya Data Protection Act, 2019, you have the right to:
            </p>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4 mb-3">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your data where we have no legal basis to retain it</li>
              <li>Restrict or object to how we process your data</li>
              <li>Withdraw consent at any time</li>
              <li>Request data portability in a structured, machine-readable format</li>
            </ul>
            <p className="text-sm text-primary/70 leading-relaxed">
              To exercise any of these rights, contact us at{" "}
              
                <a href="mailto:info@spironet.com"
                className="text-primary font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                info@spironet.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">7. Children's Privacy</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              SPIRO services are not directed to children under the age of 18. We
              do not knowingly collect personal information from minors. If you
              believe we have inadvertently collected data from a child, please
              contact us and we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">8. Third-Party Services</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              Our platform integrates with the following third-party services, each
              governed by their own privacy policies:
            </p>
            <ul className="space-y-1 text-sm text-primary/70 leading-relaxed list-disc pl-4 mb-3">
              <li>M-Pesa / Safaricom — payment processing</li>
              <li>Google (Firebase / Analytics) — authentication and usage analytics</li>
              <li>Cloudinary — image delivery and storage</li>
            </ul>
            <p className="text-sm text-primary/70 leading-relaxed">
              We are not responsible for the privacy practices of those third
              parties. We encourage you to review their policies independently.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">9. Changes to This Privacy Policy</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page with an updated effective date. Where
              changes are material, we will notify you via email or an in-app
              notice. Continued use of SPIRO after changes are posted constitutes
              your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">10. Contact Us</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              If you have questions or concerns about this Privacy Policy, please
              contact us:
            </p>
            <p className="text-sm text-primary/70 leading-relaxed mt-3">
              SPIRO Online Store<br />
              Email:{" "}
              
                <a href="mailto:info@spironet.com"
                className="text-primary font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                info@spironet.com
              </a><br />
              Phone: +254 711 660 372<br />
              Location: Nairobi, Kenya
            </p>
          </section>

        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border flex items-center justify-between">
          <p className="text-xs text-primary/30">
            © {new Date().getFullYear()} SPIRO Online Store. All rights reserved.
          </p>
          <Link
            to="/terms"
            className="text-xs font-semibold text-primary/40 hover:text-primary transition-colors"
          >
            Terms &amp; Conditions →
          </Link>
        </div>

      </div>
    </div>
  );
}