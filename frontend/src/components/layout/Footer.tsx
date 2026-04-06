import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-surface-subtle border-t border-border relative overflow-hidden">
      {/* Subtle decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="indian-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="currentColor" className="text-primary" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#indian-pattern)" />
        </svg>
      </div>
      
      <div className="container mx-auto px-6 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm group-hover:shadow-[0_0_12px_hsl(43_88%_66%_/_0.3)] transition-shadow duration-300">
                <span className="text-primary-foreground font-bold text-lg">F</span>
              </div>
              <span className="font-bold text-xl text-foreground font-display">FoundersFirst</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Empowering entrepreneurs with AI-driven guidance and resources.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 font-display">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/ai-bot" className="text-sm text-muted-foreground hover:text-accent transition-colors">AI Bot</Link></li>
              <li><Link to="/schemes" className="text-sm text-muted-foreground hover:text-accent transition-colors">Schemes</Link></li>
              <li><Link to="/knowledge" className="text-sm text-muted-foreground hover:text-accent transition-colors">Knowledge Bank</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 font-display">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-accent transition-colors">About Us</Link></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 font-display">Connect</h4>
            <ul className="space-y-2">
              <li><a href="mailto:hello@foundersfirst.in" className="text-sm text-muted-foreground hover:text-accent transition-colors">hello@foundersfirst.in</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">Twitter</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="divider-indian my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 FoundersFirst. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <span className="text-accent">❤️</span> for Bharat's entrepreneurs
          </p>
        </div>
      </div>
    </footer>
  );
}
