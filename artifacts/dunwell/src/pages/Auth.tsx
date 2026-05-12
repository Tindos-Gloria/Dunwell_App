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
import { store, useCurrentUser, type Role } from "@/lib/store";
import { toast } from "sonner";
import { Heart, Stethoscope, Sparkles, Lock } from "lucide-react";

type Gender = "" | "Male" | "Female" | "LGBTQ+";

function toRole(v: string): Role {
  return v === "nurse" ? "nurse" : "patient";
}
function toGender(v: string): Gender {
  if (v === "Male" || v === "Female" || v === "LGBTQ+") return v;
  return "";
}

const Auth = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [role, setRole] = useState<Role>("patient");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { profile, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && profile) navigate(profile.role === "nurse" ? "/nurse" : "/portal");
  }, [profile, loading, navigate]);

  // Nurses can only sign in — force mode when switching to nurse tab
  const handleRoleChange = (v: string) => {
    const r = toRole(v);
    setRole(r);
    if (r === "nurse") setMode("signin");
  };

  const [form, setForm] = useState({
    email: "", password: "", name: "", surname: "", phone: "", dob: "",
    gender: "" as Gender,
    address: "", isStudent: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup" && role === "patient") {
        if (!form.name || !form.surname || !form.email || !form.phone || !form.address || !form.gender) {
          toast.error("Please fill all required fields"); setBusy(false); return;
        }
        if (!/^0\d{9}$/.test(form.phone)) { toast.error("Phone must start with '0' and be 10 digits"); setBusy(false); return; }
        await store.signUp({
          email: form.email, password: form.password, name: form.name, role: "patient",
          surname: form.surname, phone: form.phone, dob: form.dob,
          gender: form.gender || undefined, address: form.address, isStudent: form.isStudent,
        });
        toast.success("✨ Welcome to Dunwell!");
      } else if (role === "nurse") {
        await store.signIn("", form.password, { username: form.email });
        toast.success("Welcome back!");
      } else {
        await store.signIn(form.email, form.password);
        toast.success("Welcome back!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
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
            <h1 className="text-3xl font-extrabold">
              {role === "nurse" ? "Nurse Sign In" : mode === "signin" ? "Welcome Back" : "Join Dunwell"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {role === "nurse"
                ? "Sign in with your clinic credentials"
                : mode === "signin"
                ? "Sign in to manage your bookings"
                : "Create your account in seconds"}
            </p>
          </div>

          {/* Role tabs */}
          <Tabs value={role} onValueChange={handleRoleChange} className="mb-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="patient" className="gap-2">
                <Heart className="h-4 w-4" /> Patient
              </TabsTrigger>
              <TabsTrigger value="nurse" className="gap-2">
                <Stethoscope className="h-4 w-4" /> Nurse
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Nurse-only notice */}
          {role === "nurse" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
              <Lock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                Nurse accounts are managed by the clinic. Use the email and password provided by Dunwell administration.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Patient signup fields */}
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
                  <RadioGroup
                    value={form.gender}
                    onValueChange={(v) => setForm({ ...form, gender: toGender(v) })}
                    className="flex gap-4 pt-1 flex-wrap"
                  >
                    {(["Male", "Female", "LGBTQ+"] as Gender[]).map((g) => (
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
                  <span className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-foreground" />
                    I'm a Wits / University student (R50 clinical pricing)
                  </span>
                </label>
              </div>
            )}

            {role === "nurse" ? (
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" type="text" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Your clinic username" className="h-11" autoComplete="username" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" autoComplete="email" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" />
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={busy}>
              {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {/* Sign up / sign in toggle — patients only */}
          {role === "patient" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-primary font-semibold hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </Card>
        <p className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
