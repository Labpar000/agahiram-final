'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, Spinner, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { uploadToMinio } from '@/lib/upload-media';

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
};

export function AdMediaUpload({ value, onChange, label = 'آپلود تصویر' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('فقط تصویر مجاز است');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const presign = await apiClient.post<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
      }>('/media/presign', {
        folder: 'posts',
        contentType: file.type,
        extension: ext,
      });
      if (!presign.success || !presign.data) throw new Error(presign.error ?? 'خطا در presign');

      const put = await uploadToMinio(presign.data.uploadUrl, file, file.type);
      if (!put.ok) throw new Error('آپلود ناموفق');

      const confirm = await apiClient.post<{ publicUrl: string }>('/media/confirm', {
        key: presign.data.key,
      });
      if (!confirm.success || !confirm.data?.publicUrl) {
        throw new Error(confirm.error ?? 'تأیید فایل ناموفق');
      }

      onChange(confirm.data.publicUrl);
      toast.success('تصویر آپلود شد');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner className="size-4 me-1" /> : <Upload className="size-4 me-1" />}
          {label}
        </Button>
        {value ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
            حذف
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="پیش‌نمایش" className="max-h-48 rounded-lg object-contain" />
      ) : null}
    </div>
  );
}
