import { Redirect } from 'expo-router';

export default function LegacyHomeScreen() {
  return <Redirect href="/(app)/(tabs)" />;
}
