export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-hf-dark text-hf-text">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-hf-muted text-sm font-mono mb-2">Last updated: March 2026</p>
          <h1 className="font-display text-4xl font-bold text-gradient mb-4">Privacy Policy</h1>
          <p className="text-hf-muted">HotFans LLC is committed to protecting your privacy.</p>
        </div>

        <div className="space-y-8 text-hf-text leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>Email address (for authentication)</li>
              <li>Username and profile information you provide</li>
              <li>Payment information (processed securely by our payment partners)</li>
              <li>Content you upload to the platform</li>
              <li>Usage data and activity on the platform</li>
              <li>Identity verification data (processed by Veriff)</li>
              <li>Device and browser information</li>
              <li>IP address and approximate location</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>To provide and improve our services</li>
              <li>To process payments and prevent fraud</li>
              <li>To verify age and identity as required by law</li>
              <li>To send transactional emails (receipts, notifications)</li>
              <li>To comply with legal obligations</li>
              <li>To enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>Payment processors (North, CCBill) to process transactions</li>
              <li>Identity verification providers (Veriff) for age verification</li>
              <li>Cloud infrastructure providers (Supabase, Vercel)</li>
              <li>Law enforcement when required by valid legal process</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion, we delete your personal data within 30 days, except where retention is required by law (such as financial records and 2257 compliance records).</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Your Rights</h2>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact: <span className="text-hf-orange">privacy@hotfans.com</span></p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Cookies</h2>
            <p>We use essential cookies for authentication and session management. See our <a href="/legal/cookies" className="text-hf-orange hover:underline">Cookie Policy</a> for details.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Contact</h2>
            <p>Privacy questions: <span className="text-hf-orange">privacy@hotfans.com</span></p>
          </section>
        </div>
      </div>
    </div>
  );
}
