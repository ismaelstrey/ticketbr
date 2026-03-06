
import { parsePhoneNumberFromString, CountryCode, AsYouType, isValidPhoneNumber } from 'libphonenumber-js';

export interface Country {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

export const COMMON_COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺' },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'Índia', dialCode: '+91', flag: '🇮🇳' },
  { code: 'RU', name: 'Rússia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'ZA', name: 'África do Sul', dialCode: '+27', flag: '🇿🇦' },
];

export function formatPhoneNumber(value: string, countryCode: CountryCode = 'BR'): string {
  if (!value) return '';
  const asYouType = new AsYouType(countryCode);
  return asYouType.input(value);
}

export function validatePhone(value: string, countryCode: CountryCode = 'BR'): boolean {
  if (!value) return false;
  // If the value already starts with +, we try to parse it as international
  if (value.startsWith('+')) {
    return isValidPhoneNumber(value);
  }
  // Otherwise, we parse it with the selected country code
  return isValidPhoneNumber(value, countryCode);
}

export function toE164(value: string, countryCode: CountryCode = 'BR'): string | null {
  const phoneNumber = parsePhoneNumberFromString(value, countryCode);
  return phoneNumber && phoneNumber.isValid() ? phoneNumber.number : null;
}

export function getCountryFromPhone(phone: string): CountryCode | undefined {
  const phoneNumber = parsePhoneNumberFromString(phone);
  return phoneNumber ? phoneNumber.country : undefined;
}
