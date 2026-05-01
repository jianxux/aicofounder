import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import BrandMark from "@/components/BrandMark";

type NavbarProps = {
  showAuth?: boolean;
  redirectTo?: string;
};

const navLinks = [
  { href: "#workflow", label: "Workflow" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#trust", label: "Trust" },
];

export default function Navbar({ showAuth = true, redirectTo = "/dashboard" }: NavbarProps) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <BrandMark className="h-11 w-11 shrink-0" />
        <div>
          <div className="text-base font-semibold tracking-[-0.02em] text-stone-900">AI Cofounder</div>
          <div className="text-sm font-medium text-stone-500">Make something people actually want</div>
        </div>
      </Link>

      <div className="hidden items-center gap-6 lg:flex">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm font-medium text-stone-500 transition hover:text-stone-900">
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/signin" className="hidden text-sm font-medium text-stone-500 transition hover:text-stone-900 sm:inline-flex">
          Sign in
        </Link>
        {showAuth ? (
          <span className="hidden text-xs font-medium text-stone-500 md:inline">Free preview · no credit card</span>
        ) : null}
        {showAuth ? (
          <AuthButton
            redirectTo={redirectTo}
            label="Sign up"
            className="inline-flex items-center rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          />
        ) : null}
      </div>
    </header>
  );
}
