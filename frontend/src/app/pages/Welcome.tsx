import { Link } from "react-router";
import { ArrowRight, BatteryCharging, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { motion } from "motion/react";
import { SpiroLogo } from "../components/SpiroLogo";

export function Welcome() {
  const bikeCategories = [
    "EKON 450M1",
    "EKON450M1V2",
    "EKON450M2V2",
    "EKON450M3",
    "EKON400M2",
    "VEO",
  ];

  const partsCategories = [
    "Batteries",
    "Chargers",
    "Tyres & tubes",
    "Brake parts",
    "Lighting",
    "Body panels",
  ];

  const floatingHighlights = [
    { label: "85+ km Range", x: "8%", y: "18%" },
    { label: "Swap & Go Batteries", x: "72%", y: "16%" },
    { label: "Genuine Spares", x: "16%", y: "78%" },
    { label: "Fast Delivery", x: "74%", y: "76%" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-12">
      <img
        src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1920&q=80"
        alt="Electric motorcycle on the road"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-br from-[#0f5132]/90 via-[#0f5132]/75 to-[#0f5132]/88" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#f4c430]/35 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[#f4c430]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#dbeafe]/20 blur-3xl" />

        {floatingHighlights.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              delay: 0.3 + index * 0.1,
              duration: 3.2,
              repeat: Infinity,
              repeatType: "mirror",
            }}
            className="hidden lg:block absolute rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
            style={{ left: item.x, top: item.y }}
          >
            {item.label}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto grid w-full max-w-6xl gap-6 rounded-[2rem] border border-white/25 bg-white/14 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-lg md:grid-cols-[1.2fr_0.8fr] md:gap-10 md:p-10"
      >
        <section className="space-y-6 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#f4c430]/40 bg-[#f4c430] px-4 py-2 text-sm font-semibold text-[#0f5132]"
          >
            <Sparkles className="h-4 w-4" />
            Electric motorcycles, built for the road ahead
          </motion.div>

          <div className="space-y-4">
            <div className="inline-flex rounded-2xl bg-[#f4c430] px-5 py-3 shadow-lg">
              <SpiroLogo size="sm" showTagline />
            </div>

            <h1 className="text-4xl font-black leading-tight text-white md:text-6xl [font-family:'Sora','Segoe_UI',sans-serif]">
              Electric motorcycles.
              <br />
              Built to go the distance.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-white/85 md:text-lg [font-family:'Manrope','Segoe_UI',sans-serif]">
              Shop Spiro's electric motorcycles and genuine spare parts in one place. From the EKON lineup to batteries, chargers, and accessories, Spiro brings reliable electric mobility to your door.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-12 w-full rounded-xl bg-[#f4c430] px-7 text-base font-semibold text-[#0f5132] hover:bg-[#f7d65d] md:h-14 md:text-lg"
              >
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-xl border-white/60 bg-white/10 px-7 text-base font-semibold text-white hover:bg-white/20 md:h-14 md:text-lg"
              >
                Login
              </Button>
            </Link>
          </div>

          <div>
            <Link to="/admin" className="text-sm font-medium text-white/80 hover:text-white hover:underline">
              Admin Portal
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "Top speed", value: "Up to 85 km/h" },
              { icon: BatteryCharging, label: "Swap & Go", value: "Fast battery exchange" },
              { icon: ShieldCheck, label: "Trusted quality", value: "Genuine Spiro parts" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08, duration: 0.45 }}
                  className="rounded-2xl border border-white/25 bg-white/12 p-4"
                >
                  <Icon className="mb-3 h-5 w-5 text-[#f4c430]" />
                  <p className="text-sm text-white/80">{item.label}</p>
                  <p className="font-semibold text-white">{item.value}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.55 }}
          className="rounded-3xl border border-white/25 bg-white/12 p-5 text-white md:p-6"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#f4c430]">
            Now Available
          </p>

          <div className="mb-6">
            <h2 className="mb-3 text-2xl font-bold [font-family:'Sora','Segoe_UI',sans-serif]">Motorcycles</h2>
            <div className="flex flex-wrap gap-2">
              {bikeCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-[#f4c430]/40 bg-white/15 px-3 py-1 text-xs font-medium text-white"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-2xl font-bold [font-family:'Sora','Segoe_UI',sans-serif]">Spare parts</h2>
            <div className="flex flex-wrap gap-2">
              {partsCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-white/35 bg-[#0f5132]/55 px-3 py-1 text-xs font-medium text-white"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/25 bg-white/10 p-4">
            <p className="text-sm text-white/90">
              Built for riders and fleets alike: browse motorcycles and parts quickly, keep your bike running with genuine spares, and order with confidence.
            </p>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}