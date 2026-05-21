import { TopNav } from "@/components/TopNav";

export default function BreedsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ zIndex: "var(--z-content)" as unknown as number }}
    >
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
