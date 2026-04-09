import { useState } from 'react'

export function useLanguage() {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('pericles-lang') || 'en'
  )

  function setLang(newLang) {
    localStorage.setItem('pericles-lang', newLang)
    setLangState(newLang)
  }

  return { lang, setLang }
}