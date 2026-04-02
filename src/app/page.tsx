import Link from "next/link";
import Navbar from "@/components/Navbar";

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

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#ffffff", color: "#1c1917" }}>
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

        <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
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

      {/* Testimonial */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div
          style={{
            borderRadius: 28,
            border: "1px solid #d6d3d1",
            background: "#fafaf9",
            padding: "48px 40px",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#78716c" }}>
            Founders say
          </div>
          <blockquote
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
              lineHeight: 1.5,
              color: "#1c1917",
              marginTop: 20,
              maxWidth: 700,
            }}
          >
            &ldquo;It feels like having a product strategist, researcher, and critical thinking partner
            in the room every time I sit down to work.&rdquo;
          </blockquote>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#78716c", marginTop: 16 }}>
            Independent founder, early-stage SaaS
          </p>
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
