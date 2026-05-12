import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICES, CAMPAIGNS } from "@/lib/data";
import heroImg from "@/assets/hero-youth.jpg";
import consultImg from "@/assets/clinic-consult.jpg";
import dripImg from "@/assets/wellness-drip.jpg";
import { Calendar, Heart, MapPin, Phone, Shield, Sparkles, Stethoscope, Video, Pill, Star } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const grouped = {
    Prevention: SERVICES.filter((s) => s.category === "Prevention"),
    Clinical: SERVICES.filter((s) => s.category === "Clinical"),
    Wellness: SERVICES.filter((s) => s.category === "Wellness"),
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-soft" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-primary-glow/10 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />

        <div className="container relative grid lg:grid-cols-2 gap-12 items-center py-16 lg:py-24">
          <div className="space-y-6 animate-fade-in-up">
            <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider animate-bounce-soft">
              <Sparkles className="h-3 w-3 mr-1.5 inline" /> Youth-Focused Healthcare
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] text-balance">
              Your health, <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">our priority.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Book consultations, virtual appointments, family planning, HIV care, wellness drips and more — all from your phone. Student-friendly pricing in Braamfontein.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="hero" size="lg" onClick={() => navigate("/auth?mode=signup")} className="hover:scale-105 transition-bounce">
                <Calendar className="mr-1" /> Book Appointment
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })} className="hover:scale-105 transition-bounce">
                Explore services
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> 100% Private</div>
              <div className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Virtual visits</div>
              <div className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> Med delivery</div>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-4 bg-gradient-primary rounded-[2rem] blur-2xl opacity-30 animate-pulse-glow" />
            <img
              src={heroImg}
              alt="Smiling young students"
              className="relative rounded-[2rem] shadow-card w-full object-cover aspect-[4/5] lg:aspect-square"
              width={1600}
              height={1200}
            />
            <Card className="absolute -bottom-6 -left-6 p-4 shadow-card animate-float bg-gradient-card border-2 border-primary/20 hidden md:flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center">
                <Star className="text-accent-foreground h-5 w-5 fill-current" />
              </div>
              <div>
                <div className="font-bold">4.9 / 5.0</div>
                <div className="text-xs text-muted-foreground">Patient rating</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-3">How it works</Badge>
          <h2 className="text-4xl font-bold">From booking to recovery — all in one app</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Calendar, title: "Book online", desc: "Pick a service and a time slot." },
            { icon: Video, title: "Virtual visit", desc: "Get a Zoom link when accepted." },
            { icon: Stethoscope, title: "Get notes", desc: "Diagnoses, follow-ups & education." },
            { icon: Pill, title: "Medication", desc: "Collect or get it couriered." },
          ].map((s, i) => (
            <Card key={i} className="p-6 text-center hover:shadow-card transition-bounce hover:-translate-y-1 border-2 border-transparent hover:border-primary/20">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-soft">
                <s.icon className="text-primary-foreground" />
              </div>
              <h3 className="font-bold mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* SERVICES / CATALOGUE */}
      <section id="services" className="bg-gradient-soft py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="secondary" className="mb-3 bg-accent/20 text-accent-foreground border-accent/30">Catalogue</Badge>
            <h2 className="text-4xl font-bold">Our Services</h2>
            <p className="text-muted-foreground mt-3">Comprehensive healthcare with student-friendly pricing. R50 student discount on clinical services.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(["Prevention", "Clinical", "Wellness"] as const).map((cat, i) => (
              <Card key={cat} className="p-6 shadow-card border-2 hover:border-primary/30 transition-smooth">
                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                  i === 0 ? "bg-primary/10 text-primary" : i === 1 ? "bg-accent/20 text-accent-foreground" : "bg-success/10 text-success"
                }`}>
                  {cat}
                </div>
                <h3 className="text-2xl font-bold mb-4">{cat === "Prevention" ? "Stay Protected" : cat === "Clinical" ? "Get Treated" : "Feel Amazing"}</h3>
                <ul className="space-y-2.5">
                  {grouped[cat].map((s) => (
                    <li key={s.id} className="flex justify-between items-baseline text-sm border-b border-dashed border-border pb-2 last:border-0">
                      <span className="text-foreground">{s.name}</span>
                      <span className="font-bold text-primary">R{s.price}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="hero" size="lg" onClick={() => navigate("/auth?mode=signup")}>
              <Calendar /> Book a service
            </Button>
          </div>
        </div>
      </section>

      {/* CAMPAIGNS */}
      <section id="campaigns" className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-3 bg-accent/20 text-accent-foreground border-accent/30 uppercase tracking-wider font-bold">Special Offers & Awareness</Badge>
          <h2 className="text-4xl font-bold">Campaigns & Promotions</h2>
          <p className="text-muted-foreground mt-3">Stay informed with our monthly health awareness campaigns and special offers.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {CAMPAIGNS.map((c, i) => (
            <Card
              key={c.id}
              className="group overflow-hidden border-2 border-border hover:border-accent/60 hover:shadow-card transition-bounce hover:-translate-y-2 animate-fade-in-up cursor-pointer"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <img
                  src={c.image}
                  alt={c.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-bounce group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent opacity-90 group-hover:opacity-100 transition-smooth" />
                <div className="absolute top-3 left-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-soft ${
                    c.color === "accent" ? "bg-accent text-accent-foreground" : c.color === "success" ? "bg-success text-success-foreground" : "bg-background/95 text-primary"
                  }`}>
                    {c.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-primary-foreground">
                  <div className="text-xs opacity-80 mb-1.5 font-semibold">{c.month}</div>
                  <h3 className="text-lg font-bold leading-snug mb-2 text-balance">{c.title}</h3>
                  <p className="text-xs opacity-90 line-clamp-2">{c.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-gradient-soft py-20">
        <div className="container grid lg:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-2 gap-4">
            <img src={consultImg} alt="Clinic consultation" loading="lazy" className="rounded-2xl shadow-card aspect-square object-cover" width={1200} height={900} />
            <img src={dripImg} alt="Wellness drip" loading="lazy" className="rounded-2xl shadow-card aspect-square object-cover mt-8" width={1200} height={900} />
          </div>
          <div>
            <Badge variant="secondary" className="mb-3">About us</Badge>
            <h2 className="text-4xl font-bold mb-4">Empowering youth through quality healthcare</h2>
            <p className="text-muted-foreground mb-6">
              Located in the heart of Braamfontein, Dunwell Youth Priority Clinic is a private health facility designed for young people — from consultations to family planning, HIV management, STI care, skin care and wellness drips.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { t: "Youth-Focused", d: "Serving young people" },
                { t: "Affordable", d: "Student pricing" },
                { t: "Accessible", d: "Braamfontein location" },
                { t: "Professional", d: "Qualified team" },
              ].map((x) => (
                <div key={x.t} className="p-3 rounded-xl bg-card border">
                  <div className="font-bold text-primary">{x.t}</div>
                  <div className="text-xs text-muted-foreground">{x.d}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <a href="https://maps.google.com/?q=38+De+Beer+Street+Braamfontein" className="flex items-center gap-2 text-primary hover:underline"><MapPin className="h-4 w-4" /> 38 De Beer Street, Braamfontein</a>
              <a href="tel:0721760247" className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" /> 072 176 0247</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <Card className="bg-gradient-hero p-12 text-center text-primary-foreground border-0 shadow-glow overflow-hidden relative">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-10 w-40 h-40 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute bottom-0 right-10 w-40 h-40 rounded-full bg-accent/40 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-3">Skip the queue. Book online.</h2>
            <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">Reserve your slot. Get a Zoom link. Receive your medication. All in one place.</p>
            <Button variant="accent" size="lg" onClick={() => navigate("/auth?mode=signup")}>
              <Heart /> Get Started Free
            </Button>
          </div>
        </Card>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="container">
          © 2026 Dunwell Youth Priority Clinic. Your Health, Our Priority.
        </div>
      </footer>
    </div>
  );
};

export default Index;
