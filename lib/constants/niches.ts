export type NicheKey =
  | 'beauty_female'
  | 'hair_growth_male'
  | 'sexual_performance_male'
  | 'health_supplements'
  | 'beauty_male'
  | 'feminine_health'
  | 'weight_loss'
  | 'joint_pain'

export interface NicheConfig {
  key: NicheKey
  label: string
  emoji: string
  hexPrimary: string
  hexSecondary: string
  toneAdjectives: string[]
}

export const NICHES: NicheConfig[] = [
  {
    key: 'beauty_female',
    label: 'Belleza (mujer)',
    emoji: '💄',
    hexPrimary: '#C4507A',
    hexSecondary: '#F9E4EE',
    toneAdjectives: ['suave', 'empático', 'aspiracional'],
  },
  {
    key: 'hair_growth_male',
    label: 'Crecimiento capilar',
    emoji: '🌱',
    hexPrimary: '#1A3C2A',
    hexSecondary: '#C9A96E',
    toneAdjectives: ['directo', 'científico', 'confianza'],
  },
  {
    key: 'sexual_performance_male',
    label: 'Performance masculina',
    emoji: '⚡',
    hexPrimary: '#1C1C2E',
    hexSecondary: '#8B5CF6',
    toneAdjectives: ['potencia', 'discreción', 'confianza'],
  },
  {
    key: 'health_supplements',
    label: 'Suplementos salud',
    emoji: '💊',
    hexPrimary: '#1B4332',
    hexSecondary: '#A8D5B5',
    toneAdjectives: ['natural', 'honesto', 'energético'],
  },
  {
    key: 'beauty_male',
    label: 'Belleza (hombre)',
    emoji: '🧴',
    hexPrimary: '#1C2B3A',
    hexSecondary: '#4A90D9',
    toneAdjectives: ['masculino', 'moderno', 'efectivo'],
  },
  {
    key: 'feminine_health',
    label: 'Salud femenina',
    emoji: '🌸',
    hexPrimary: '#D4A5C9',
    hexSecondary: '#F2E0D9',
    toneAdjectives: ['delicado', 'íntimo', 'empoderador'],
  },
  {
    key: 'weight_loss',
    label: 'Pérdida de peso',
    emoji: '🔥',
    hexPrimary: '#2D4A22',
    hexSecondary: '#C8F135',
    toneAdjectives: ['motivacional', 'transformador'],
  },
  {
    key: 'joint_pain',
    label: 'Dolor articular',
    emoji: '🦴',
    hexPrimary: '#2C4A6E',
    hexSecondary: '#87CEEB',
    toneAdjectives: ['empático', 'alivio', 'confiable'],
  },
]

export function getNicheConfig(key: string): NicheConfig | undefined {
  return NICHES.find((n) => n.key === key)
}
