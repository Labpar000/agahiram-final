export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-8 sm:p-6">
      <div className="w-full max-w-[350px]">{children}</div>
    </div>
  );
}
