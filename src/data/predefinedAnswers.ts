import faqData from './elterngeld-faq.json';

export interface FaqEntry {
  id: number;
  question: string;
  question_de: string;
  answer: string;
  answer_de: string;
}

interface FaqData {
  faq: FaqEntry[];
  metadata: {
    language: string;
    source: string;
    last_updated: string;
    income_limit: string;
  };
}

const data = faqData as FaqData;

export function getPredefinedAnswer(
  question: string,
  language: 'en' | 'de' = 'en'
): { answer: string; originalQuestion: string } | null {
  const normalizedQuestion = question.trim().toLowerCase();

  const found = data.faq.find(
    (item) =>
      item.question.trim().toLowerCase() === normalizedQuestion ||
      item.question_de.trim().toLowerCase() === normalizedQuestion
  );

  if (!found) return null;

  return {
    answer: language === 'de' ? found.answer_de : found.answer,
    originalQuestion: language === 'de' ? found.question_de : found.question,
  };
}

export function hasPredefinedAnswer(question: string): boolean {
  return getPredefinedAnswer(question) !== null;
}

export function getAllFaqQuestions(language: 'en' | 'de' = 'en'): string[] {
  return data.faq.map((item) =>
    language === 'de' ? item.question_de : item.question
  );
}
