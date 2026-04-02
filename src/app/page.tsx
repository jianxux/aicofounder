"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { trackEvent } from "@/lib/analytics";

const features = [
  {
    emoji: "🔍",
    title: "Deep research",
    description: "Do market research in minutes by searching through social media discussions.",
  },
  {
    emoji: "🎨",
    title: "Visual canvas",
    description: "Turn concepts into something real, organize your ideas, and get a complete overview.",
  },
  {
    emoji: "🧠",
    title: "Intelligent and critical",
    description: "Your idea to sell hats for ducks won't be an \"Amazing idea!\"",
  },
  {
    emoji: "🔒",
    title: "Secure & private",
    description: "Industry standard encryption and privacy mode keeps your project secure.",
  },
  {
    emoji: "📋",
    title: "Structured phases",
    description: "Work through guided phases taking you from raw idea to validated product.",
  },
  {
    emoji: "👥",
    title: "For every founder",
    description: "Build your first app, expand your consulting service, or launch your next brand.",
  },
];

const steps = [
  {
    number: "1",
    title: "Describe your idea",
    description: "Tell your AI cofounder what you want to build",
  },
  {
    number: "2",
    title: "Research & validate",
    description: "AI agents search communities for real pain points and evidence",
  },
  {
    number: "3",
    title: "Build & launch",
    description: "Get a plan, build your MVP, and ship to customers",
  },
];

const testimonials = [
  {
    name: "Maya Chen",
    title: "Founder, SignalLayer",
    initials: "MC",
    avatarColor: "#f0d9c8",
    quote:
      "It pushed past vague startup advice and gave me concrete evidence from real founder conversations before I wrote a line of code.",
  },
  {
    name: "Jordan Alvarez",
    title: "Solo builder, Northstar Studio",
    initials: "JA",
    avatarColor: "#d9e7d2",
    quote:
      "The research flow saved me days of digging through Reddit and product forums. I got a sharper positioning angle and a build plan I could actually follow.",
  },
  {
    name: "Priya Patel",
    title: "Product consultant turned founder",
    initials: "PP",
    avatarColor: "#d8ddf4",
    quote:
      "It feels trustworthy because it challenges bad assumptions instead of flattering them. That made it far more useful than a generic AI chat window.",
  },
];

export default function LandingPage() {
  useEffect(() => {
    void trackEvent("page_view", {
      page: "/",
      source: "landing",
    });
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(245, 214, 180, 0.18), rgba(255, 255, 255, 0) 32%), linear-gradient(180deg, #ffffff 0%, #f9f8f6 100%)",
        color: "#1c1917",
      }}
    >
      <Navbar />

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            border: "1px solid #d4d4d4",
            background: "#f5f5f4",
            padding: "8px 20px",
            fontSize: 14,
            color: "#57534e",
          }}
        >
          Your AI cofounder — opinionated product thinking
        </div>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            lineHeight: 1.1,
            fontWeight: 400,
            color: "#0c0a09",
            marginTop: 32,
          }}
        >
          Make something people
          <br />
          <em>actually</em> want
        </h1>

        <p style={{ fontSize: 18, color: "#78716c", marginTop: 20, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          Research and build your product with AI. From idea to launch, with a cofounder that challenges your thinking.
        </p>

        <div
          style={{
            marginTop: 16,
            fontSize: 14,
            color: "#a8a29e",
            letterSpacing: "0.02em",
          }}
        >
          Trusted by 500+ founders
        </div>

        <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            onClick={() =>
              void trackEvent("cta_click", {
                page: "/",
                button: "hero_get_started_free",
              })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              background: "#0c0a09",
              color: "#ffffff",
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get started free →
          </Link>
          <Link
            href="/dashboard"
            onClick={() =>
              void trackEvent("cta_click", {
                page: "/",
                button: "hero_see_workspace",
              })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              border: "1px solid #a8a29e",
              background: "transparent",
              color: "#44403c",
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            See the workspace
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                borderRadius: 24,
                border: "1px solid #d6d3d1",
                background: "#f5f5f4",
                padding: "32px 28px",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  marginBottom: 20,
                }}
              >
                {feature.emoji}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1c1917" }}>{feature.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#57534e", marginTop: 8 }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#78716c",
            }}
          >
            How it works
          </div>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 400,
              lineHeight: 1.2,
              color: "#0c0a09",
              marginTop: 16,
            }}
          >
            A tighter path from idea to proof
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                borderRadius: 24,
                border: "1px solid #d6d3d1",
                background: "rgba(255, 255, 255, 0.7)",
                padding: "28px",
                boxShadow: "0 18px 40px rgba(28, 25, 23, 0.06)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "#1c1917",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {step.number}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: "#1c1917", marginTop: 20 }}>{step.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#57534e", marginTop: 10 }}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#78716c",
            }}
          >
            Founders say
          </div>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 400,
              lineHeight: 1.2,
              color: "#0c0a09",
              marginTop: 16,
            }}
          >
            Trusted when the idea is still fragile
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              style={{
                borderRadius: 28,
                border: "1px solid #d6d3d1",
                background: "#fafaf9",
                padding: "28px",
                boxShadow: "0 20px 40px rgba(28, 25, 23, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: testimonial.avatarColor,
                    color: "#1c1917",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {testimonial.initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#1c1917" }}>{testimonial.name}</div>
                  <div style={{ fontSize: 14, color: "#78716c", marginTop: 4 }}>{testimonial.title}</div>
                </div>
              </div>
              <blockquote
                style={{
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: "#44403c",
                  marginTop: 20,
                }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer
        style={{
          borderTop: "1px solid #e7e5e4",
          background: "#f5f5f4",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1c1917" }}>Start building with your AI cofounder</div>
            <p style={{ fontSize: 14, color: "#78716c", marginTop: 4 }}>
              Research faster, think more critically, and ship with confidence.
            </p>
          </div>
          <Link
            href="/dashboard"
            onClick={() =>
              void trackEvent("cta_click", {
                page: "/",
                button: "footer_get_started",
              })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              background: "#0c0a09",
              color: "#ffffff",
              padding: "14px 28px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get started free
          </Link>
        </div>
      </footer>
    </main>
  );
}
