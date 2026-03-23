export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-bunni-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-4xl font-bold text-gradient mb-4">BunniX</h1>
        <div className="bg-bunni-card border border-bunni-border rounded-3xl p-8">
          <p className="text-5xl mb-4">🌍</p>
          <h2 className="font-display text-2xl font-bold mb-3">Not Available in Your Region</h2>
          <p className="text-bunni-muted text-sm leading-relaxed">
            BunniX is not available in your country due to local laws and regulations regarding adult content.
          </p>
        </div>
      </div>
    </div>
  );
}
