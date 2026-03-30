export default function DMCAPolicy() {
  return (
    <div className="min-h-screen bg-hf-dark text-hf-text">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-hf-muted text-sm font-mono mb-2">Last updated: March 2026</p>
          <h1 className="font-display text-4xl font-bold text-gradient mb-4">DMCA Policy</h1>
          <p className="text-hf-muted">HotFans respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA).</p>
        </div>

        <div className="space-y-8 text-hf-text leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Designated DMCA Agent</h2>
            <div className="bg-hf-card border border-hf-border rounded-2xl p-5">
              <p className="font-semibold mb-2">HotFans LLC — DMCA Agent</p>
              <p className="text-hf-muted">Email: <span className="text-hf-orange">dmca@hotfans.com</span></p>
              <p className="text-hf-muted">Address: New Mexico, United States</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Filing a Takedown Notice</h2>
            <p className="mb-3">To report copyright infringement, send a written notice containing:</p>
            <ul className="list-disc pl-6 space-y-2 text-hf-muted">
              <li>Your physical or electronic signature</li>
              <li>Identification of the copyrighted work you claim was infringed</li>
              <li>Identification of the infringing material and its location on our platform</li>
              <li>Your contact information (address, phone, email)</li>
              <li>A statement that you have a good faith belief the use is not authorized</li>
              <li>A statement under penalty of perjury that the information is accurate and you are the copyright owner or authorized to act on their behalf</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Counter-Notice</h2>
            <p>If you believe content was removed in error, you may file a counter-notice. We will restore the content within 10-14 business days unless the complainant files a court action.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Repeat Infringers</h2>
            <p>HotFans maintains a policy of terminating accounts of users who are repeat infringers of intellectual property rights in appropriate circumstances.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-hf-orange mb-3">Response Time</h2>
            <p>We respond to valid DMCA takedown notices within 24-48 hours and remove infringing content promptly upon verification.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
