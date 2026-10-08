export function identificationProviderFailure(status:number) {
 if(status===402)return {code:'AI_CREDITS_EXHAUSTED',error:'AI scanning is temporarily unavailable because the service has run out of credits. Text reading is still available.'};
 if(status===401||status===403)return {code:'AI_PROVIDER_AUTH',error:'AI scanning is temporarily unavailable because its service credentials were rejected. Text reading is still available.'};
 if(status===429)return {code:'AI_RATE_LIMIT',error:'The AI service is busy or its usage limit has been reached. Try again shortly; text reading is still available.'};
 if(status===400||status===404)return {code:'AI_MODEL_CONFIGURATION',error:'AI scanning is temporarily unavailable because its model configuration was rejected. Text reading is still available.'};
 return {code:'AI_PROVIDER_UNAVAILABLE',error:'The AI service is temporarily unavailable. Text reading is still available; try scanning again later.'};
}
