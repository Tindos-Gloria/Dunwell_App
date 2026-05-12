import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { store, useCurrentUser } from "@/lib/store";
import { toast } from "sonner";
import { Heart, Stethoscope, Sparkles } from "lucide-react";

const Auth = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [role, setRole] = useState<"patient" | "nurse">("patient");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { profile, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && profile) navigate(profile.role === "nurse" ? "/nurse" : "/portal");
  }, [profile, loading, navigate]);

  const [form, setForm] = useState({
    email: "", password: "", name: "", surname: "", phone: "", dob: "",
    gender: "" as "" | "Male" | "Female" | "LGBTQ+",
    address: "", isStudent: false, inviteCode: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (role === "patient") {
          if (!form.name || !form.surname || !form.email || !form.phone || !form.address || !form.gender) {
            toast.error("Please fill all required fields"); setBusy(false); return;
          }
          if (!/^0\d{9}$/.test(form.phone)) { toast.error("Phone must start with '0' and be 10 digits"); setBusy(false); return; }
        }
        await store.signUp({
          email: form.email, password: form.password, name: form.name, role,
          surname: form.surname, phone: form.phone, dob: form.dob,
          gender: form.gender || undefined, address: form.address, isStudent: form.isStudent,
          inviteCode: form.inviteCode,
        });
        toast.success("✨ Welcome to Dunwell!");
      } else {
        await store.signIn(form.email, form.password);
        toast.success("Welcome back!");
      }
    } catch (e: any) { toast.error(e.message || "Something went wrong"); }
    setBusy(false);
  };

  const isPatientSignup = mode === "signup" && role === "patient";

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <div className={`container py-12 ${isPatientSignup ? "max-w-2xl" : "max-w-md"}`}>
        <Card className="p-8 shadow-card border-2 animate-fade-in-up">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-3 shadow-glow animate-pulse-glow">
              <Heart className="text-primary-foreground h-7 w-7" />
            </div>
            <h1 className="text-3xl font-extrabold">{mode === "signin" ? "Welcome Back" : "Join Dunwell"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Sign in to manage your bookings" : "Create your account in seconds"}
            </p>
          </div>

          <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="mb-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="patient" className="gap-2"><Heart className="h-4 w-4" /> Patient</TabsTrigger>
              <TabsTrigger value="nurse" className="gap-2"><Stethoscope className="h-4 w-4" /> Nurse</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="space-y-4">
            {isPatientSignup && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">First name *</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Thabo" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="surname">Surname *</Label>
                  <Input id="surname" required value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="Mokoena" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Contact number *</Label>
                  <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0821234567" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Gender *</Label>
                  <RadioGroup value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })} className="flex gap-4 pt-1 flex-wrap">
                    {["Male", "Female", "LGBTQ+"].map((g) => (
                      <div key={g} className="flex items-center space-x-2">
                        <RadioGroupItem value={g} id={g} />
                        <Label htmlFor={g} className="font-normal cursor-pointer">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea id="address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30 cursor-pointer">
                  <input type="checkbox" checked={form.isStudent} onChange={(e) => setForm({ ...form, isStudent: e.target.checked })} className="h-4 w-4" />
                  <span className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent-foreground" /> I'm a Wits / University student (R50 clinical pricing)</span>
                </label>
              </div>
            )}

            {mode === "signup" && role === "nurse" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" />
            </div>
            {mode === "signup" && role === "nurse" && (
              <div className="space-y-1.5">
                <Label htmlFor="invite">Nurse invite code</Label>
                <Input id="invite" required placeholder="DUNWELL-NURSE-2026" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} className="h-11" />
                <p className="text-xs text-muted-foreground">Demo code: <code className="text-primary">DUNWELL-NURSE-2026</code></p>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={busy}>
              {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>


          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" className="text-primary font-semibold hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </Card>
        <p className="text-center mt-4"><Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back to home</Link></p>
      </div>
    </div>
  );
};

export default Auth;
