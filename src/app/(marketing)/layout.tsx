/**
 * Marketing route group — canvas + cursor are now mounted globally in the
 * root layout, so this layout is just a pass-through.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
