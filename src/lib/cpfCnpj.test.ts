import { describe, expect, it } from "vitest";
import { formatCpfCnpj, onlyDigits, validateCnpj, validateCpf, validateCpfCnpj } from "@/lib/cpfCnpj";

describe("cpfCnpj", () => {
  it("onlyDigits removes non-digits", () => {
    expect(onlyDigits("12.345-6")).toBe("123456");
  });

  it("validates known CPF", () => {
    expect(validateCpf("529.982.247-25")).toBe(true);
    expect(validateCpf("52998224725")).toBe(true);
    expect(validateCpf("111.111.111-11")).toBe(false);
  });

  it("validates known CNPJ", () => {
    expect(validateCnpj("04.252.011/0001-10")).toBe(true);
    expect(validateCnpj("04252011000110")).toBe(true);
    expect(validateCnpj("00.000.000/0000-00")).toBe(false);
  });

  it("validates CPF/CNPJ", () => {
    expect(validateCpfCnpj("52998224725")).toBe(true);
    expect(validateCpfCnpj("04252011000110")).toBe(true);
    expect(validateCpfCnpj("123")).toBe(false);
  });

  it("formats CPF/CNPJ", () => {
    expect(formatCpfCnpj("52998224725")).toBe("529.982.247-25");
    expect(formatCpfCnpj("04252011000110")).toBe("04.252.011/0001-10");
  });
});

