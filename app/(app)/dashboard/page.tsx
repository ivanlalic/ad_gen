import { redirect } from 'next/navigation'

// Dashboard just routes the user to the right place
export default async function DashboardPage() {
  redirect('/stores')
}
