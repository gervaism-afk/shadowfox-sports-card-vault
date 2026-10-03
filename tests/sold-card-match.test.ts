import {test} from 'node:test';import assert from 'node:assert/strict';import {soldCardMatch} from '../lib/sold-card-match';import {emptyCard} from '../lib/defaults';
test('automatic comps require exact identity and reject lots, variants, hidden offers and graded cards',()=>{
 const card={...emptyCard(),player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set:'MVP',cardNumber:'87'};
 const item={title:'2021-22 Upper Deck MVP Nick Suzuki #87 Montreal Canadiens',url:'https://www.ebay.ca/itm/123',amount:2,currency:'CAD',soldAt:'2026-10-01',bestOfferAccepted:false,priceUsable:true};
 assert.equal(soldCardMatch(card,item),null);
 for(const title of [item.title+' Ice Battles',item.title+' IceBattles',item.title+' Lot of 3 cards',item.title+' Reprint',item.title+' Silver Script',item.title+' Signed AUTO',item.title+' U-Pick From List',item.title+' PSA 9',item.title.replace('2021-22','2022-23'),item.title.replace('87','88')])assert.notEqual(soldCardMatch(card,{...item,title}),null);
 assert.notEqual(soldCardMatch(card,{...item,priceUsable:false}),null);
 assert.equal(soldCardMatch({...card,parallel:'Ice Battles'},{...item,title:item.title+' Ice Battles'}),null);
});
