import { useSendEventQRCodes } from '@/lib/generated/qrcode/qrcode';
import { SendQRCodesRequestEmailTemplate, type SendQRCodesResponse } from '@/lib/generated/model';

export type SendQRCodesArgs =
  | { send_to_all: true }
  | { participant_ids: string[] };

export function useSendQRCodes(eventId: string) {
  const mutation = useSendEventQRCodes();
  return {
    ...mutation,
    mutateAsync: async (args: SendQRCodesArgs) => {
      const res = await mutation.mutateAsync({
        id: eventId,
        data: {
          ...args,
          email_template: SendQRCodesRequestEmailTemplate.default,
        },
      });
      return res as unknown as SendQRCodesResponse;
    },
  };
}
