import BrandGlyph from "@/components/BrandGlyph";

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export default function BrandMark({ className, title = "AI Cofounder logo" }: BrandMarkProps) {
  return <BrandGlyph className={className} title={title} withBackground />;
}
