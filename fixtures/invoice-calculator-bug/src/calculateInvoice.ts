export interface LineItem {
  quantity: number;
  unitPrice: number;
  description: string;
}

export interface InvoiceResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  lineItems: { description: string; lineTotal: number }[];
}

export function calculateInvoice(
  items: LineItem[],
  discount: number,
  taxRate: number
): InvoiceResult {
  // BUG: rounds each line item early and applies tax before discount
  let subtotal = 0;
  const lineItems: { description: string; lineTotal: number }[] = [];

  for (const item of items) {
    const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
    subtotal += lineTotal;
    lineItems.push({ description: item.description, lineTotal });
  }

  // BUG: tax applied BEFORE discount
  const taxAmount = Number((subtotal * taxRate).toFixed(2));
  const afterTax = subtotal + taxAmount;
  const discountAmount = Number((afterTax * discount).toFixed(2));
  const total = Number((afterTax - discountAmount).toFixed(2));

  // BUG: missing validation for negative quantity, price, discount, taxRate

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    lineItems,
  };
}
