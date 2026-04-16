export interface CountryConfig {
  code: string
  label: string
  language: string
  languageCode: string
  copyNotes: string
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'ES',
    label: 'España',
    language: 'Español (España)',
    languageCode: 'es-ES',
    copyNotes: 'Usar "tú/vosotros", vocabulario ibérico. Ej: "¡Consíguelo ya!"',
  },
  {
    code: 'AR',
    label: 'Argentina',
    language: 'Español (Argentina)',
    languageCode: 'es-AR',
    copyNotes: 'Usar "vos", tono cálido e informal. Ej: "¡Probalo!"',
  },
  {
    code: 'MX',
    label: 'México',
    language: 'Español (México)',
    languageCode: 'es-MX',
    copyNotes: 'Usar "tú" en UGC, energético. Ej: "¡Aprovecha!"',
  },
  {
    code: 'CO',
    label: 'Colombia',
    language: 'Español (Colombia)',
    languageCode: 'es-CO',
    copyNotes: 'Tono cercano. Ej: "¡No te lo pierdas!"',
  },
  {
    code: 'PT',
    label: 'Portugal',
    language: 'Português (Portugal)',
    languageCode: 'pt-PT',
    copyNotes: 'Português europeu. Usar "tu/você", tom direto. Ej: "Experimenta agora!"',
  },
]

export function getCountryConfig(code: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

export function inferLanguage(countryCode: string): string {
  return getCountryConfig(countryCode)?.languageCode ?? 'es-ES'
}
