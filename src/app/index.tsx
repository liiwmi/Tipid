import { Redirect } from 'expo-router';

export default function Index() {
  // Immediately redirect to the auth group
  return <Redirect href="/(auth)/login" />;
}