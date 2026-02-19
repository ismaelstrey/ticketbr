export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

export function validateCpf(raw: string) {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (isRepeatedDigits(cpf)) return false;

  const calc = (base: string, factor: number) => {
    let total = 0;
    for (let i = 0; i < base.length; i++) {
      total += Number(base[i]) * (factor - i);
    }
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);

  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function validateCnpj(raw: string) {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14) return false;
  if (isRepeatedDigits(cnpj)) return false;

  const calc = (base: string) => {
    const weights =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(cnpj.slice(0, 12));
  const d2 = calc(cnpj.slice(0, 13));
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function validateCpfCnpj(raw: string) {
  const digits = onlyDigits(raw);
  if (digits.length === 11) return validateCpf(digits);
  if (digits.length === 14) return validateCnpj(digits);
  return false;
}

export function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 9);
    const d = digits.slice(9, 11);
    return [a, b, c].filter(Boolean).join(".") + (d ? `-${d}` : "");
  }
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 5);
  const c = digits.slice(5, 8);
  const d = digits.slice(8, 12);
  const e = digits.slice(12, 14);
  return `${a}${b ? "." + b : ""}${c ? "." + c : ""}${d ? "/" + d : ""}${e ? "-" + e : ""}`;
}

