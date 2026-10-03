import type { CardRecord } from './types';

export const identityFields = ['sport', 'player', 'year', 'brand', 'set', 'subset', 'cardNumber', 'team', 'rookie', 'autograph', 'relicPatch', 'serialNumber', 'parallel', 'gradingCompany', 'grade'] as const;
export type ReviewField = { field: typeof identityFields[number]; reason: string };
export type Identification = { fields: Partial<Pick<CardRecord, typeof identityFields[number]>>; warnings: string[]; evidence: string; reviewFields: ReviewField[] };
export function parseIdentification(value: unknown): Identification {
  if (!value || typeof value !== 'object') throw new Error('Invalid identification response.');
  const input = value as Record<string, unknown>;
  if (!input.fields || typeof input.fields !== 'object') throw new Error('Missing card details.');
  const source = input.fields as Record<string, unknown>;
  const fields: Record<string, string | boolean> = {};
  for (const key of identityFields) {
    const v = source[key];
    if (v === null || v === undefined) continue;
    if (['rookie', 'autograph', 'relicPatch'].includes(key)) {
      if (typeof v !== 'boolean') throw new Error('Invalid card detail.');
    } else if (typeof v !== 'string' || v.length > 250) throw new Error('Invalid card detail.');
    if (key === 'sport' && !['Hockey', 'Baseball'].includes(String(v))) throw new Error('This vault supports hockey and baseball cards.');
    if (key === 'gradingCompany' && !['', 'PSA', 'BGS', 'SGC', 'CGC', 'Other'].includes(String(v))) throw new Error('Invalid grading company.');
    fields[key] = v;
  }
  const reviewFields: ReviewField[] = [];
  if (Array.isArray(input.reviewFields)) for (const item of input.reviewFields.slice(0, 30)) {
    if (!item || typeof item !== 'object' || !identityFields.includes(item.field) || typeof item.reason !== 'string' || !item.reason.trim()) continue;
    if (!reviewFields.some(row => row.field === item.field)) reviewFields.push({field:item.field,reason:item.reason.trim().slice(0,350)});
  }
  for (const field of ['player','year','brand','set','cardNumber'] as const) {
    if (!fields[field] && !reviewFields.some(row=>row.field===field)) reviewFields.push({field,reason:'Not identified. Check your card or a published checklist.'});
  }
  return { fields, reviewFields, warnings: Array.isArray(input.warnings) ? input.warnings.filter((v): v is string => typeof v === 'string').slice(0, 12).map(v => v.slice(0, 500)) : [], evidence: typeof input.evidence === 'string' ? input.evidence.slice(0, 3000) : '' };
}
export const identificationSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    fields: { type: 'object', additionalProperties: false, properties: Object.fromEntries(identityFields.map(key => [key,
      ['rookie', 'autograph', 'relicPatch'].includes(key) ? { type: ['boolean', 'null'] } :
      key === 'sport' ? { type: ['string', 'null'], enum: ['Hockey', 'Baseball', null] } :
      key === 'gradingCompany' ? { type: ['string', 'null'], enum: ['', 'PSA', 'BGS', 'SGC', 'CGC', 'Other', null] } : { type: ['string', 'null'] }
    ])), required: [...identityFields] },
    reviewFields: {type:'array',items:{type:'object',additionalProperties:false,properties:{field:{type:'string',enum:[...identityFields]},reason:{type:'string'}},required:['field','reason']}},
    warnings: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' }
  }, required: ['fields', 'warnings', 'evidence', 'reviewFields']
};
