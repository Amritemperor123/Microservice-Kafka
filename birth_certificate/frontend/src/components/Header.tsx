import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="bg-gov-header text-gov-header-foreground border-b-4 border-gov-stripe">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <Shield className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold">Government Portal</h1>
            <p className="text-sm text-gov-header-foreground/80">Official Certificate Services</p>
          </div>
        </div>
      </div>
      <nav className="bg-gov-header/90 border-t border-gov-header-foreground/10">
        <div className="container mx-auto px-4">
          <ul className="flex gap-1">
            <li>
              <Link to="/" className="block px-6 py-3 hover:bg-gov-header-foreground/10 transition-colors">
                Home
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};