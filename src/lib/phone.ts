import { onlyDigits } from "@/lib/cpfCnpj";

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return ddd ? `(${ddd}) ${rest}` : rest;
  if (rest.length <= 8) return ddd ? `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}` : `${rest.slice(0, 4)}-${rest.slice(4)}`;
  return ddd ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}` : `${rest.slice(0, 5)}-${rest.slice(5)}`;
}

