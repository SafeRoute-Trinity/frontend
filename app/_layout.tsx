import { Stack } from "expo-router";
import { Auth0Provider } from "../contexts/Auth0Context";

export default function RootLayout() {
  return (
    <Auth0Provider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </Auth0Provider>
  );
}
