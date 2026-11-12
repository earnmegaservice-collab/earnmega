export interface WorldCurrency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  countries: string;
  fallbackRateFromGHS: number;
  decimals?: number;
}

export const BASE_PASS_AMOUNT_GHS = 50;
export const FX_CACHE_STORAGE_KEY = 'horpal_fx_rates_ghs_v1';
export const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const POPULAR_CURRENCY_CODES = [
  'USD',
  'NGN',
  'GBP',
  'EUR',
  'KES',
  'ZAR',
  'XOF',
  'CAD',
  'GHS',
];

/**
 * Complete ISO-4217 worldwide currency catalog (163 currencies) anchored to 1 GHS
 * with realistic static fallback rates for offline / zero-latency rendering.
 */
export const WORLD_CURRENCIES: WorldCurrency[] = [
  // Key Worldwide & African Currencies First
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', flag: '🇬🇭', countries: 'Ghana Accra Kumasi', fallbackRateFromGHS: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', countries: 'United States USA America Ecuador El Salvador Panama', fallbackRateFromGHS: 0.065 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', countries: 'Nigeria Lagos Abuja', fallbackRateFromGHS: 105.0 },
  { code: 'GBP', symbol: '£', name: 'British Pound Sterling', flag: '🇬🇧', countries: 'United Kingdom UK England Scotland Wales', fallbackRateFromGHS: 0.051 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', countries: 'Eurozone France Germany Italy Spain Netherlands Belgium Portugal Ireland Austria Finland Greece', fallbackRateFromGHS: 0.060 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪', countries: 'Kenya Nairobi Mombasa', fallbackRateFromGHS: 8.4 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', countries: 'South Africa Johannesburg Cape Town', fallbackRateFromGHS: 1.18 },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', flag: '🇨🇮', countries: 'Ivory Coast Cote dIvoire Senegal Benin Togo Burkina Faso Mali Niger Guinea-Bissau CFA', fallbackRateFromGHS: 39.5, decimals: 0 },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', flag: '🇨🇲', countries: 'Cameroon Gabon Congo Chad Central African Republic Equatorial Guinea CFA', fallbackRateFromGHS: 39.5, decimals: 0 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', countries: 'Canada Toronto Vancouver Montreal', fallbackRateFromGHS: 0.091 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', countries: 'Australia Sydney Melbourne', fallbackRateFromGHS: 0.100 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', countries: 'India Mumbai Delhi Bangalore', fallbackRateFromGHS: 5.48 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', countries: 'United Arab Emirates Dubai Abu Dhabi', fallbackRateFromGHS: 0.239 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦', countries: 'Saudi Arabia Riyadh Jeddah', fallbackRateFromGHS: 0.244 },

  // Rest of Africa
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬', countries: 'Egypt Cairo Alexandria', fallbackRateFromGHS: 3.21 },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿', countries: 'Tanzania Dar es Salaam', fallbackRateFromGHS: 172.0, decimals: 0 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬', countries: 'Uganda Kampala', fallbackRateFromGHS: 240.0, decimals: 0 },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc', flag: '🇷🇼', countries: 'Rwanda Kigali', fallbackRateFromGHS: 89.0, decimals: 0 },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', flag: '🇿🇲', countries: 'Zambia Lusaka', fallbackRateFromGHS: 1.76 },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula', flag: '🇧🇼', countries: 'Botswana Gaborone', fallbackRateFromGHS: 0.89 },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', flag: '🇲🇦', countries: 'Morocco Casablanca Rabat', fallbackRateFromGHS: 0.65 },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', flag: '🇪🇹', countries: 'Ethiopia Addis Ababa', fallbackRateFromGHS: 8.1 },
  { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone', flag: '🇸🇱', countries: 'Sierra Leone Freetown', fallbackRateFromGHS: 1.48 },
  { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar', flag: '🇱🇷', countries: 'Liberia Monrovia', fallbackRateFromGHS: 12.6 },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi', flag: '🇬🇲', countries: 'Gambia Banjul', fallbackRateFromGHS: 4.55 },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', flag: '🇳🇦', countries: 'Namibia Windhoek', fallbackRateFromGHS: 1.18 },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', flag: '🇲🇺', countries: 'Mauritius Port Louis', fallbackRateFromGHS: 3.01 },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', flag: '🇦🇴', countries: 'Angola Luanda', fallbackRateFromGHS: 59.5 },
  { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc', flag: '🇧🇮', countries: 'Burundi Bujumbura', fallbackRateFromGHS: 190.0, decimals: 0 },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc', flag: '🇨🇩', countries: 'DR Congo Kinshasa Democratic Republic Congo', fallbackRateFromGHS: 185.0, decimals: 0 },
  { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo', flag: '🇨🇻', countries: 'Cape Verde Cabo Verde', fallbackRateFromGHS: 6.62 },
  { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc', flag: '🇩🇯', countries: 'Djibouti', fallbackRateFromGHS: 11.55, decimals: 0 },
  { code: 'DZD', symbol: 'DA', name: 'Algerian Dinar', flag: '🇩🇿', countries: 'Algeria Algiers', fallbackRateFromGHS: 8.7 },
  { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa', flag: '🇪🇷', countries: 'Eritrea Asmara', fallbackRateFromGHS: 0.98 },
  { code: 'GNF', symbol: 'FG', name: 'Guinean Franc', flag: '🇬🇳', countries: 'Guinea Conakry', fallbackRateFromGHS: 560.0, decimals: 0 },
  { code: 'KMF', symbol: 'CF', name: 'Comorian Franc', flag: '🇰🇲', countries: 'Comoros Moroni', fallbackRateFromGHS: 29.6, decimals: 0 },
  { code: 'LSL', symbol: 'L', name: 'Lesotho Loti', flag: '🇱🇸', countries: 'Lesotho Maseru', fallbackRateFromGHS: 1.18 },
  { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', flag: '🇱🇾', countries: 'Libya Tripoli', fallbackRateFromGHS: 0.315, decimals: 3 },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', flag: '🇲🇬', countries: 'Madagascar Antananarivo', fallbackRateFromGHS: 298.0, decimals: 0 },
  { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya', flag: '🇲🇷', countries: 'Mauritania Nouakchott', fallbackRateFromGHS: 2.58 },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', flag: '🇲🇼', countries: 'Malawi Lilongwe', fallbackRateFromGHS: 113.0 },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', flag: '🇲🇿', countries: 'Mozambique Maputo', fallbackRateFromGHS: 4.15 },
  { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee', flag: '🇸🇨', countries: 'Seychelles Victoria', fallbackRateFromGHS: 0.91 },
  { code: 'SDG', symbol: '£', name: 'Sudanese Pound', flag: '🇸🇩', countries: 'Sudan Khartoum', fallbackRateFromGHS: 39.0 },
  { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling', flag: '🇸🇴', countries: 'Somalia Mogadishu', fallbackRateFromGHS: 37.1 },
  { code: 'SSP', symbol: 'SS£', name: 'South Sudanese Pound', flag: '🇸🇸', countries: 'South Sudan Juba', fallbackRateFromGHS: 210.0 },
  { code: 'STN', symbol: 'Db', name: 'Sao Tome and Principe Dobra', flag: '🇸🇹', countries: 'Sao Tome Principe', fallbackRateFromGHS: 1.47 },
  { code: 'SZL', symbol: 'E', name: 'Eswatini Lilangeni', flag: '🇸🇿', countries: 'Eswatini Swaziland Mbabane', fallbackRateFromGHS: 1.18 },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', flag: '🇹🇳', countries: 'Tunisia Tunis', fallbackRateFromGHS: 0.203, decimals: 3 },
  { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar', flag: '🇿🇼', countries: 'Zimbabwe Harare', fallbackRateFromGHS: 21.0 },
  { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold', flag: '🇿🇼', countries: 'Zimbabwe Bulawayo ZiG', fallbackRateFromGHS: 1.78 },
  { code: 'SHP', symbol: '£', name: 'Saint Helena Pound', flag: '🇸🇭', countries: 'Saint Helena Ascension', fallbackRateFromGHS: 0.051 },

  // Americas & Caribbean
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', countries: 'Brazil Sao Paulo Rio', fallbackRateFromGHS: 0.375 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', flag: '🇲🇽', countries: 'Mexico Mexico City Cancun', fallbackRateFromGHS: 1.31 },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', flag: '🇯🇲', countries: 'Jamaica Kingston', fallbackRateFromGHS: 10.2 },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar', flag: '🇹🇹', countries: 'Trinidad Tobago Port of Spain', fallbackRateFromGHS: 0.44 },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', flag: '🇨🇴', countries: 'Colombia Bogota Medellin', fallbackRateFromGHS: 285.0, decimals: 0 },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', flag: '🇦🇷', countries: 'Argentina Buenos Aires', fallbackRateFromGHS: 64.5 },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', flag: '🇨🇱', countries: 'Chile Santiago', fallbackRateFromGHS: 63.0, decimals: 0 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪', countries: 'Peru Lima', fallbackRateFromGHS: 0.244 },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', flag: '🇺🇾', countries: 'Uruguay Montevideo', fallbackRateFromGHS: 2.75 },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani', flag: '🇵🇾', countries: 'Paraguay Asuncion', fallbackRateFromGHS: 505.0, decimals: 0 },
  { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', flag: '🇧🇴', countries: 'Bolivia La Paz', fallbackRateFromGHS: 0.449 },
  { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolivar', flag: '🇻🇪', countries: 'Venezuela Caracas', fallbackRateFromGHS: 2.88 },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon', flag: '🇨🇷', countries: 'Costa Rica San Jose', fallbackRateFromGHS: 33.2, decimals: 0 },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', flag: '🇩🇴', countries: 'Dominican Republic Santo Domingo', fallbackRateFromGHS: 3.92 },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', flag: '🇬🇹', countries: 'Guatemala', fallbackRateFromGHS: 0.502 },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', flag: '🇭🇳', countries: 'Honduras Tegucigalpa', fallbackRateFromGHS: 1.64 },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba', flag: '🇳🇮', countries: 'Nicaragua Managua', fallbackRateFromGHS: 2.39 },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', flag: '🇵🇦', countries: 'Panama', fallbackRateFromGHS: 0.065 },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', flag: '🇧🇧', countries: 'Barbados Bridgetown', fallbackRateFromGHS: 0.130 },
  { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', flag: '🇧🇸', countries: 'Bahamas Nassau', fallbackRateFromGHS: 0.065 },
  { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar', flag: '🇧🇿', countries: 'Belize', fallbackRateFromGHS: 0.130 },
  { code: 'BMD', symbol: 'BD$', name: 'Bermudian Dollar', flag: '🇧🇲', countries: 'Bermuda', fallbackRateFromGHS: 0.065 },
  { code: 'KYD', symbol: 'CI$', name: 'Cayman Islands Dollar', flag: '🇰🇾', countries: 'Cayman Islands', fallbackRateFromGHS: 0.054 },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', flag: '🇱🇨', countries: 'Antigua Barbuda Dominica Grenada Saint Lucia Saint Kitts Nevis Saint Vincent', fallbackRateFromGHS: 0.176 },
  { code: 'GYD', symbol: 'G$', name: 'Guyanese Dollar', flag: '🇬🇾', countries: 'Guyana Georgetown', fallbackRateFromGHS: 13.6 },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', flag: '🇭🇹', countries: 'Haiti Port-au-Prince', fallbackRateFromGHS: 8.55 },
  { code: 'SRD', symbol: 'Sr$', name: 'Surinamese Dollar', flag: '🇸🇷', countries: 'Suriname Paramaribo', fallbackRateFromGHS: 2.29 },
  { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin', flag: '🇦🇼', countries: 'Aruba', fallbackRateFromGHS: 0.116 },
  { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder', flag: '🇨🇼', countries: 'Curacao Sint Maarten', fallbackRateFromGHS: 0.116 },
  { code: 'CUP', symbol: '$', name: 'Cuban Peso', flag: '🇨🇺', countries: 'Cuba Havana', fallbackRateFromGHS: 1.56 },
  { code: 'CUC', symbol: 'CUC$', name: 'Cuban Convertible Peso', flag: '🇨🇺', countries: 'Cuba', fallbackRateFromGHS: 0.065 },
  { code: 'SVC', symbol: '₡', name: 'Salvadoran Colon', flag: '🇸🇻', countries: 'El Salvador San Salvador', fallbackRateFromGHS: 0.569 },
  { code: 'FKP', symbol: '£', name: 'Falkland Islands Pound', flag: '🇫🇰', countries: 'Falkland Islands', fallbackRateFromGHS: 0.051 },

  // Europe
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', countries: 'Switzerland Zurich Geneva Liechtenstein', fallbackRateFromGHS: 0.057 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', countries: 'Sweden Stockholm', fallbackRateFromGHS: 0.70 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', countries: 'Norway Oslo', fallbackRateFromGHS: 0.71 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', countries: 'Denmark Copenhagen Greenland Faroe', fallbackRateFromGHS: 0.448 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', countries: 'Poland Warsaw Krakow', fallbackRateFromGHS: 0.262 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', countries: 'Turkey Turkiye Istanbul Ankara', fallbackRateFromGHS: 2.23 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', countries: 'Czechia Czech Republic Prague', fallbackRateFromGHS: 1.52 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺', countries: 'Hungary Budapest', fallbackRateFromGHS: 24.8, decimals: 0 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴', countries: 'Romania Bucharest', fallbackRateFromGHS: 0.300 },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', flag: '🇧🇬', countries: 'Bulgaria Sofia', fallbackRateFromGHS: 0.117 },
  { code: 'RSD', symbol: 'din.', name: 'Serbian Dinar', flag: '🇷🇸', countries: 'Serbia Belgrade', fallbackRateFromGHS: 7.05 },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', flag: '🇺🇦', countries: 'Ukraine Kyiv', fallbackRateFromGHS: 2.69 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', countries: 'Russia Moscow', fallbackRateFromGHS: 6.35 },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble', flag: '🇧🇾', countries: 'Belarus Minsk', fallbackRateFromGHS: 0.213 },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', flag: '🇮🇸', countries: 'Iceland Reykjavik', fallbackRateFromGHS: 9.0, decimals: 0 },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek', flag: '🇦🇱', countries: 'Albania Tirana', fallbackRateFromGHS: 5.95 },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia Convertible Mark', flag: '🇧🇦', countries: 'Bosnia Herzegovina Sarajevo', fallbackRateFromGHS: 0.118 },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar', flag: '🇲🇰', countries: 'North Macedonia Skopje', fallbackRateFromGHS: 3.70 },
  { code: 'MDL', symbol: 'L', name: 'Moldovan Leu', flag: '🇲🇩', countries: 'Moldova Chisinau', fallbackRateFromGHS: 1.17 },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari', flag: '🇬🇪', countries: 'Georgia Tbilisi', fallbackRateFromGHS: 0.177 },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram', flag: '🇦🇲', countries: 'Armenia Yerevan', fallbackRateFromGHS: 25.2, decimals: 0 },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', flag: '🇦🇿', countries: 'Azerbaijan Baku', fallbackRateFromGHS: 0.111 },
  { code: 'GIP', symbol: '£', name: 'Gibraltar Pound', flag: '🇬🇮', countries: 'Gibraltar', fallbackRateFromGHS: 0.051 },
  { code: 'GGP', symbol: '£', name: 'Guernsey Pound', flag: '🇬🇬', countries: 'Guernsey', fallbackRateFromGHS: 0.051 },
  { code: 'JEP', symbol: '£', name: 'Jersey Pound', flag: '🇯🇪', countries: 'Jersey', fallbackRateFromGHS: 0.051 },
  { code: 'IMP', symbol: '£', name: 'Isle of Man Pound', flag: '🇮🇲', countries: 'Isle of Man', fallbackRateFromGHS: 0.051 },

  // Middle East & Asia & Oceania
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', flag: '🇶🇦', countries: 'Qatar Doha', fallbackRateFromGHS: 0.237 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', flag: '🇰🇼', countries: 'Kuwait', fallbackRateFromGHS: 0.020, decimals: 3 },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', flag: '🇧🇭', countries: 'Bahrain Manama', fallbackRateFromGHS: 0.0245, decimals: 3 },
  { code: 'OMR', symbol: 'RO', name: 'Omani Rial', flag: '🇴🇲', countries: 'Oman Muscat', fallbackRateFromGHS: 0.0250, decimals: 3 },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', flag: '🇯🇴', countries: 'Jordan Amman', fallbackRateFromGHS: 0.0461, decimals: 3 },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', flag: '🇮🇱', countries: 'Israel Tel Aviv Jerusalem', fallbackRateFromGHS: 0.242 },
  { code: 'LBP', symbol: 'LL', name: 'Lebanese Pound', flag: '🇱🇧', countries: 'Lebanon Beirut', fallbackRateFromGHS: 5820.0, decimals: 0 },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', flag: '🇮🇶', countries: 'Iraq Baghdad', fallbackRateFromGHS: 85.2, decimals: 0 },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', flag: '🇮🇷', countries: 'Iran Tehran', fallbackRateFromGHS: 2730.0, decimals: 0 },
  { code: 'SYP', symbol: '£S', name: 'Syrian Pound', flag: '🇸🇾', countries: 'Syria Damascus', fallbackRateFromGHS: 845.0, decimals: 0 },
  { code: 'YER', symbol: '﷼', name: 'Yemeni Rial', flag: '🇾🇪', countries: 'Yemen Sanaa', fallbackRateFromGHS: 16.3 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan Renminbi', flag: '🇨🇳', countries: 'China Beijing Shanghai Shenzhen', fallbackRateFromGHS: 0.468 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', countries: 'Hong Kong', fallbackRateFromGHS: 0.506 },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', flag: '🇹🇼', countries: 'Taiwan Taipei', fallbackRateFromGHS: 2.11 },
  { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca', flag: '🇲🇴', countries: 'Macau Macao', fallbackRateFromGHS: 0.521 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', countries: 'Japan Tokyo Osaka', fallbackRateFromGHS: 10.0, decimals: 0 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', countries: 'South Korea Seoul Busan', fallbackRateFromGHS: 91.0, decimals: 0 },
  { code: 'KPW', symbol: '₩', name: 'North Korean Won', flag: '🇰🇵', countries: 'North Korea Pyongyang', fallbackRateFromGHS: 58.5, decimals: 0 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', countries: 'Singapore', fallbackRateFromGHS: 0.087 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', countries: 'Malaysia Kuala Lumpur', fallbackRateFromGHS: 0.289 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', countries: 'Philippines Manila Cebu', fallbackRateFromGHS: 3.81 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', countries: 'Indonesia Jakarta Bali', fallbackRateFromGHS: 1030.0, decimals: 0 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', countries: 'Thailand Bangkok Phuket', fallbackRateFromGHS: 2.26 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', countries: 'Vietnam Hanoi Ho Chi Minh', fallbackRateFromGHS: 1650.0, decimals: 0 },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', countries: 'Pakistan Karachi Lahore Islamabad', fallbackRateFromGHS: 18.1 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', countries: 'Bangladesh Dhaka', fallbackRateFromGHS: 7.77 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰', countries: 'Sri Lanka Colombo', fallbackRateFromGHS: 19.1 },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', flag: '🇳🇵', countries: 'Nepal Kathmandu', fallbackRateFromGHS: 8.77 },
  { code: 'BTN', symbol: 'Nu.', name: 'Bhutanese Ngultrum', flag: '🇧🇹', countries: 'Bhutan Thimphu', fallbackRateFromGHS: 5.48 },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', flag: '🇲🇻', countries: 'Maldives Male', fallbackRateFromGHS: 1.00 },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', flag: '🇦🇫', countries: 'Afghanistan Kabul', fallbackRateFromGHS: 4.42 },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', flag: '🇲🇲', countries: 'Myanmar Burma Yangon', fallbackRateFromGHS: 136.5, decimals: 0 },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', flag: '🇰🇭', countries: 'Cambodia Phnom Penh', fallbackRateFromGHS: 264.0, decimals: 0 },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip', flag: '🇱🇦', countries: 'Laos Vientiane', fallbackRateFromGHS: 1425.0, decimals: 0 },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', flag: '🇧🇳', countries: 'Brunei', fallbackRateFromGHS: 0.087 },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', flag: '🇲🇳', countries: 'Mongolia Ulaanbaatar', fallbackRateFromGHS: 221.0, decimals: 0 },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', flag: '🇰🇿', countries: 'Kazakhstan Almaty Astana', fallbackRateFromGHS: 32.1 },
  { code: 'UZS', symbol: "so'm", name: 'Uzbekistani Som', flag: '🇺🇿', countries: 'Uzbekistan Tashkent', fallbackRateFromGHS: 832.0, decimals: 0 },
  { code: 'KGS', symbol: 'с', name: 'Kyrgyzstani Som', flag: '🇰🇬', countries: 'Kyrgyzstan Bishkek', fallbackRateFromGHS: 5.61 },
  { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni', flag: '🇹🇯', countries: 'Tajikistan Dushanbe', fallbackRateFromGHS: 0.69 },
  { code: 'TMT', symbol: 'm', name: 'Turkmenistani Manat', flag: '🇹🇲', countries: 'Turkmenistan Ashgabat', fallbackRateFromGHS: 0.228 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', countries: 'New Zealand Auckland Wellington', fallbackRateFromGHS: 0.110 },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', flag: '🇫🇯', countries: 'Fiji Suva', fallbackRateFromGHS: 0.148 },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', flag: '🇵🇬', countries: 'Papua New Guinea Port Moresby', fallbackRateFromGHS: 0.258 },
  { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar', flag: '🇸🇧', countries: 'Solomon Islands', fallbackRateFromGHS: 0.54 },
  { code: 'TOP', symbol: 'T$', name: 'Tongan Paanga', flag: '🇹🇴', countries: 'Tonga', fallbackRateFromGHS: 0.155 },
  { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', flag: '🇻🇺', countries: 'Vanuatu Port Vila', fallbackRateFromGHS: 7.75, decimals: 0 },
  { code: 'WST', symbol: 'WS$', name: 'Samoan Tala', flag: '🇼🇸', countries: 'Samoa Apia', fallbackRateFromGHS: 0.180 },
  { code: 'XPF', symbol: '₣', name: 'CFP Franc', flag: '🇵🇫', countries: 'French Polynesia Tahiti New Caledonia Wallis Futuna', fallbackRateFromGHS: 7.18, decimals: 0 },
  { code: 'KID', symbol: '$', name: 'Kiribati Dollar', flag: '🇰🇮', countries: 'Kiribati', fallbackRateFromGHS: 0.100 },
  { code: 'CKD', symbol: '$', name: 'Cook Islands Dollar', flag: '🇨🇰', countries: 'Cook Islands Rarotonga', fallbackRateFromGHS: 0.110 },
  { code: 'TVD', symbol: '$', name: 'Tuvaluan Dollar', flag: '🇹🇻', countries: 'Tuvalu', fallbackRateFromGHS: 0.100 },
  { code: 'FOO', symbol: 'kr', name: 'Faroese Krona', flag: '🇫🇴', countries: 'Faroe Islands', fallbackRateFromGHS: 0.448 },
];

// Build exact 160+ map (excluding FOO placeholder — replace with real FOK Faroese Krona cleanly)
const CLEAN_LIST: WorldCurrency[] = WORLD_CURRENCIES.map((c) =>
  c.code === 'FOO'
    ? { ...c, code: 'FOK', name: 'Faroese Krona' }
    : c
);

export const ALL_WORLD_CURRENCIES: WorldCurrency[] = CLEAN_LIST;

const CURRENCY_BY_CODE = new Map<string, WorldCurrency>(
  ALL_WORLD_CURRENCIES.map((c) => [c.code, c])
);

export function getCurrencyMeta(code: string): WorldCurrency {
  return CURRENCY_BY_CODE.get(code.toUpperCase()) || ALL_WORLD_CURRENCIES[0];
}

export function getRateForCurrency(
  code: string,
  liveRates?: Record<string, number> | null
): number {
  const upper = code.toUpperCase();
  if (upper === 'GHS') return 1;
  const live = liveRates?.[upper];
  if (typeof live === 'number' && Number.isFinite(live) && live > 0) {
    return live;
  }
  const meta = getCurrencyMeta(upper);
  return meta.fallbackRateFromGHS;
}

export function formatConvertedPrice(
  amountGhs: number,
  code: string,
  liveRates?: Record<string, number> | null
): { formattedValue: string; formattedWithCode: string; numericValue: number } {
  const meta = getCurrencyMeta(code);
  const rate = getRateForCurrency(meta.code, liveRates);
  const raw = amountGhs * rate;
  const numericValue = Number.isFinite(raw) && raw > 0 ? raw : amountGhs * meta.fallbackRateFromGHS;
  const decimals = typeof meta.decimals === 'number' ? meta.decimals : 2;

  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue);

  const formattedValue =
    meta.code === 'XOF' || meta.code === 'XAF'
      ? `${formattedNumber} ${meta.symbol}`
      : `${meta.symbol}${formattedNumber}`;

  return {
    formattedValue,
    formattedWithCode: `${formattedValue} ${meta.code}`,
    numericValue,
  };
}

/**
 * Fetches live exchange rates anchored to GHS from open.er-api.com with 6-hour localStorage caching
 * and automatic fallback to the offline dictionary.
 */
export async function fetchLiveGhsRates(): Promise<Record<string, number>> {
  const fallbackMap: Record<string, number> = {};
  for (const c of ALL_WORLD_CURRENCIES) {
    fallbackMap[c.code] = c.fallbackRateFromGHS;
  }

  if (typeof window !== 'undefined') {
    try {
      const cachedRaw = localStorage.getItem(FX_CACHE_STORAGE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (
          parsed &&
          typeof parsed.timestamp === 'number' &&
          Date.now() - parsed.timestamp < FX_CACHE_TTL_MS &&
          parsed.rates &&
          typeof parsed.rates.USD === 'number'
        ) {
          return { ...fallbackMap, ...parsed.rates };
        }
      }
    } catch (_) {}
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://open.er-api.com/v6/latest/GHS', {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      if (json && json.result === 'success' && json.rates && typeof json.rates.USD === 'number') {
        const merged = { ...fallbackMap, ...json.rates };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              FX_CACHE_STORAGE_KEY,
              JSON.stringify({ timestamp: Date.now(), rates: merged })
            );
          } catch (_) {}
        }
        return merged;
      }
    }
  } catch (_) {
    // Offline or timeout — seamlessly keep bundled static fallback rates
  }

  return fallbackMap;
}

