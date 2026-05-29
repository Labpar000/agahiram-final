export default function ReelsLoading() {
  return (
    <div
      className="bg-black"
      style={{
        height: 'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
      }}
    >
      <div className="grid h-full place-items-center text-white/60">
        <div className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    </div>
  );
}
