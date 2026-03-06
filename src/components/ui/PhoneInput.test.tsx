
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PhoneInput } from "./PhoneInput";
import { COMMON_COUNTRIES } from "@/lib/phone-utils";

describe("PhoneInput Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders correctly", () => {
    render(<PhoneInput value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: /selecionar país/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("handles country change", () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    
    const select = screen.getByRole("combobox", { name: /selecionar país/i });
    fireEvent.change(select, { target: { value: "US" } });
    
    // Changing country doesn't trigger onChange if input is empty
    expect(onChange).not.toHaveBeenCalled();
    
    // But if we have a number
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "2025550123" } });
    // Should call onChange with US number
    expect(onChange).toHaveBeenCalledWith("+12025550123");
  });

  const testCases = [
    { country: "BR", input: "11999999999", expected: "+5511999999999", name: "Brazil" },
    { country: "US", input: "2025550123", expected: "+12025550123", name: "United States" },
    { country: "PT", input: "912345678", expected: "+351912345678", name: "Portugal" },
    { country: "ES", input: "612345678", expected: "+34612345678", name: "Spain" },
    { country: "FR", input: "612345678", expected: "+33612345678", name: "France" },
    { country: "DE", input: "15123456789", expected: "+4915123456789", name: "Germany" },
    { country: "GB", input: "07911123456", expected: "+447911123456", name: "United Kingdom" },
    { country: "AR", input: "91123456789", expected: "+5491123456789", name: "Argentina" },
    { country: "MX", input: "5512345678", expected: "+525512345678", name: "Mexico" },
    { country: "JP", input: "9012345678", expected: "+819012345678", name: "Japan" },
  ];

  testCases.forEach(({ country, input, expected, name }) => {
    it(`formats correctly for ${name} (${country})`, () => {
      const onChange = vi.fn();
      render(<PhoneInput value="" onChange={onChange} />);

      const select = screen.getByRole("combobox", { name: /selecionar país/i });
      fireEvent.change(select, { target: { value: country } });

      const inputField = screen.getByRole("textbox");
      fireEvent.change(inputField, { target: { value: input } });

      expect(onChange).toHaveBeenCalledWith(expected);
    });
  });

  it("enables WhatsApp button only for valid numbers", () => {
    render(<PhoneInput value="+5511999999999" onChange={() => {}} showWhatsAppButton={true} />);
    const link = screen.getByRole("link", { name: /enviar mensagem via whatsapp/i });
    expect(link).toHaveAttribute("href", "https://wa.me/5511999999999");
    // Should not have disabled style (we can't easily check styled-component props in unit test without snapshot, but we check behavior)
  });

  it("disables WhatsApp button for invalid numbers", () => {
    render(<PhoneInput value="+5511" onChange={() => {}} showWhatsAppButton={true} />);
    const link = screen.getByRole("link", { name: /digite um número válido/i });
    expect(link).toBeInTheDocument();
    // In our component, we prevent default on click if invalid
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn(), writable: true });
    
    fireEvent(link, event);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
