import { handleBooking } from '../../../lib/booking/api.mjs';

export function onRequest(context) {
    return handleBooking(context.request, context.env, context);
}
