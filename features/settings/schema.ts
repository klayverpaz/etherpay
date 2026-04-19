import { z } from "zod";

export const updateTemplateInputSchema = z.object({
  message_template: z.string().min(1, "Template não pode ficar vazio").max(2000),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;

export const updateReminderInputSchema = z.object({
  email_reminders_enabled: z.boolean(),
  daily_reminder_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  notify_only_if_any: z.boolean(),
});

export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;
