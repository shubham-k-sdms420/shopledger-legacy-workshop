var test = require('node:test');
var assert = require('node:assert/strict');

var tax = require('../lib/tax');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

test('invoice uses the same HSN GST slab and totals as checkout', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 2 }];
  var checkout = pricing.computeTotals(items, '');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items });

  assert.equal(tax.getRateForItem(items[0]), 0.05);
  assert.deepEqual(
    { subtotal: invoiceFigures.subtotal, tax: invoiceFigures.tax, total: invoiceFigures.total },
    { subtotal: checkout.subtotal, tax: checkout.tax, total: checkout.total }
  );
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
});

test('invoice applies the checkout coupon discount before calculating GST', function () {
  var items = [{ id: 2, name: 'Rice', hsn: '1006', price: 100, qty: 2 }];
  var checkout = pricing.computeTotals(items, 'WELCOME');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: 'WELCOME' });

  assert.deepEqual(
    { subtotal: invoiceFigures.subtotal, discount: invoiceFigures.discount, tax: invoiceFigures.tax, total: invoiceFigures.total },
    { subtotal: checkout.subtotal, discount: checkout.discount, tax: checkout.tax, total: checkout.total }
  );
});

test('invoice treats decimal gstRate as a decimal rate', function () {
  var figures = invoice.computeInvoiceFigures({
    items: [{ name: 'Tea', price: 100, qty: 1, gstRate: 0.05 }]
  });

  assert.equal(tax.getRateForItem({ gstRate: 0.05 }), 0.05);
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.tax, 5);
  assert.equal(figures.total, 105);
});

test('invoice prints the CGST and SGST values it computes', function () {
  var html = invoice.render({
    id: 42,
    date: '2026-11-26',
    items: [{ name: 'Rice', price: 100, qty: 1, gstRate: 5 }],
    total: 105
  });

  assert.match(html, /CGST<\/td><td class="r">₹2\.50/);
  assert.match(html, /SGST<\/td><td class="r">₹2\.50/);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td class="r">₹5\.00/);
});