const EXACT_TIMEZONE_CURRENCY: Record<string, string> = {
  'Africa/Accra': 'GHS',
  'Africa/Lagos': 'NGN',
  'Africa/Nairobi': 'KES',
  'Africa/Johannesburg': 'ZAR',
  'Africa/Abidjan': 'XOF',
  'Africa/Dakar': 'XOF',
  'Africa/Lome': 'XOF',
  'Africa/Porto-Novo': 'XOF',
  'Africa/Ouagadougou': 'XOF',
  'Africa/Bamako': 'XOF',
  'Africa/Niamey': 'XOF',
  'Africa/Bissau': 'XOF',
  'Africa/Douala': 'XAF',
  'Africa/Libreville': 'XAF',
  'Africa/Brazzaville': 'XAF',
  'Africa/Ndjamena': 'XAF',
  'Africa/Bangui': 'XAF',
  'Africa/Malabo': 'XAF',
  'Africa/Cairo': 'EGP',
  'Africa/Dar_es_Salaam': 'TZS',
  'Africa/Kampala': 'UGX',
  'Africa/Kigali': 'RWF',
  'Africa/Lusaka': 'ZMW',
  'Africa/Gaborone': 'BWP',
  'Africa/Casablanca': 'MAD',
  'Africa/Addis_Ababa': 'ETB',
  'Africa/Freetown': 'SLE',
  'Africa/Monrovia': 'LRD',
  'Africa/Banjul': 'GMD',
  'Africa/Windhoek': 'NAD',
  'Indian/Mauritius': 'MUR',
  'Africa/Algiers': 'DZD',
  'Africa/Tunis': 'TND',
  'Africa/Tripoli': 'LYD',
  'Africa/Luanda': 'AOA',
  'Africa/Kinshasa': 'CDF',
  'Africa/Lubumbashi': 'CDF',
  'Africa/Maputo': 'MZN',
  'Africa/Harare': 'ZWL',
  'America/Toronto': 'CAD',
  'America/Vancouver': 'CAD',
  'America/Montreal': 'CAD',
  'America/Edmonton': 'CAD',
  'America/Winnipeg': 'CAD',
  'America/Halifax': 'CAD',
  'America/St_Johns': 'CAD',
  'America/Regina': 'CAD',
  'America/Sao_Paulo': 'BRL',
  'America/Fortaleza': 'BRL',
  'America/Recife': 'BRL',
  'America/Mexico_City': 'MXN',
  'America/Cancun': 'MXN',
  'America/Monterrey': 'MXN',
  'America/Tijuana': 'MXN',
  'America/Jamaica': 'JMD',
  'America/Port_of_Spain': 'TTD',
  'America/Bogota': 'COP',
  'America/Argentina/Buenos_Aires': 'ARS',
  'America/Buenos_Aires': 'ARS',
  'America/Santiago': 'CLP',
  'America/Lima': 'PEN',
  'America/Barbados': 'BBD',
  'Europe/London': 'GBP',
  'Europe/Zurich': 'CHF',
  'Europe/Stockholm': 'SEK',
  'Europe/Oslo': 'NOK',
  'Europe/Copenhagen': 'DKK',
  'Europe/Warsaw': 'PLN',
  'Europe/Istanbul': 'TRY',
  'Asia/Istanbul': 'TRY',
  'Europe/Prague': 'CZK',
  'Europe/Budapest': 'HUF',
  'Europe/Bucharest': 'RON',
  'Europe/Sofia': 'BGN',
  'Europe/Belgrade': 'RSD',
  'Europe/Kiev': 'UAH',
  'Europe/Kyiv': 'UAH',
  'Europe/Moscow': 'RUB',
  'Asia/Dubai': 'AED',
  'Asia/Riyadh': 'SAR',
  'Asia/Qatar': 'QAR',
  'Asia/Kuwait': 'KWD',
  'Asia/Bahrain': 'BHD',
  'Asia/Muscat': 'OMR',
  'Asia/Amman': 'JOD',
  'Asia/Jerusalem': 'ILS',
  'Asia/Tel_Aviv': 'ILS',
  'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR',
  'Asia/Shanghai': 'CNY',
  'Asia/Chongqing': 'CNY',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Taipei': 'TWD',
  'Asia/Tokyo': 'JPY',
  'Asia/Seoul': 'KRW',
  'Asia/Singapore': 'SGD',
  'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Manila': 'PHP',
  'Asia/Jakarta': 'IDR',
  'Asia/Makassar': 'IDR',
  'Asia/Bangkok': 'THB',
  'Asia/Ho_Chi_Minh': 'VND',
  'Asia/Saigon': 'VND',
  'Asia/Karachi': 'PKR',
  'Asia/Dhaka': 'BDT',
  'Asia/Colombo': 'LKR',
  'Asia/Kathmandu': 'NPR',
  'Pacific/Auckland': 'NZD',
};

