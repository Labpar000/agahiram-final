import { z } from 'zod';
import { MEDIA_FOLDERS } from '../constants/app';

const folderValues = Object.values(MEDIA_FOLDERS) as [string, ...string[]];

export const presignMediaSchema = z.object({
  folder: z.enum(folderValues),
  contentType: z.string().min(1),
  extension: z.string().optional(),
});

export const confirmMediaSchema = z.object({
  key: z.string().min(3),
});

export type PresignMediaInput = z.infer<typeof presignMediaSchema>;
export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>;
