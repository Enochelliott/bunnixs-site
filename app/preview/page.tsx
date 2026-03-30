import Link from 'next/link';

// Public preview page for payment processor review
// No login required
export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-hf-dark text-hf-text">
      {/* Header */}
      <header className="border-b border-hf-border bg-hf-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-hf flex items-center justify-center">
            <span className="text-base">🔥</span>
          </div>
          <span className="font-display text-xl font-bold text-gradient">HotFans</span>
        </div>
        <div className="flex gap-3">
          <Link href="/legal" className="text-sm text-hf-muted hover:text-hf-orange transition-colors">Legal</Link>
          <Link href="/" className="text-sm bg-gradient-hf text-white px-4 py-1.5 rounded-xl hover:opacity-90 transition-all">Sign In</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-5xl font-bold text-gradient mb-4">Where Fans Get Closer</h1>
        <p className="text-hf-muted text-xl mb-8 max-w-2xl mx-auto">
          HotFans is a premium adult content platform connecting creators with their fans through subscriptions, pay-per-view content, and direct messaging.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/" className="px-8 py-3 bg-gradient-hf text-white font-bold rounded-2xl hover:opacity-90 transition-all">
            🔥 Join HotFans
          </Link>
          <Link href="/legal/terms" className="px-8 py-3 bg-hf-card border border-hf-border text-hf-muted rounded-2xl hover:border-hf-orange transition-all">
            View Terms
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🔥', title: 'Free Content', desc: 'Creators post free content visible to all registered fans' },
            { icon: '⭐', title: 'Subscriptions', desc: 'Fans subscribe monthly to unlock exclusive creator content' },
            { icon: '💎', title: 'Pay Per View', desc: 'Creators sell individual videos and photos directly to fans' },
          ].map(f => (
            <div key={f.title} className="bg-hf-card border border-hf-border rounded-2xl p-6 text-center">
              <p className="text-4xl mb-3">{f.icon}</p>
              <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-hf-muted text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Age Verification & Compliance */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-hf-card border border-hf-orange/30 rounded-2xl p-8">
          <h2 className="font-display text-2xl font-bold mb-6 text-center">Compliance & Safety</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '🪪', title: 'Age Verification', desc: 'All creators verified via Veriff identity verification — 18+ only' },
              { icon: '🔒', title: 'Content Control', desc: 'Creators control all their content with full ownership rights' },
              { icon: '⚖️', title: '2257 Compliant', desc: 'Full compliance with 18 U.S.C. § 2257 record-keeping requirements' },
              { icon: '🚫', title: 'DMCA Protected', desc: 'Robust takedown process with designated DMCA agent' },
              { icon: '💳', title: 'Secure Payments', desc: 'All payments processed by licensed, compliant payment processors' },
              { icon: '🛡️', title: 'Content Moderation', desc: 'Active moderation team reviews reported content within 24 hours' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 p-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-hf-muted text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Links */}
      <footer className="border-t border-hf-border mt-12 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 justify-center text-sm text-hf-muted">
          <Link href="/legal/terms" className="hover:text-hf-orange transition-colors">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-hf-orange transition-colors">Privacy Policy</Link>
          <Link href="/legal/dmca" className="hover:text-hf-orange transition-colors">DMCA</Link>
          <Link href="/legal/2257" className="hover:text-hf-orange transition-colors">18 U.S.C. § 2257</Link>
          <Link href="/legal/cookies" className="hover:text-hf-orange transition-colors">Cookies</Link>
          <span>© 2026 HotFans LLC. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
