
"use client";

import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { parsePhoneNumberFromString, AsYouType, CountryCode, isValidPhoneNumber } from "libphonenumber-js";
import { FaWhatsapp } from "react-icons/fa";
import { COMMON_COUNTRIES, Country } from "@/lib/phone-utils";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const SelectWrapper = styled.div`
  position: relative;
  min-width: 100px;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  appearance: none; /* Hide default arrow in some browsers for custom styling if needed */
  
  &:focus {
    outline: 2px solid rgba(37, 99, 235, 0.2);
    border-color: #2563eb;
  }
`;

const StyledInput = styled.input<{ $hasError?: boolean }>`
  flex: 1;
  padding: 0.55rem 0.65rem;
  border: 1px solid ${({ $hasError }) => ($hasError ? "#ef4444" : "#e5e7eb")};
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  
  &:focus {
    outline: 2px solid ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.2)" : "rgba(37, 99, 235, 0.2)")};
    border-color: ${({ $hasError }) => ($hasError ? "#ef4444" : "#2563eb")};
  }
`;

const WhatsAppButton = styled.a<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem;
  background: ${({ $disabled }) => ($disabled ? "#e5e7eb" : "#25d366")};
  color: ${({ $disabled }) => ($disabled ? "#9ca3af" : "#fff")};
  border-radius: 6px;
  text-decoration: none;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  transition: opacity 0.2s;
  border: none;
  font-size: 1.1rem;

  &:hover {
    opacity: ${({ $disabled }) => ($disabled ? 1 : 0.9)};
  }
`;

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  showWhatsAppButton?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  id,
  name,
  disabled,
  showWhatsAppButton = true,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>("BR");
  const [displayValue, setDisplayValue] = useState("");

  // Initialize state from prop value
  useEffect(() => {
    if (!value) {
      setDisplayValue("");
      return;
    }

    // Avoid re-formatting if the value matches the current parsed number
    // This prevents cursor jumping or format shifting while typing if the parent updates the prop
    const currentParsed = parsePhoneNumberFromString(displayValue, country);
    if (currentParsed && currentParsed.number === value) {
      return;
    }

    const phoneNumber = parsePhoneNumberFromString(value);
    if (phoneNumber && phoneNumber.isValid()) {
      const countryCode = phoneNumber.country || "BR";
      setCountry(countryCode);
      // Prefer National format for display if it matches the selected country
      setDisplayValue(phoneNumber.format("NATIONAL"));
    } else {
      // If invalid or partial, just show as is
      setDisplayValue(value);
    }
  }, [value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value as CountryCode;
    setCountry(newCountry);
    
    // Attempt to reformat existing input to the new country
    // We strip non-digits and try to parse
    const cleanNumber = displayValue.replace(/\D/g, "");
    
    // If we have a clean number, let's try to format it with the new country
    if (cleanNumber) {
        const asYouType = new AsYouType(newCountry);
        const formatted = asYouType.input(cleanNumber);
        setDisplayValue(formatted);
        
        const phoneNumber = asYouType.getNumber();
        if (phoneNumber && phoneNumber.isValid()) {
            onChange(phoneNumber.number as string);
        } else {
            onChange(cleanNumber);
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Use AsYouType for formatting
    const asYouType = new AsYouType(country);
    const formatted = asYouType.input(input);
    
    setDisplayValue(formatted);

    // Check validity
    const phoneNumber = asYouType.getNumber();
    if (phoneNumber && phoneNumber.isValid()) {
      onChange(phoneNumber.number as string); // E.164
    } else {
      // If not valid yet, pass the raw input so validation can fail
      onChange(input);
    }
  };

  const isValid = useMemo(() => {
    // Check if current value (prop) is a valid E.164
    // We re-parse to be sure
    if (!value) return false;
    return isValidPhoneNumber(value, country);
  }, [value, country]);

  const whatsappLink = useMemo(() => {
    if (!isValid || !value) return "#";
    // Remove + for wa.me link usually, but wa.me accepts clean number
    const clean = value.replace(/[^\d]/g, "");
    return `https://wa.me/${clean}`;
  }, [isValid, value]);

  return (
    <Container>
      <InputGroup>
        <SelectWrapper>
          <StyledSelect
            value={country}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Selecionar país"
          >
            {COMMON_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} {c.dialCode}
              </option>
            ))}
          </StyledSelect>
        </SelectWrapper>
        
        <StyledInput
          id={id}
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder=" (11) 99999-9999"
          $hasError={!!error}
          type="tel"
          autoComplete="tel"
        />

        {showWhatsAppButton && (
          <WhatsAppButton
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            $disabled={!isValid}
            title={isValid ? "Enviar mensagem via WhatsApp" : "Digite um número válido para habilitar"}
            onClick={(e) => {
              if (!isValid) e.preventDefault();
            }}
          >
            <FaWhatsapp />
          </WhatsAppButton>
        )}
      </InputGroup>
    </Container>
  );
}
