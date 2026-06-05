import { IgWordmark } from '@agahiram/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-8 sm:p-6">
      <div className="w-full max-w-[350px] space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <IgWordmark className="text-[2rem]">آگهیرام</IgWordmark>
          <p className="text-xs text-muted-foreground">بازار آگهی با تجربه اینستاگرام</p>
        </div>
        {children}
      </div>
    </div>
  );
}
