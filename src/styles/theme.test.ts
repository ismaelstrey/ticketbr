import { describe, expect, it } from "vitest";
import { getTheme } from "@/styles/theme";

// Garante que os temas claro e escuro exponham sempre a mesma estrutura de tokens
describe("getTheme", () => {
  it("define o modo informado no tema retornado", () => {
    expect(getTheme("light").mode).toBe("light");
    expect(getTheme("dark").mode).toBe("dark");
  });

  it("propaga a paleta de cores para os tokens do tema", () => {
    const light = getTheme("light");
    expect(light.tokens.color.bg.default).toBe(light.colors.background);
    expect(light.tokens.color.text.primary).toBe(light.colors.text.primary);
    expect(light.tokens.color.interactive.primary).toBe(light.colors.primary);
    expect(light.tokens.color.status.success).toBe(light.colors.status.success);
  });

  it("mantém a mesma estrutura de tokens nos dois modos", () => {
    const light = getTheme("light");
    const dark = getTheme("dark");

    expect(Object.keys(dark.tokens.color)).toEqual(Object.keys(light.tokens.color));
    expect(Object.keys(dark.tokens.color.bg)).toEqual(Object.keys(light.tokens.color.bg));
    expect(Object.keys(dark.tokens.color.status)).toEqual(Object.keys(light.tokens.color.status));
    expect(Object.keys(dark.colors)).toEqual(Object.keys(light.colors));
  });

  it("aplica variações específicas por modo nos tokens derivados", () => {
    const light = getTheme("light");
    const dark = getTheme("dark");

    expect(dark.tokens.color.interactive.ghostHover).not.toBe(light.tokens.color.interactive.ghostHover);
    expect(dark.tokens.color.status.successText).not.toBe(light.tokens.color.status.successText);
    expect(light.shadows.card).not.toBe(dark.shadows.card);
    expect(light.shadows.hover).not.toBe(dark.shadows.hover);
  });

  it("oferece quatro gradientes de pílula em cada modo", () => {
    expect(getTheme("light").tokens.color.interactive.pillGradients).toHaveLength(4);
    expect(getTheme("dark").tokens.color.interactive.pillGradients).toHaveLength(4);
  });

  it("compartilha os tokens comuns entre os modos", () => {
    const light = getTheme("light");
    const dark = getTheme("dark");

    expect(dark.breakpoints).toEqual(light.breakpoints);
    expect(dark.spacing).toEqual(light.spacing);
    expect(dark.typography).toEqual(light.typography);
    expect(dark.motion).toEqual(light.motion);
    expect(dark.zIndex).toEqual(light.zIndex);
    expect(dark.borderRadius).toEqual(light.borderRadius);
  });
});
