import { formatEgp, type Order } from "@/lib/orders";
import { normalizeEgPhone } from "@/lib/phone";

export const INSTAPAY_URL = "https://ipn.eg/S/mohab1k/instapay/17WGHs";
export const ETISALAT_CASH_DISPLAY = "01159028516";

function customerWaDigits(phone: string) {
  const normalized = normalizeEgPhone(phone);
  if (!normalized) {
    const digits = phone.replace(/\D/g, "");
    return digits || null;
  }
  return normalized.replace(/\D/g, "");
}

function shippingFeeAmount(order: Order) {
  if (
    order.finance.shippingFeeCharged != null &&
    order.finance.shippingFeeCharged > 0
  ) {
    return order.finance.shippingFeeCharged;
  }
  const itemsTotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const inferred = order.total - itemsTotal;
  return inferred > 0 ? inferred : null;
}

/** Professional Arabic message asking the customer to pay delivery fees. */
export function shippingFeeWhatsAppMessage(order: Order) {
  const firstName = order.name.trim().split(/\s+/)[0] || "عميلنا العزيز";
  const shipping = shippingFeeAmount(order);
  const feeText = shipping != null ? formatEgp(shipping) : null;

  return [
    `السلام عليكم أ/${firstName}،`,
    ``,
    `نشكركم على ثقتكم في *Rovik*.`,
    `تم استلام طلبكم رقم *${order.orderNumber}* بنجاح.`,
    ``,
    feeText
      ? `لتأكيد الطلب، نرجو سداد *رسوم الشحن* الخاصة بطلبكم وقدرها *${feeText}*.`
      : `لتأكيد الطلب، نرجو سداد *رسوم الشحن* الخاصة بطلبكم.`,
    ``,
    `يمكنكم الدفع عبر إحدى الطريقتين التاليتين:`,
    ``,
    `١) *InstaPay* من خلال الرابط:`,
    INSTAPAY_URL,
    ``,
    `٢) *Etisalat Cash* على الرقم:`,
    ETISALAT_CASH_DISPLAY,
    ``,
    `بعد إتمام الدفع، يُرجى إرسال صورة إيصال التحويل على واتساب حتى نتمكن من تأكيد طلبكم والبدء في تجهيزه.`,
    ``,
    `في حال وجود أي استفسار، يسعدنا خدمتكم.`,
    ``,
    `مع خالص التحية،`,
    `فريق Rovik`,
  ].join("\n");
}

/** Opens WhatsApp chat with the customer (no prefilled text). */
export function customerWhatsAppChatUrl(phone: string) {
  const digits = customerWaDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/** Opens WhatsApp with the customer, prefilled with the Arabic fee request. */
export function customerShippingFeeWhatsAppUrl(order: Order) {
  const digits = customerWaDigits(order.phone);
  if (!digits) return null;
  const text = encodeURIComponent(shippingFeeWhatsAppMessage(order));
  return `https://wa.me/${digits}?text=${text}`;
}
