import { Redirect } from 'expo-router';

export default function LegacyAdminRedirect() {
  return <Redirect href="/(app)/(tabs)/admin-dashboard" />;
}
