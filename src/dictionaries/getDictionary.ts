const dictionaries = {
  ko: () => import('./ko.json').then((module) => module.default),
  en: () => import('./en.json').then((module) => module.default),
};

// 사용자가 접속한 언어(lang)에 맞는 단어장을 찾아주는 함수
export const getDictionary = async (lang: 'ko' | 'en') => {
  return dictionaries[lang]();
};
