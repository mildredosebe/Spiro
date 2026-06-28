import { Link } from "react-router";

const EFFECTIVE_DATE = "June 9, 2025";

export function Terms() {
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
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-primary/50">
            Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; SPIRO Online Store &nbsp;·&nbsp; Nairobi, Kenya
          </p>
        </div>

        {/* Intro */}
        <p className="text-sm text-primary/70 leading-relaxed mb-12">
          Welcome to SPIRO. By accessing, browsing, or purchasing products through
          our website, mobile application, or any other SPIRO platform, you agree
          to be bound by these Terms and Conditions. Please read them carefully
          before using our services.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <section>
            <h2 className="text-base font-black text-primary mb-3">1. Definitions</h2>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed">
              <li><strong className="text-primary font-bold">SPIRO, we, our, or us</strong> — refers to SPIRO Online Store.</li>
              <li><strong className="text-primary font-bold">Customer, you, or your</strong> — refers to any person using our platform.</li>
              <li><strong className="text-primary font-bold">Products</strong> — refers to electric motorcycles, spare parts, and accessories offered for sale through SPIRO.</li>
              <li><strong className="text-primary font-bold">Order</strong> — means a request made by a customer to purchase products.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">2. Eligibility</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              You must be at least 18 years old or have the consent of a parent or
              guardian to use our services and make purchases on the SPIRO platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">3. Account Registration</h2>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>Customers may create an account to access certain services.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>SPIRO reserves the right to suspend or terminate accounts that provide false information or violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">4. Products and Pricing</h2>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>We strive to ensure product descriptions, images, and prices are accurate.</li>
              <li>Prices are listed in Kenyan Shillings (KES).</li>
              <li>SPIRO reserves the right to correct pricing errors, update information, or discontinue products without prior notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">5. Orders</h2>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>An order is confirmed only after SPIRO accepts it and sends confirmation.</li>
              <li>SPIRO reserves the right to refuse or cancel any order due to pricing errors, stock unavailability, suspected fraud, or other legitimate reasons.</li>
              <li>Customers will be notified if an order cannot be fulfilled.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">6. Payments</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-2">
              SPIRO accepts the following payment methods:
            </p>
            <ul className="space-y-1 text-sm text-primary/70 leading-relaxed list-disc pl-4 mb-3">
              <li>M-Pesa</li>
              <li>Debit / Credit Cards</li>
              <li>Bank Transfers</li>
              <li>Other approved payment methods</li>
            </ul>
            <p className="text-sm text-primary/70 leading-relaxed">
              Payment must be completed before order processing unless Cash on
              Delivery is specifically offered.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">7. Delivery</h2>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>Delivery timelines are estimates and may vary depending on location and availability.</li>
              <li>SPIRO is not responsible for delays caused by circumstances beyond our control.</li>
              <li>Risk of loss transfers to the customer upon successful delivery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">8. Returns, Warranty, and Claims</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              Customers are required to inspect their motorcycle or spare parts{" "}
              <strong className="text-primary">at the point of delivery</strong>. Any issues relating to
              visible damage, incorrect items, or missing accessories must be reported{" "}
              <strong className="text-primary">within 48 hours of delivery</strong>. Once delivery is
              confirmed and this window has passed, delivery-related damage claims will not be accepted.
            </p>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              Motorcycles purchased through SPIRO are covered by the manufacturer's standard warranty
              against defects in materials and workmanship for the period specified at the time of
              purchase. The warranty does not cover damage resulting from misuse, accidents, unauthorised
              modifications, normal wear and tear (including tyres, brake pads, and battery capacity
              degradation), or failure to follow recommended maintenance.
            </p>
            <p className="text-sm text-primary/70 leading-relaxed mb-3">
              Spare parts and accessories may be returned unused, in original packaging, within{" "}
              <strong className="text-primary">7 days of delivery</strong> for a refund or exchange,
              provided they are not custom-fitted or otherwise marked non-returnable at checkout.
            </p>
            <p className="text-sm text-primary/70 leading-relaxed">
              SPIRO reserves the right to request photographs, videos, or other evidence to assess any
              claim before approving a refund, replacement, repair, or store credit.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">9. Customer Responsibilities</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-2">You agree to:</p>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>Provide accurate and truthful information.</li>
              <li>Not misuse the platform in any way.</li>
              <li>Not engage in fraudulent or illegal activities.</li>
              <li>Not interfere with the security or functionality of the website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">10. Intellectual Property</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              All content on SPIRO — including logos, text, images, graphics, and
              software — is the property of SPIRO and may not be copied, reproduced,
              or distributed without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">11. Limitation of Liability</h2>
            <p className="text-sm text-primary/70 leading-relaxed mb-2">
              To the maximum extent permitted by law, SPIRO shall not be liable for:
            </p>
            <ul className="space-y-2 text-sm text-primary/70 leading-relaxed list-disc pl-4">
              <li>Indirect or consequential damages.</li>
              <li>Loss of profits or business opportunities.</li>
              <li>Delays or interruptions beyond our reasonable control.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">12. Privacy</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              Your use of SPIRO is also governed by our{" "}
              <Link to="/privacy" className="text-primary font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
                Privacy Policy
              </Link>
              , which explains how we collect, use, and protect your personal
              information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">13. Changes to Terms</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              SPIRO reserves the right to modify these Terms and Conditions at any
              time. Updated versions will be posted on the website, and continued
              use of the platform constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">14. Governing Law</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              These Terms and Conditions shall be governed by and interpreted in
              accordance with the laws of the Republic of Kenya.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-primary mb-3">15. Contact Information</h2>
            <p className="text-sm text-primary/70 leading-relaxed">
              SPIRO Online Store<br />
              Email:{" "}
              <a href="mailto:info@spironet.com" className="text-primary font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
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
            to="/privacy"
            className="text-xs font-semibold text-primary/40 hover:text-primary transition-colors"
          >
            Privacy Policy →
          </Link>
        </div>

      </div>
    </div>
  );
}