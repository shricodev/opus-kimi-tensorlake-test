# Invoice Calculator Bug

A small TypeScript library for calculating invoices.

## Bug

The calculator has three issues:
1. It rounds each line item total early (should only round the final total)
2. It applies tax BEFORE discount (should apply discount first, then tax)
3. It is missing input validation for negative quantity, negative price, invalid discount, and negative tax rate

## Correct behavior

- Calculate subtotal from `quantity * unitPrice`
- Apply discount to subtotal
- Apply tax after discount
- Round only the final total to 2 decimals
- Reject negative quantity
- Reject negative price
- Reject discount less than 0 or greater than 1
- Reject taxRate less than 0

## Files

- `src/calculateInvoice.ts` – buggy implementation
- `src/calculateInvoice.test.ts` – tests

## Running tests

```bash
npm install
npm test
```
