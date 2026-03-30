import Link from "next/link";
import AuthButton from "@/components/AuthButton";

type NavbarProps = {
  showAuth?: boolean;
  redirectTo?: string;
};

export default function Navbar({ showAuth = true, redirectTo = "/dashboard" }: NavbarProps) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-lg font-semibold text-white shadow-sm">
          AI
        </div>
        <div>
          <div className="text-sm uppercase tracking-[0.24em] text-stone-500">AI Cofounder</div>
          <div className="text-sm font-medium text-stone-800">Research and build with AI</div>
        </div>
      </Link>
      {showAuth ? <AuthButton redirectTo={redirectTo} /> : null}
    </header>
  );
}
