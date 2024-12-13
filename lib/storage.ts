import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PasskeyArgType } from "@safe-global/protocol-kit";

const isWeb = Platform.OS === "web";

export async function storePassKey(passkey: PasskeyArgType, label: string) {
  const serializedPasskey = JSON.stringify(passkey);

  if (isWeb) {
    localStorage.setItem(label, serializedPasskey);
  } else {
    try {
      await AsyncStorage.setItem(label, serializedPasskey);
    } catch (error) {
      console.error("Error storing the passkey", error);
    }
  }
}

export async function getStoredPassKey(label: string) {
  if (isWeb) {
    const passkey = localStorage.getItem(label);
    return passkey ? JSON.parse(passkey) : undefined;
  } else {
    try {
      const passkey = await AsyncStorage.getItem(label);

      return passkey ? JSON.parse(passkey) : undefined;
    } catch (error) {
      console.error("Error retrieving the passkey", error);
    }
  }
}

export async function removeStoredPassKey(label: string) {
  if (isWeb) {
    localStorage.removeItem(label);
  } else {
    try {
      await AsyncStorage.removeItem(label);
    } catch (error) {
      console.error("Error removing the passkey", error);
    }
  }
}
