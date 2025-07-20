import { FinanceEntry } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { callChatGPTAPI } from './apiService';

interface CategorizedExpenses {
  tanken: FinanceEntry[];
  bankkosten: FinanceEntry[];
  autogarage: FinanceEntry[];
  verzekeringen: FinanceEntry[];
  telefoon: FinanceEntry[];
  overige: FinanceEntry[];
}

type ContentPart =
  | { type: 'text'; text: string; }
  | { type: 'image'; image: string; };

type CoreMessage =
  | { role: 'system'; content: string; }
  | { role: 'user'; content: string | Array<ContentPart>; }
  | { role: 'assistant'; content: string | Array<ContentPart>; };

const categorizeExpensesWithAI = async (
  expenses: FinanceEntry[], 
  apiKey: string
): Promise<CategorizedExpenses> => {
  if (expenses.length === 0) {
    return {
      tanken: [],
      bankkosten: [],
      autogarage: [],
      verzekeringen: [],
      telefoon: [],
      overige: [],
    };
  }

  const expenseNames = expenses.map(expense => ({
    id: expense.id,
    name: expense.name,
  }));

  const categorizationPrompt = `Ik heb een lijst met uitgaven namen. Zoek elke naam op internet om te begrijpen wat voor soort bedrijf of uitgave het is, en categoriseer ze in een van deze categorieën:

Categorieën:
- tanken: Tankstations, brandstof, benzine, diesel
- bankkosten: Bankkosten, rente, financiële diensten
- autogarage: Autogarages, reparaties, onderhoud, autoparten
- verzekeringen: Verzekeringen, polissen
- telefoon: Telefoon, internet, telecom diensten
- overige: Alles wat niet in bovenstaande categorieën past

Uitgaven lijst:
${expenseNames.map(expense => `ID: ${expense.id} - Naam: ${expense.name}`).join('\n')}

Geef je antwoord terug als een JSON object met de volgende structuur:
{
  "tanken": ["id1", "id2"],
  "bankkosten": ["id3"],
  "autogarage": ["id4", "id5"],
  "verzekeringen": ["id6"],
  "telefoon": ["id7"],
  "overige": ["id8", "id9"]
}

Retourneer alleen het JSON object, geen andere tekst.`;

  try {
    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: 'Je bent een expert in het categoriseren van bedrijfsuitgaven. Zoek bedrijfsnamen op internet om hun activiteiten te begrijpen en categoriseer ze correct.',
      },
      {
        role: 'user',
        content: categorizationPrompt,
      },
    ];

    const data = await callChatGPTAPI(messages, apiKey);
    
    if (data.completion) {
      try {
        const jsonStart = data.completion.indexOf('{');
        const jsonEnd = data.completion.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = data.completion.substring(jsonStart, jsonEnd);
          const categorization = JSON.parse(jsonStr);
          
          // Map the categorized IDs back to expense objects
          const result: CategorizedExpenses = {
            tanken: [],
            bankkosten: [],
            autogarage: [],
            verzekeringen: [],
            telefoon: [],
            overige: [],
          };

          Object.keys(categorization).forEach(category => {
            if (result[category as keyof CategorizedExpenses]) {
              categorization[category].forEach((id: string) => {
                const expense = expenses.find(e => e.id === id);
                if (expense) {
                  result[category as keyof CategorizedExpenses].push(expense);
                }
              });
            }
          });

          // Add any uncategorized expenses to "overige"
          expenses.forEach((expense: FinanceEntry) => {
            const isAlreadyCategorized = Object.values(result).some(category => 
              category.some((e: FinanceEntry) => e.id === expense.id)
            );
            if (!isAlreadyCategorized) {
              result.overige.push(expense);
            }
          });

          return result;
        }
      } catch (parseError) {
        console.error('Error parsing categorization JSON:', parseError);
      }
    }
  } catch (error) {
    console.error('Error categorizing expenses with AI:', error);
  }

  // Fallback to simple categorization if AI fails
  return categorizeExpensesSimple(expenses);
};

const categorizeExpensesSimple = (expenses: FinanceEntry[]): CategorizedExpenses => {
  const categories: CategorizedExpenses = {
    tanken: [],
    bankkosten: [],
    autogarage: [],
    verzekeringen: [],
    telefoon: [],
    overige: [],
  };

  expenses.forEach(expense => {
    const name = expense.name.toLowerCase();
    
    if (name.includes('tank') || name.includes('benzine') || name.includes('diesel') || name.includes('brandstof')) {
      categories.tanken.push(expense);
    } else if (name.includes('bank') || name.includes('rente') || name.includes('kosten')) {
      categories.bankkosten.push(expense);
    } else if (name.includes('garage') || name.includes('auto') || name.includes('reparatie') || name.includes('onderhoud')) {
      categories.autogarage.push(expense);
    } else if (name.includes('verzekering') || name.includes('polis')) {
      categories.verzekeringen.push(expense);
    } else if (name.includes('telefoon') || name.includes('mobiel') || name.includes('internet') || name.includes('telecom')) {
      categories.telefoon.push(expense);
    } else {
      categories.overige.push(expense);
    }
  });

  return categories;
};

