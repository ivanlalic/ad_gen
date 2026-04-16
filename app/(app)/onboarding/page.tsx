import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

interface Props {
  searchParams: Promise<{ storeId?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { storeId } = await searchParams
  return <OnboardingWizard existingStoreId={storeId} />
}
