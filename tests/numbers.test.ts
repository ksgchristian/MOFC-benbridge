import { describe, expect, it } from "vitest";
import { numbersInText, verifyNumber, verifyNumbers } from "@/lib/verify/numbers";

describe("guardrail 3: verifyNumber, digits", () => {
  it.each([
    [2100, "Gano 2100 al mes"],
    [2100, "Gano 2,100 al mes"],
    [2100, "Gano 2.100 al mes"],
    [2100, "Gano 2 100 al mes"],
    [2100, "Gano $2,100 al mes"],
    [2100.5, "Gano $2,100.50 al mes"],
    [1850.5, "gano 1.850,50 al mes"],
    [1234567, "1,234,567 dólares"],
    [950, "pago $950 de renta"],
    [3, "somos 3 en la casa"],
  ])("finds %s in %j", (value, text) => {
    expect(verifyNumber(value, text)).toBe(true);
  });

  it("doesn't let a dropped part of a spoken number pass", () => {
    expect(verifyNumber(2000, "gano dos mil cien al mes")).toBe(false);
    expect(verifyNumber(1002, "mil dos veces al mes")).toBe(false);
  });

  it("does not accept a number with a dropped thousand", () => {
    expect(verifyNumber(100, "Gano 2,100 al mes")).toBe(false);
    expect(verifyNumber(210, "Gano 2100 al mes")).toBe(false);
  });

  it("rejects numbers that aren't there", () => {
    expect(verifyNumber(2000, "Gano 2,100 al mes")).toBe(false);
    expect(verifyNumber(1850, "gano mil ochocientos al mes")).toBe(false);
    expect(verifyNumber(5, "somos 3 adultos y 2 niños")).toBe(false);
    expect(verifyNumber(0, "no trabajo ahora")).toBe(false);
  });
});

describe("guardrail 3: verifyNumber, Spanish words", () => {
  it.each([
    [2100, "gano dos mil cien al mes"],
    [1850, "mil ochocientos cincuenta después de impuestos"],
    [970, "me pagan novecientos setenta cada dos semanas"],
    [500, "me pagan quinientos a la semana"],
    [35, "treinta y cinco por hora"],
    [21, "veintiún días"],
    [16, "dieciséis"],
    [1000, "mil"],
    [2000, "2 mil al mes"],
    [1000000, "un millón"],
    [1000, "mil dos veces al mes"],
    [2, "mil dos veces al mes"],
    [3, "somos tres"],
    [4, "cuatro"],
  ])("finds %s in %j", (value, text) => {
    expect(verifyNumber(value, text)).toBe(true);
  });
});

describe("guardrail 3: verifyNumber, English words", () => {
  it.each([
    [2100, "two thousand one hundred a month"],
    [2100, "twenty-one hundred a month"],
    [500, "five hundred a week"],
    [1000, "a thousand dollars"],
    [2050, "two thousand and fifty"],
    [4, "um so she says four people live there"],
    [35, "thirty five an hour"],
  ])("finds %s in %j", (value, text) => {
    expect(verifyNumber(value, text)).toBe(true);
  });
});

describe("verifyNumbers (each value needs its own mention)", () => {
  it("matches repeated values to separate mentions", () => {
    expect(verifyNumbers([3, 2], "tres adultos y dos niños")).toBe(true);
    expect(verifyNumbers([3, 3], "tres adultos y dos niños")).toBe(false);
    expect(verifyNumbers([2, 2], "2 adultos y 2 niños")).toBe(true);
  });
});

describe("numbersInText", () => {
  it("separates numbers in the same line", () => {
    expect(numbersInText("somos 3 adultos y 2 niños").sort()).toEqual([2, 3]);
    expect(numbersInText("tres adultos y dos niños").sort()).toEqual([2, 3]);
  });

  it("returns nothing for text without numbers", () => {
    expect(numbersInText("no trabajo ahora")).toEqual([]);
  });
});
