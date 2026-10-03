import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseApifySoldResults} from '../lib/apify-sold-results';
test('sold-price diagnostics exclude hidden Best Offers, unsupported currency and missing classification',()=>{
 const row={title:'Nick Suzuki MVP #87',url:'https://www.ebay.ca/itm/123',soldPrice:'3.00',soldCurrency:'CAD',endedAt:'2026-10-01',listingType:'buy_it_now',isBestOfferAccepted:false};
 const items=parseApifySoldResults([row,{...row,isBestOfferAccepted:true},{...row,listingType:'best_offer_accepted'},{...row,isBestOfferAccepted:undefined},{...row,soldCurrency:'EUR'},{...row,url:'javascript:alert(1)',soldPrice:-1}]);
 assert.equal(items[0].priceUsable,true);assert(items.slice(1).every(item=>!item.priceUsable));assert.equal(items[5].url,'');
});
