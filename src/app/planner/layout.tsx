export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden min-h-[100dvh] max-h-[100dvh] lg:min-h-0 lg:max-h-none">
      {children}
    </div>
  );
}
