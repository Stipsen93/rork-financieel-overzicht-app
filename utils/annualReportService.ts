import { FinanceEntry } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { Platform } from 'react-native';

interface AnnualReportData {
  year: number;
  incomes: FinanceEntry[];
  expenses: {
    tanken: FinanceEntry[];
    bankkosten: FinanceEntry[];
    autogarage: FinanceEntry[];
    verzekeringen: FinanceEntry[];
    telefoon: FinanceEntry[];
    overige: FinanceEntry[];
  };
  totals: {
    brutowinst: number;
    totaleTanken: number;
    totaleBankkosten: number;
    totaleAutogarage: number;
    totaleVerzekeringen: number;
    totaleTelefoon: number;
    totaleOverige: number;
    totaleKosten: number;
    nettoResultaat: number;
    btwTeBetalen: number;
    btwTeVorderen: number;
    nettoBtw: number;
  };
}

const categorizeExpenses = (expenses: FinanceEntry[]) => {
  const categories = {
    tanken: [] as FinanceEntry[],
    bankkosten: [] as FinanceEntry[],
    autogarage: [] as FinanceEntry[],
    verzekeringen: [] as FinanceEntry[],
    telefoon: [] as FinanceEntry[],
    overige: [] as FinanceEntry[],
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

const calculateTotals = (incomes: FinanceEntry[], categorizedExpenses: ReturnType<typeof categorizeExpenses>) => {
  const brutowinst = incomes.reduce((sum, income) => sum + income.amount, 0);
  const btwTeBetalen = incomes.reduce((sum, income) => sum + income.vatAmount, 0);
  
  const totaleTanken = categorizedExpenses.tanken.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleBankkosten = categorizedExpenses.bankkosten.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleAutogarage = categorizedExpenses.autogarage.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleVerzekeringen = categorizedExpenses.verzekeringen.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleTelefoon = categorizedExpenses.telefoon.reduce((sum, expense) => sum + expense.amount, 0);
  const totaleOverige = categorizedExpenses.overige.reduce((sum, expense) => sum + expense.amount, 0);
  
  const totaleKosten = totaleTanken + totaleBankkosten + totaleAutogarage + totaleVerzekeringen + totaleTelefoon + totaleOverige;
  const nettoResultaat = brutowinst - totaleKosten;
  
  const btwTeVorderen = Object.values(categorizedExpenses).flat().reduce((sum, expense) => sum + expense.vatAmount, 0);
  const nettoBtw = btwTeBetalen - btwTeVorderen;

  return {
    brutowinst,
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
    const categorizedExpenses = categorizeExpenses(expenses);
    const totals = calculateTotals(incomes, categorizedExpenses);
    
    const reportData: AnnualReportData = {
      year,
      incomes,
      expenses: categorizedExpenses,
      totals,
    };
    
    const prompt = `Maak een professionele jaarrekening in PDF formaat voor het jaar ${year}. Gebruik de volgende gegevens:

BRUTOWINST:
${incomes.map(income => `- ${income.name}: ${formatCurrency(income.amount)} (${new Date(income.date).toLocaleDateString('nl-NL')})`).join('\n')}
Totaal Brutowinst: ${formatCurrency(totals.brutowinst)}

KOSTEN:
Tanken (${formatCurrency(totals.totaleTanken)}):
${categorizedExpenses.tanken.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`).join('\n')}

Bankkosten (${formatCurrency(totals.totaleBankkosten)}):
${categorizedExpenses.bankkosten.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`).join('\n')}

Autogarage kosten (${formatCurrency(totals.totaleAutogarage)}):
${categorizedExpenses.autogarage.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`).join('\n')}

Verzekeringen (${formatCurrency(totals.totaleVerzekeringen)}):
${categorizedExpenses.verzekeringen.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`).join('\n')}

Telefoonkosten (${formatCurrency(totals.totaleTelefoon)}):
${categorizedExpenses.telefoon.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`).join('\n')}

Overige kosten (${formatCurrency(totals.totaleOverige)}):
${categorizedExpenses.overige.map(expense => `- ${expense.name}: ${formatCurrency(expense.amount)} (${new Date(expense.date).toLocaleDateString('nl-NL')})`).join('\n')}

Totale Kosten: ${formatCurrency(totals.totaleKosten)}

NETTO RESULTAAT: ${formatCurrency(totals.nettoResultaat)}

BTW OVERZICHT:
- BTW te betalen: ${formatCurrency(totals.btwTeBetalen)}
- BTW te vorderen: ${formatCurrency(totals.btwTeVorderen)}
- Netto BTW: ${formatCurrency(totals.nettoBtw)}

Maak hiervan een nette, professionele jaarrekening in PDF formaat. Gebruik een duidelijke structuur met kopjes, tabellen waar nodig, en zorg voor een professionele uitstraling. Retourneer alleen de base64 encoded PDF data, geen andere tekst.`;

    const messages = [
      {
        role: 'system',
        content: 'Je bent een professionele boekhouder die jaarrekeningen maakt. Maak een nette PDF jaarrekening op basis van de gegeven financiële gegevens. Retourneer alleen de base64 encoded PDF data.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
    
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.completion) {
      // Extract base64 PDF data from the response
      // The AI should return just the base64 data, but we'll clean it up just in case
      let base64Data = data.completion.trim();
      
      // Remove any markdown formatting or extra text
      const base64Match = base64Data.match(/[A-Za-z0-9+/=]{100,}/);
      if (base64Match) {
        base64Data = base64Match[0];
      }
      
      // Clean up any remaining non-base64 characters
      base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
      
      return base64Data;
    }
    
    throw new Error('Geen PDF data ontvangen van AI');
  } catch (error) {
    console.error('Error generating annual report:', error);
    throw error;
  }
};