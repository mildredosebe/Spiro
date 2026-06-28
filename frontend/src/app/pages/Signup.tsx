import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, Lock, Mail, User, BatteryCharging, ShieldCheck, Zap } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { loginUser, loginWithGoogle, registerUser } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { SpiroLogo } from "../components/SpiroLogo";
import { TopNavigation } from "../components/TopNavigation";

const PERKS = [
  { icon: Zap, text: "Electric power, ready to ride" },
  { icon: ShieldCheck, text: "Secure, encrypted payments" },
  { icon: BatteryCharging, text: "Swap & Go battery network" },
];

export function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasGoogleClientId = Boolean((import.meta as any).env.VITE_GOOGLE_CLIENT_ID);

  const handleSuccess = () => {
    navigate(searchParams.get("redirect") || "/shop");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setIsLoading(true);
    try {
      const parts = name.trim().split(" ");
      await registerUser({
        email, password,
        username: email.split("@")[0],
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" "),
      });
      await loginUser(email, password);
      toast.success("Account created successfully");
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async (response: CredentialResponse) => {
    if (!response.credential) { toast.error("Google sign-up failed."); return; }
    try {
      await loginWithGoogle(response.credential);
      toast.success("Account created with Google");
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google signup failed");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f7f8fb] animate-fade-in overflow-hidden">
      <TopNavigation />
      
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className="w-full h-full max-h-[850px] max-w-[1100px] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col lg:flex-row relative">
          
          {/* ── Left branded panel ── */}
          <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative bg-primary flex-col justify-between p-10 xl:p-14 z-10">
            {/* Ambient blobs */}
            <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#f4c430]/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5 blur-[100px] pointer-events-none" />

            {/* Logo */}
            <div>
              <SpiroLogo size="lg" className="brightness-0 invert" />
            </div>

            {/* Centre copy */}
            <div className="relative z-10 mt-12 mb-8">
              <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-tight mb-4">
                Join thousands<br />of Nairobi<br />
                <span className="text-[#f4c430]">riders.</span>
              </h2>
              <p className="text-white/70 font-medium text-base xl:text-lg mb-10 max-w-sm">
                Create your free account and get electric motorcycles, genuine spare parts and more delivered to your door.
              </p>
              <div className="space-y-4">
                {PERKS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-[#f4c430]" />
                    </div>
                    <span className="text-white/90 font-semibold">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom testimonial */}
            <div className="relative z-10 bg-white/8 border border-white/10 rounded-2xl p-5">
              <p className="text-white/80 font-medium text-sm italic mb-3">
                "I ordered my motorcycle online and had it delivered within days. Spiro is now our family's go-to for electric rides!"
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f4c430] flex items-center justify-center text-primary font-black text-xs">J</div>
                <div>
                  <p className="text-white font-bold text-xs">James O.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right form panel ── */}
          <div className="flex-1 flex flex-col relative overflow-y-auto px-6 py-10 md:p-12 xl:p-16 z-10">
            {/* Mobile ambient */}
            <div className="lg:hidden pointer-events-none absolute inset-0">
              <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[#f4c430]/15 blur-[100px]" />
              <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10 w-full max-w-[400px] mx-auto flex flex-col justify-center h-full"
            >
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-8">
                <SpiroLogo size="lg" />
              </div>

              <div className="mb-8">
                <h1 className="text-3xl font-black text-primary tracking-tight">Create an account</h1>
                <p className="text-muted-foreground font-medium mt-1">Join now and start shopping faster.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Full name */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-xs font-bold text-primary uppercase tracking-wider">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                    <Input id="name" type="text" placeholder="Your full name"
                      value={name} onChange={(e) => setName(e.target.value)}
                      className="pl-12 h-14 bg-[#f7f8fb] border-transparent focus:bg-white focus:border-border/60 rounded-2xl font-medium shadow-sm"
                      required />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-xs font-bold text-primary uppercase tracking-wider">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                    <Input id="email" type="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 bg-[#f7f8fb] border-transparent focus:bg-white focus:border-border/60 rounded-2xl font-medium shadow-sm"
                      required />
                  </div>
                </div>

                {/* Password row — side by side on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className="text-xs font-bold text-primary uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 pr-12 h-14 bg-[#f7f8fb] border-transparent focus:bg-white focus:border-border/60 rounded-2xl font-medium shadow-sm"
                        required autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold text-primary uppercase tracking-wider">Confirm</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                      <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Repeat password"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-12 h-14 bg-[#f7f8fb] border-transparent focus:bg-white focus:border-border/60 rounded-2xl font-medium shadow-sm"
                        required autoComplete="new-password" />
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm font-bold text-destructive">{error}</p>}

                <Button type="submit" disabled={isLoading}
                  className="w-full h-14 rounded-2xl text-base font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all mt-1">
                  {isLoading ? "Creating Account…" : "Create Account"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">or continue with</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              {hasGoogleClientId ? (
                <div className="flex justify-center">
                  <GoogleLogin onSuccess={handleGoogleSignup} onError={() => setError("Google sign-up failed")}
                    shape="pill" theme="outline" text="continue_with" size="large" />
                </div>
              ) : (
                <Button type="button" variant="outline" disabled className="w-full h-12 rounded-2xl border-2 font-semibold">
                  Google sign-up unavailable
                </Button>
              )}

              <div className="mt-8 space-y-3 text-center">
                <p className="text-sm text-muted-foreground font-medium">
                  Already have an account?{" "}
                  <Link to="/login" className="font-bold text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors">
                    Log in
                  </Link>
                </p>
                <button onClick={() => navigate("/")} className="text-xs font-semibold text-muted-foreground/60 hover:text-primary transition-colors">
                  ← Back to home
                </button>
                <p className="text-[11px] text-muted-foreground/50">
                  By creating an account you agree to our{" "}
                  <Link to="/terms" className="underline underline-offset-2 hover:text-primary transition-colors">Terms</Link>
                  {" "}&amp;{" "}
                  <Link to="/privacy" className="underline underline-offset-2 hover:text-primary transition-colors">Privacy Policy</Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}