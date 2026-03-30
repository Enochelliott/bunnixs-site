export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-hf-dark text-hf-text">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-hf-muted text-sm font-mono mb-2">Last updated: March 2026</p>
          <h1 className="font-display text-4xl font-bold text-gradient mb-4">Terms of Service</h1>
          <p className="text-hf-muted">Please read these terms carefully before using HotFans.</p>
        </div>

        <div className="space-y-8 text-hf-text leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using HotFans ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. HotFans is operated by HotFans LLC, a New Mexico limited liability company.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">2. Eligibility</h2>
            <p className="mb-3">You must be at least 18 years of age to use HotFans. By using the Platform, you represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>You are at least 18 years old</li>
              <li>You are legally permitted to access adult content in your jurisdiction</li>
              <li>You are not accessing the Platform from a jurisdiction where such content is prohibited</li>
              <li>All information you provide is accurate and complete</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">3. Creator Content & Obligations</h2>
            <p className="mb-3">Creators on HotFans are responsible for all content they upload. By posting content, you represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>You own or have the right to distribute all content you post</li>
              <li>All individuals depicted in your content are at least 18 years of age</li>
              <li>You have obtained written consent from all individuals depicted</li>
              <li>You maintain all required records under 18 U.S.C. § 2257</li>
              <li>Your content does not violate any applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">4. Prohibited Content</h2>
            <p className="mb-3">The following content is strictly prohibited on HotFans:</p>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>Any content depicting minors in a sexual manner</li>
              <li>Non-consensual intimate imagery</li>
              <li>Content that promotes violence, hate speech, or discrimination</li>
              <li>Content that violates any third party's intellectual property rights</li>
              <li>Spam, scams, or fraudulent content</li>
              <li>Content depicting illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">5. Payments & Fees</h2>
            <p className="mb-3">HotFans facilitates payments between fans and creators. Our fee structure is as follows:</p>
            <ul className="list-disc pl-6 space-y-1 text-hf-muted">
              <li>Platform fee: 8% of all transactions</li>
              <li>Payment processing fee: 3% (passed through from payment processor)</li>
              <li>Creators receive 89% of all payments made by fans</li>
              <li>Minimum payout threshold: $50.00</li>
              <li>Payouts are processed within 7 business days of request</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">6. Identity Verification</h2>
            <p>All creators must complete identity verification through our third-party provider (Veriff) before posting content. This verification confirms age and identity. Failure to maintain accurate verification may result in account suspension.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">7. Content Removal & DMCA</h2>
            <p>HotFans respects intellectual property rights and complies with the Digital Millennium Copyright Act. If you believe your copyrighted work has been infringed, please submit a takedown notice to <span className="text-hf-orange">dmca@hotfans.com</span>. See our full <a href="/legal/dmca" className="text-hf-orange hover:underline">DMCA Policy</a> for details.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">8. Account Termination</h2>
            <p>HotFans reserves the right to suspend or terminate any account that violates these Terms of Service, at our sole discretion, with or without notice. Upon termination, your right to use the Platform ceases immediately.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, HotFans LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">10. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of New Mexico, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of New Mexico.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">11. Contact</h2>
            <p>For questions about these Terms, contact us at: <span className="text-hf-orange">legal@hotfans.com</span></p>
          </section>
        </div>
      </div>
    </div>
  );
}
