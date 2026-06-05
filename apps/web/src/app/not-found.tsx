import Link from 'next/link';
import { Button, EmptyState } from '@agahiram/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center bg-background px-4">
      <EmptyState
        title="صفحه پیدا نشد"
        description="آدرس وارد شده وجود ندارد یا حذف شده است."
        action={
          <Button asChild variant="brand" size="md">
            <Link href="/feed">بازگشت به خانه</Link>
          </Button>
        }
      />
    </div>
  );
}
