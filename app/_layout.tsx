import { Stack } from 'expo-router';
import { Auth0Provider } from '../contexts/Auth0Context';

const RootLayout = () => (
  <Auth0Provider>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  </Auth0Provider>
);

export default RootLayout;
