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

// Define related questions for each FAQ entry
const relatedQuestions: Record<number, number[]> = {
  1: [2, 3, 5],      // Am I eligible? → How much, Which model, How to apply
  2: [3, 4, 1],      // How much? → Which model, Part-time, Eligible
  3: [4, 2, 5],      // Which model? → Part-time, How much, Apply
  4: [3, 2, 5],      // Part-time? → Which model, How much, Apply
  5: [1, 2, 3],      // Apply? → Eligible, How much, Which model
};

export function getPredefinedAnswer(
  question: string,
  language: 'en' | 'de' = 'en'
): { answer: string; originalQuestion: string; suggestions: string[] } | null {
  const normalizedQuestion = question.trim().toLowerCase();

  const found = data.faq.find(
    (item) =>
      item.question.trim().toLowerCase() === normalizedQuestion ||
      item.question_de.trim().toLowerCase() === normalizedQuestion
  );

  if (!found) return null;

  // Get related questions as suggestions
  const relatedIds = relatedQuestions[found.id] || [];
  const suggestions = relatedIds
    .map(id => {
      const related = data.faq.find(item => item.id === id);
      return related ? (language === 'de' ? related.question_de : related.question) : null;
    })
    .filter((q): q is string => q !== null);

  return {
    answer: language === 'de' ? found.answer_de : found.answer,
    originalQuestion: language === 'de' ? found.question_de : found.question,
    suggestions,
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
