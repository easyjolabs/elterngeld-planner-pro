/**
 * Simple language detection utility for German vs English
 * Mirrors the logic used in the edge function for consistency
 */
export function detectLanguage(message: string): 'en' | 'de' {
  const lowerMsg = message.toLowerCase();
  
  // German function words
  const germanWords = [
    'ich', 'und', 'oder', 'wie', 'viel', 'kann', 'mein', 'bekomme', 'habe', 
    'meine', 'einen', 'eine', 'wird', 'werden', 'sind', 'ist', 'das', 'die', 
    'der', 'für', 'mit', 'vom', 'zum', 'zur', 'auf', 'bei', 'nach', 'über', 
    'unter', 'wann', 'warum', 'welche', 'welches', 'welcher', 'wenn', 'möchte', 
    'brauche', 'wäre', 'elterngeld', 'antrag', 'anspruch', 'geburt', 'kind',
    'mutter', 'vater', 'eltern', 'monate', 'geld', 'einkommen', 'arbeit'
  ];
  
  // English function words
  const englishWords = [
    'i', 'can', 'how', 'much', 'will', 'get', 'receive', 'the', 'my', 'is', 
    'are', 'do', 'does', 'what', 'which', 'when', 'where', 'why', 'would', 
    'should', 'could', 'have', 'has', 'am', 'if', 'and', 'or', 'but', 'for', 
    'with', 'about', 'eligible', 'allowance', 'parental', 'benefit', 'apply',
    'application', 'child', 'birth', 'income', 'work', 'money', 'months'
  ];
  
  let germanScore = 0;
  let englishScore = 0;
  
  for (const word of germanWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lowerMsg)) germanScore++;
  }
  
  for (const word of englishWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lowerMsg)) englishScore++;
  }
  
  return germanScore > englishScore ? 'de' : 'en';
}
