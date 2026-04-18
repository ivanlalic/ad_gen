import { COUNTRIES } from '@/lib/constants/countries'
import { FormField } from '@/components/ui/form-field'

export interface StoreData {
  name: string
  country: string
}

interface StepStoreProps {
  data: StoreData
  onChange: (data: StoreData) => void
  errors?: Record<string, string>
}

export function StepStore({ data, onChange, errors = {} }: StepStoreProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tu tienda</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El nombre que ven tus clientes y el país de destino de los ads.
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          label="Nombre de la tienda"
          htmlFor="store-name"
          error={errors.storeName}
        >
          <input
            id="store-name"
            type="text"
            placeholder="Ej: IBericaStore, Nutrex, Calvo Pro..."
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/30"
          />
        </FormField>

        <FormField
          label="País de destino"
          hint="Determina el dialecto del copy generado."
          error={errors.storeCountry}
        >
          <div className="grid grid-cols-2 gap-2">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => onChange({ ...data, country: country.code })}
                className={[
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors duration-150',
                  data.country === country.code
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {country.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {country.copyNotes.split('.')[0]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </FormField>
      </div>
    </div>
  )
}