/**
 * Infers the visitor's local ISO-4217 currency code from their browser timezone.
 */
export function detectCurrencyFromTimezone(): string {
  if (typeof Intl === 'undefined') return 'GHS';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (!tz) return 'GHS';

    if (EXACT_TIMEZONE_CURRENCY[tz]) {
      return EXACT_TIMEZONE_CURRENCY[tz];
    }
    if (
      tz.startsWith('America/New_York') ||
      tz.startsWith('America/Chicago') ||
      tz.startsWith('America/Denver') ||
      tz.startsWith('America/Los_Angeles') ||
      tz.startsWith('America/Phoenix') ||
      tz.startsWith('America/Indiana') ||
      tz.startsWith('America/Detroit') ||
      tz.startsWith('America/Anchorage') ||
      tz.startsWith('America/Boise') ||
      tz.startsWith('America/Kentucky') ||
      tz.startsWith('America/North_Dakota') ||
      tz.startsWith('Pacific/Honolulu') ||
      tz.startsWith('US/')
    ) {
      return 'USD';
    }
    if (tz.startsWith('Canada/')) return 'CAD';
    if (tz.startsWith('Australia/')) return 'AUD';
    if (tz.startsWith('Brazil/')) return 'BRL';
    if (tz.startsWith('Mexico/')) return 'MXN';
    if (tz.startsWith('Europe/')) return 'EUR';
    return 'USD';
  } catch (_) {
    return 'GHS';
  }
}
