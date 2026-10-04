/**
 * Утилита для перевода денежных сумм в сомони и дирамах в строку прописью на русском языке
 * Пример: 1250.5 -> "Одна тысяча двести пятьдесят сомони 50 дирамов"
 */

const ONES_MALE = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_FEMALE = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

function getPlural(number: number, one: string, two: string, five: string): string {
  const abs = Math.abs(number) % 100;
  const rem = abs % 10;
  if (abs > 10 && abs < 20) return five;
  if (rem > 1 && rem < 5) return two;
  if (rem === 1) return one;
  return five;
}

function tripletToWords(num: number, isFemale = false): string {
  const words: string[] = [];
  const h = Math.floor(num / 100);
  const t = Math.floor((num % 100) / 10);
  const o = num % 10;

  if (h > 0) words.push(HUNDREDS[h]);

  if (t === 1) {
    words.push(TEENS[o]);
  } else {
    if (t > 1) words.push(TENS[t]);
    if (o > 0) {
      words.push(isFemale ? ONES_FEMALE[o] : ONES_MALE[o]);
    }
  }

  return words.join(' ');
}

export function numberToWordsRu(amount: number): string {
  if (isNaN(amount) || amount < 0) return 'Ноль сомони 00 дирамов';

  const fixed = amount.toFixed(2);
  const parts = fixed.split('.');
  const integerPart = parseInt(parts[0], 10);
  const diramsPart = parts[1] || '00';

  if (integerPart === 0) {
    return `Ноль сомони ${diramsPart} ${getPlural(parseInt(diramsPart, 10), 'дирам', 'дирама', 'дирамов')}`;
  }

  const millions = Math.floor(integerPart / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const units = integerPart % 1_000;

  const resultWords: string[] = [];

  // Миллионы (мужской род: один миллион, два миллиона...)
  if (millions > 0) {
    const mWords = tripletToWords(millions, false);
    const mPlural = getPlural(millions, 'миллион', 'миллиона', 'миллионов');
    resultWords.push(`${mWords} ${mPlural}`);
  }

  // Тысячи (женский род: одна тысяча, две тысячи...)
  if (thousands > 0) {
    const thWords = tripletToWords(thousands, true);
    const thPlural = getPlural(thousands, 'тысяча', 'тысячи', 'тысяч');
    resultWords.push(`${thWords} ${thPlural}`);
  }

  // Единицы (сомони - мужской род: один сомони, два сомони...)
  if (units > 0) {
    const uWords = tripletToWords(units, false);
    resultWords.push(uWords);
  }

  // Сомони в Таджикистане: "сомони"
  const somoniWord = 'сомони';
  const diramsNum = parseInt(diramsPart, 10);
  const diramWord = getPlural(diramsNum, 'дирам', 'дирама', 'дирамов');

  const integerStr = resultWords.filter(Boolean).join(' ').trim();
  const capitalized = integerStr.charAt(0).toUpperCase() + integerStr.slice(1);

  return `${capitalized} ${somoniWord} ${diramsPart} ${diramWord}`;
}
