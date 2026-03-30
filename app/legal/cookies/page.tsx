export default function Cookies() {
  return (
    <div className="min-h-screen bg-hf-dark text-hf-text max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-gradient mb-8">Cookie Policy</h1>
      <div className="space-y-6 leading-relaxed">
        <p className="text-hf-muted">HotFans uses essential cookies for authentication and security. We do not use advertising cookies.</p>
        <section><h2 className="text-xl font-bold text-hf-orange mb-2">Essential Cookies</h2><p className="text-hf-muted">Required for login sessions and security. Cannot be disabled.</p></section>
        <section><h2 className="text-xl font-bold text-hf-orange mb-2">Contact</h2><p className="text-hf-muted">privacy@hotfans.com</p></section>
      </div>
    </div>
  );
}
