import { useSendEventQRCodes } from '@/lib/generated/qrcode/qrcode';
import { SendQRCodesRequestEmailTemplate } from '@/lib/generated/model';

export type SendQRCodesArgs =
  | { send_to_all: true }
  | { participant_ids: string[] };

export function useSendQRCodes(eventId: string) {
  const mutation = useSendEventQRCodes();
  return {
    ...mutation,
    mutateAsync: (args: SendQRCodesArgs) =>
      mutation.mutateAsync({
        id: eventId,
        data: {
          ...args,
          email_template: SendQRCodesRequestEmailTemplate.default,
        },
      }),
  };
}
