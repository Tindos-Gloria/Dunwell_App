import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { store, useCurrentUser } from "@/lib/store";
import logo from "@/assets/dunwell-logo.jpeg";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const { profile } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await store.signOut();
    navigate("/");
  };

  const onLanding = location.pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logo} alt="Dunwell logo" className="h-11 w-11 rounded-xl object-contain bg-white shadow-soft transition-bounce group-hover:scale-110 group-hover:rotate-3" />
          <div className="hidden sm:block leading-tight">
            <div className="font-extrabold text-base tracking-tight">DUNWELL</div>
            <div className="text-[10px] text-accent-foreground bg-accent/30 px-1.5 rounded-sm font-bold uppercase tracking-wider">Youth Priority Clinic</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {onLanding && (
            <>
              <a href="#services" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">Services</a>
              <a href="#campaigns" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">Campaigns</a>
              <a href="#about" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">About</a>
            </>
          )}
          {profile ? (
            <>
              <Button variant="ghost" onClick={() => navigate(profile.role === "nurse" ? "/nurse" : "/portal")}>
                {profile.role === "nurse" ? "Nurse Portal" : "My Portal"}
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>Get Started</Button>
            </>
          )}
        </nav>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background p-4 space-y-2 animate-fade-in-up">
          {profile ? (
            <>
              <Button variant="hero" className="w-full" onClick={() => { navigate(profile.role === "nurse" ? "/nurse" : "/portal"); setOpen(false); }}>
                {profile.role === "nurse" ? "Nurse Portal" : "My Portal"}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleSignOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full" onClick={() => { navigate("/auth"); setOpen(false); }}>Sign in</Button>
              <Button variant="hero" className="w-full" onClick={() => { navigate("/auth?mode=signup"); setOpen(false); }}>Get Started</Button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
