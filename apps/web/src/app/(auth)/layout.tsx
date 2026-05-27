export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh place-items-center bg-background p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -end-32 -top-32 size-[28rem] rounded-full bg-[var(--brand-300)] opacity-30 blur-3xl" />
        <div className="absolute -start-24 -bottom-24 size-[24rem] rounded-full bg-[var(--brand-500)] opacity-20 blur-3xl" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
