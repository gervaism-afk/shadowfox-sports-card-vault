import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseApifySoldResults} from '../lib/apify-sold-results';
test('sold-price diagnostics exclude hidden Best Offers, unsupported currency and missing classification',()=>{
 const row={title:'Nick Suzuki MVP #87',url:'https://www.ebay.ca/itm/123',soldPrice:'3.00',soldCurrency:'CAD',endedAt:'2026-10-01',listingType:'buy_it_now',isBestOfferAccepted:false};
 const items=parseApifySoldResults([row,{...row,url:'https://www.ebay.ca/itm/124',isBestOfferAccepted:true},{...row,url:'https://www.ebay.ca/itm/125',listingType:'best_offer_accepted'},{...row,url:'https://www.ebay.ca/itm/126',isBestOfferAccepted:undefined},{...row,url:'https://www.ebay.ca/itm/127',soldCurrency:'EUR'},{...row,url:'javascript:alert(1)',soldPrice:-1}]);
 assert.equal(items[0].priceUsable,true);assert(items.slice(1).every(item=>!item.priceUsable));assert.equal(items[5].url,'');
});

test('sold listing adapters reject undated prices and deduplicate repeated item IDs',()=>{const row={title:'Card',url:'https://www.ebay.ca/itm/123',soldPrice:'3.00',soldCurrency:'CAD',endedAt:'2026-10-01',listingType:'buy_it_now',isBestOfferAccepted:false};assert.equal(parseApifySoldResults([row,row]).length,1);assert.equal(parseApifySoldResults([{...row,endedAt:'invalid'}])[0].priceUsable,false);});
