import type { CardRecord, Filters } from './types';
export function filterDescription(filters:Filters) {
  const names:Record<string,string>={search:'Search',sport:'Sport',player:'Player',team:'Team',brand:'Brand',year:'Year',set:'Set',subset:'Subset',parallel:'Variation',rookie:'Rookie',autograph:'Autograph',relicPatch:'Relic/patch',graded:'Graded'};
  return Object.entries(filters).filter(([,value])=>!!value).map(([key,value])=>`${names[key]||key}: ${value}`).join(' · ');
}
export function cardsCsv(cards:CardRecord[]) {
  const headers=['sport','player','year','brand','set','subset','cardNumber','team','rookie','autograph','relicPatch','serialNumber','parallel','gradingCompany','grade','quantity','estimatedValueCad','notes'] as const;
  function cell(value:unknown){let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text)&&! /^-\d+(\.\d+)?$/.test(text))text="'"+text;return `"${text.replaceAll('"','""')}"`;}
  return [headers.map(cell).join(','),...cards.map(card=>headers.map(header=>cell(card[header])).join(','))].join('\r\n');
}
