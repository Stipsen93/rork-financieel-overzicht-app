export type Language = 'nl' | 'en';

export const translations = {
  nl: {
    // Tab titles
    income: 'Inkomen',
    overview: 'Overzicht',
    expenses: 'Uitgaven',
    preferences: 'Voorkeuren',
    
    // Preferences page
    appPreferences: 'App Voorkeuren',
    preferencesSubtitle: 'Pas de app instellingen aan naar jouw voorkeur',
    
    // Language section
    languageSettings: 'Taal Instellingen',
    appLanguage: 'App Taal',
    languageDescription: 'Kies de taal voor de hele applicatie',
    currentLanguage: 'Huidige taal',
    dutch: 'Nederlands',
    english: 'Engels',
    
    // API Settings
    apiSettings: 'API Instellingen',
    useOpenAI: 'OpenAI API Gebruiken',
    openAIDescription: 'Schakel het gebruik van OpenAI ChatGPT API in voor het verwerken van bonnetjes en facturen',
    
    // Financial Settings
    financialSettings: 'Financiële Instellingen',
    showStartingCapital: 'Startkapitaal Weergeven',
    startingCapitalDescription: 'Toon de startkapitaal knop op de inkomen pagina om je beginbalans in te stellen',
    
    // Display Settings
    displaySettings: 'Overzicht Weergave',
    incomeColumns: 'Inkomen Kolommen',
    incomeColumnsDescription: 'Kies welke inkomen kolommen je wilt zien op de overzicht pagina',
    currentSelection: 'Huidige selectie',
    bothColumns: 'Beide kolommen',
    onlyInclVat: 'Alleen incl BTW',
    onlyExVat: 'Alleen ex BTW',
    bothColumnsDesc: 'Toon zowel incl als ex BTW',
    onlyInclVatDesc: 'Toon alleen inkomen inclusief BTW',
    onlyExVatDesc: 'Toon alleen inkomen exclusief BTW',
    
    // Info section
    aboutPreferences: 'Over Voorkeuren',
    preferencesInfo: 'Hier kun je verschillende app instellingen aanpassen om de app naar jouw wensen te configureren. Deze instellingen worden automatisch opgeslagen en blijven behouden tussen app sessies.',
    apiNote: 'Let op: OpenAI API gebruik vereist een geldige ChatGPT API sleutel. Deze kun je instellen in het profiel.',
  },
  en: {
    // Tab titles
    income: 'Income',
    overview: 'Overview',
    expenses: 'Expenses',
    preferences: 'Preferences',
    
    // Preferences page
    appPreferences: 'App Preferences',
    preferencesSubtitle: 'Customize the app settings to your preference',
    
    // Language section
    languageSettings: 'Language Settings',
    appLanguage: 'App Language',
    languageDescription: 'Choose the language for the entire application',
    currentLanguage: 'Current language',
    dutch: 'Dutch',
    english: 'English',
    
    // API Settings
    apiSettings: 'API Settings',
    useOpenAI: 'Use OpenAI API',
    openAIDescription: 'Enable the use of OpenAI ChatGPT API for processing receipts and invoices',
    
    // Financial Settings
    financialSettings: 'Financial Settings',
    showStartingCapital: 'Show Starting Capital',
    startingCapitalDescription: 'Show the starting capital button on the income page to set your initial balance',
    
    // Display Settings
    displaySettings: 'Display Settings',
    incomeColumns: 'Income Columns',
    incomeColumnsDescription: 'Choose which income columns you want to see on the overview page',
    currentSelection: 'Current selection',
    bothColumns: 'Both columns',
    onlyInclVat: 'Only incl VAT',
    onlyExVat: 'Only ex VAT',
    bothColumnsDesc: 'Show both incl and ex VAT',
    onlyInclVatDesc: 'Show only income including VAT',
    onlyExVatDesc: 'Show only income excluding VAT',
    
    // Info section
    aboutPreferences: 'About Preferences',
    preferencesInfo: 'Here you can adjust various app settings to configure the app to your liking. These settings are automatically saved and persist between app sessions.',
    apiNote: 'Note: OpenAI API usage requires a valid ChatGPT API key. You can set this in the profile.',
  },
};

export const getTranslation = (language: Language, key: keyof typeof translations.nl): string => {
  return translations[language][key] || translations.nl[key];
};