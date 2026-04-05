import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import BrandMark from "@/components/BrandMark";

type NavbarProps = {
  showAuth?: boolean;
  redirectTo?: string;
};

export default function Navbar({ showAuth = true, redirectTo = "/dashboard" }: NavbarProps) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <BrandMark className="h-11 w-11 shrink-0" />
        <div>
          <div className="text-sm uppercase tracking-[0.24em] text-stone-500">AI Cofounder</div>
          <div className="text-sm font-medium text-stone-800">Research and build with AI</div>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/analytics" className="text-sm font-medium text-stone-500 transition hover:text-stone-800">
          Analytics
        </Link>
        {showAuth ? <AuthButton redirectTo={redirectTo} /> : null}
      </div>
    </header>
  );
}
