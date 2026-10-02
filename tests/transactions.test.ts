import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cadCents, transactionNet, transactionProfit, transactionTotals, transactionCsv, type Transaction } from '../lib/transaction-math';
const sale:Transaction={id:'s',card_id:null,card_label:'Nick Suzuki · Silver Script',kind:'sale',occurred_on:'2026-10-02',quantity:2,amount_cents:2500,fees_cents:525,cost_cents:1000,notes:''};
test('CAD parsing keeps cents exact and refuses hidden precision, negative or excessive amounts',()=>{
 assert.equal(cadCents('0.29'),29);assert.equal(cadCents('12.5'),1250);assert.equal(cadCents('1000000.00'),100000000);
 for(const value of ['1.005','-1','1e3','NaN','','1000000.01'])assert.throws(()=>cadCents(value));
});
test('transaction totals distinguish spend, net proceeds and known profit without multiplying totals by quantity',()=>{
 assert.equal(transactionNet(sale),1975);assert.equal(transactionProfit(sale),975);
 const unknown={...sale,id:'u',cost_cents:null};assert.equal(transactionProfit(unknown),null);
 const purchase={...sale,id:'p',kind:'purchase' as const,amount_cents:1000,fees_cents:200,cost_cents:null};
 assert.deepEqual(transactionTotals([sale,unknown,purchase]),{spent:1200,proceeds:3950,profit:975,unknownCosts:1,knownSales:1});
 assert.equal(transactionProfit({...sale,fees_cents:3000}),-1500);
 assert.equal(transactionProfit({...sale,cost_cents:0}),1975);
});
test('CSV leaves unknown profit empty, quotes text and neutralizes spreadsheet formulas',()=>{
 const csv=transactionCsv([{...sale,card_label:'=HYPERLINK("bad")',cost_cents:null,notes:'two\nlines'}]);
 assert.match(csv,/"'=HYPERLINK\(""bad""\)"/);assert.match(csv,/"19.75","","two\nlines"/);
});
