import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { store, useCurrentUser } from "@/lib/store";
import { LogOut, Menu, X, Stethoscope } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <img
              src="/dunwell-logo.jpeg"
              alt="Dunwell logo"
              className="h-12 w-12 rounded-xl object-contain bg-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-2"
            />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="font-black text-base tracking-tight text-[#1a365d] uppercase">Dunwell</div>
            <div className="text-[10px] text-[#fbbf24] bg-[#1a365d] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">Youth Priority Clinic</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {onLanding && (
            <>
              <a href="#services" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#1a365d] transition-colors">Services</a>
              <a href="#campaigns" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#1a365d] transition-colors">Campaigns</a>
              <a href="#about" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#1a365d] transition-colors">About</a>
            </>
          )}
          {profile ? (
            <>
              <Button
                variant="ghost"
                className="font-semibold text-[#1a365d] hover:bg-[#1a365d]/10"
                onClick={() => navigate(profile.role === "nurse" ? "/nurse" : "/portal")}
              >
                <Stethoscope className="h-4 w-4 mr-1.5" />
                {profile.role === "nurse" ? "Nurse Portal" : "My Portal"}
              </Button>
              <Button
                className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 rounded-xl font-semibold"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-1.5" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="font-semibold" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button
                className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 rounded-xl font-bold shadow-lg shadow-[#1a365d]/20"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Get Started
              </Button>
            </>
          )}
        </nav>

        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white/95 backdrop-blur-xl p-4 space-y-2 animate-fade-in-up shadow-xl">
          {onLanding && (
            <div className="flex gap-2 pb-2 border-b">
              {["Services", "Campaigns", "About"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="flex-1 text-center py-2 text-sm font-medium rounded-lg bg-slate-50 text-slate-600" onClick={() => setOpen(false)}>{item}</a>
              ))}
            </div>
          )}
          {profile ? (
            <>
              <Button variant="outline" className="w-full border-[#1a365d] text-[#1a365d] font-semibold" onClick={() => { navigate(profile.role === "nurse" ? "/nurse" : "/portal"); setOpen(false); }}>
                {profile.role === "nurse" ? "Nurse Portal" : "My Portal"}
              </Button>
              <Button className="w-full bg-[#1a365d] text-white" onClick={handleSignOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full" onClick={() => { navigate("/auth"); setOpen(false); }}>Sign in</Button>
              <Button className="w-full bg-[#1a365d] text-white font-bold" onClick={() => { navigate("/auth?mode=signup"); setOpen(false); }}>Get Started</Button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
