import Link from "next/link";
export default function LegalIndex() {
  return (
    <div className="min-h-screen bg-hf-dark text-hf-text">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-hf flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🔥</span></div>
          <h1 className="font-display text-3xl font-bold text-gradient mb-2">HotFans Legal</h1>
          <p className="text-hf-muted">All legal documents and policies</p>
        </div>
        <div className="space-y-3">
          {[
            { href: "/legal/terms", title: "Terms of Service", desc: "Rules and conditions for using HotFans" },
            { href: "/legal/privacy", title: "Privacy Policy", desc: "How we collect, use, and protect your data" },
            { href: "/legal/dmca", title: "DMCA Policy", desc: "Copyright infringement takedown process" },
            { href: "/legal/2257", title: "18 U.S.C. § 2257", desc: "Record-keeping requirements compliance statement" },
            { href: "/legal/cookies", title: "Cookie Policy", desc: "How we use cookies and tracking technologies" },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between p-5 bg-hf-card border border-hf-border rounded-2xl hover:border-hf-orange transition-all group">
              <div>
                <p className="font-semibold group-hover:text-hf-orange transition-colors">{item.title}</p>
                <p className="text-sm text-hf-muted mt-0.5">{item.desc}</p>
              </div>
              <span className="text-hf-muted group-hover:text-hf-orange transition-colors">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