const calculateTotals = (incomes: FinanceEntry[], categorizedExpenses: CategorizedExpenses) => {
  const totalGrossIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const btwTeBetalen = incomes.reduce((sum, income) => sum + income.vatAmount, 0);
  
  // Calculate net income (gross income minus VAT to be paid)
  const nettoInkomen = totalGrossIncome - btwTeBetalen;
  
  const totaleTanken = categorizedExpenses.tanken.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleBankkosten = categorizedExpenses.bankkosten.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleAutogarage = categorizedExpenses.autogarage.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleVerzekeringen = categorizedExpenses.verzekeringen.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleTelefoon = categorizedExpenses.telefoon.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleOverige = categorizedExpenses.overige.reduce((sum, expense) => sum + expense.amount, 0);
  
  const totaleKosten = totaleTanken + totaleBankkosten + totaleAutogarage + totaleVerzekeringen + totaleTelefoon + totaleOverige;
  const nettoResultaat = nettoInkomen - totaleKosten;
  
  const btwTeVorderen = Object.values(categorizedExpenses).flat().reduce((sum, expense) => sum + expense.vatAmount, 0);
  const nettoBtw = btwTeBetalen - btwTeVorderen;

  return {
    totalGrossIncome,
    nettoInkomen, // This is the adjusted income after VAT
    totaleTanken,
    totaleBankkosten,
    totaleAutogarage,
    totaleVerzekeringen,
    totaleTelefoon,
    totaleOverige,
    totaleKosten,
    nettoResultaat,
    btwTeBetalen,
    btwTeVorderen,
    nettoBtw,
  };
};

export const generateAnnualReport = async (
  incomes: FinanceEntry[],
  expenses: FinanceEntry[],
  year: number,
  apiKey: string
): Promise<string> => {
  try {
    // Use AI to categorize expenses
    const categorizedExpenses = await categorizeExpensesWithAI(expenses, apiKey);
    const totals = calculateTotals(incomes, categorizedExpenses);
    
    const expenseDetails = [
      `Tanken: ${formatCurrency(totals.totaleTanken)}`,
      ...categorizedExpenses.tanken.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`),
      '',
      `Bankkosten: ${formatCurrency(totals.totaleBankkosten)}`,
      ...categorizedExpenses.bankkosten.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`),
      '',
      `Autogarage kosten: ${formatCurrency(totals.totaleAutogarage)}`,
      ...categorizedExpenses.autogarage.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`),
      '',
      `Verzekeringen: ${formatCurrency(totals.totaleVerzekeringen)}`,
      ...categorizedExpenses.verzekeringen.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`),
      '',
      `Telefoonkosten: ${formatCurrency(totals.totaleTelefoon)}`,
      ...categorizedExpenses.telefoon.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`),
      '',
      `Overige kosten: ${formatCurrency(totals.totaleOverige)}`,
      ...categorizedExpenses.overige.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`),
    ].join('\n');
    
    const prompt = `Maak een professionele jaarrekening in tekst formaat voor het jaar ${year}. Gebruik de volgende gegevens:

INKOMSTEN (na aftrek BTW):
Bruto Inkomsten: ${formatCurrency(totals.totalGrossIncome)}
Af: BTW te betalen: ${formatCurrency(totals.btwTeBetalen)}
Netto Inkomsten: ${formatCurrency(totals.nettoInkomen)}
(Gebaseerd op ${incomes.length} inkomsten posten)

KOSTEN:
${expenseDetails}

Totale Kosten: ${formatCurrency(totals.totaleKosten)}

NETTO RESULTAAT: ${formatCurrency(totals.nettoResultaat)}

BTW OVERZICHT:
- BTW te betalen: ${formatCurrency(totals.btwTeBetalen)}
- BTW te vorderen: ${formatCurrency(totals.btwTeVorderen)}
- Netto BTW: ${formatCurrency(totals.nettoBtw)}

Maak hiervan een nette, professionele jaarrekening in tekst formaat. Gebruik een duidelijke structuur met kopjes en zorg voor een professionele uitstraling. Begin met de netto inkomsten (${formatCurrency(totals.nettoInkomen)}) als uitgangspunt voor de berekening. Retourneer alleen de geformatteerde tekst, geen andere uitleg.`;

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: 'Je bent een professionele boekhouder die jaarrekeningen maakt. Maak een nette tekst-gebaseerde jaarrekening op basis van de gegeven financiële gegevens. Gebruik duidelijke formatting met lijnen, spaties en kopjes voor een professionele uitstraling.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
    
    const data = await callChatGPTAPI(messages, apiKey);
    
    if (data.completion) {
      return data.completion.trim();
    }
    
    throw new Error('Geen rapport data ontvangen van AI');
  } catch (error) {
    console.error('Error generating annual report:', error);
    throw error;
  }
};