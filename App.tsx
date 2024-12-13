import { useEffect, useState } from "react";
import prompt from "react-native-prompt-android";
import Safe, { PasskeyArgType, SigningMethod } from "@safe-global/protocol-kit";
import { WalletClient, Transport, Chain, Hex, Account } from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import {
  View,
  Text,
  StyleSheet,
  Button,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import {
  getStoredPassKey,
  removeStoredPassKey,
  storePassKey,
} from "./lib/storage";
import { createPassKey, getPassKey } from "./lib/passkeys";

export default function App() {
  const [protocolKit, setProtocolKit] = useState<Safe | null>(null);
  const [passkeySignerProtocolKit, setPasskeySignerProtocolKit] =
    useState<Safe | null>(null);
  const [passkeySigner, setPasskeySigner] = useState<PasskeyArgType | null>(
    null
  );
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      let protocolKitInstance = await Safe.init({
        provider: process.env.EXPO_PUBLIC_RPC_URL as string,
        signer: process.env.EXPO_PUBLIC_SAFE_SIGNER_PK,
        predictedSafe: {
          safeAccountConfig: {
            owners: JSON.parse(process.env.EXPO_PUBLIC_SAFE_OWNERS as string),
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: process.env.EXPO_PUBLIC_SAFE_SALT_NONCE,
          },
        },
      });

      const safeAddress = await protocolKitInstance.getAddress();
      const isDeployed = await protocolKitInstance.isSafeDeployed();

      console.log("Safe address", safeAddress);
      console.log("Is deployed", isDeployed);

      setSafeAddress(safeAddress);
      setIsDeployed(isDeployed);

      if (isDeployed) {
        protocolKitInstance = await protocolKitInstance.connect({
          provider: process.env.EXPO_PUBLIC_RPC_URL,
          signer: process.env.EXPO_PUBLIC_SAFE_SIGNER_PK,
          safeAddress: safeAddress,
        });
      }

      setProtocolKit(protocolKitInstance);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const storedPasskey = await getStoredPassKey("safe-owner");

      setPasskeySigner(storedPasskey);
    })();
  }, []);

  useEffect(() => {
    if (!passkeySigner || !safeAddress) return;

    (async () => {
      const passkeySignerProtocolKitInstance = await Safe.init({
        provider: process.env.EXPO_PUBLIC_RPC_URL,
        signer: { ...passkeySigner, getFn: getPassKey } as PasskeyArgType,
        safeAddress,
      });

      setPasskeySignerProtocolKit(passkeySignerProtocolKitInstance);
    })();
  }, [safeAddress, passkeySigner]);

  const handleActivateAccount = async () => {
    if (!protocolKit || !safeAddress) return;

    setIsLoading(true);

    const safeDeploymentTransaction =
      await protocolKit.createSafeDeploymentTransaction();

    const signer = (await protocolKit
      .getSafeProvider()
      .getExternalSigner()) as WalletClient<Transport, Chain, Account>;
    const client = protocolKit.getSafeProvider().getExternalProvider();

    if (!signer)
      throw new Error(
        "SafeProvider must be initialized with a signer to use this function"
      );

    const hash = await signer.sendTransaction({
      to: safeDeploymentTransaction.to as `0x${string}`,
      data: safeDeploymentTransaction.data as Hex,
      value: BigInt(safeDeploymentTransaction.value),
      account: signer.account,
    });

    const receipt = await waitForTransactionReceipt(client, { hash });

    if (receipt.transactionHash) {
      setIsDeployed(true);

      const updatedProtocolKitInstance = await protocolKit.connect({
        provider: protocolKit.getSafeProvider().provider,
        signer: protocolKit.getSafeProvider().signer,
        safeAddress: await protocolKit.getAddress(),
      });

      setProtocolKit(updatedProtocolKitInstance);

      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  const handleAddPasskeyOwner = async () => {
    if (!protocolKit) {
      return;
    }

    const passkeyCredential = await createPassKey();

    if (!passkeyCredential) {
      throw Error("Passkey creation failed: No credential was returned.");
    }

    const signer = await Safe.createPasskeySigner(passkeyCredential);

    setIsLoading(true);

    const addOwnerTx = await protocolKit.createAddOwnerTx({
      passkey: signer,
    });

    const signedAddOwnerTx = await protocolKit.signTransaction(
      addOwnerTx,
      SigningMethod.ETH_SIGN
    );

    await protocolKit.executeTransaction(signedAddOwnerTx);

    await storePassKey(signer, "safe-owner");

    const passkeySignerProtocolKitInstance = await Safe.init({
      provider: process.env.EXPO_PUBLIC_RPC_URL,
      signer: { ...signer, getFn: getPassKey } as PasskeyArgType,
      safeAddress: safeAddress as string,
    });

    setPasskeySignerProtocolKit(passkeySignerProtocolKitInstance);
    setPasskeySigner(signer);
    setIsLoading(false);
  };

  const handleSignMessage = async () => {
    if (!passkeySignerProtocolKit) return;

    prompt(
      "Sign message",
      "Enter the message to sign",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "Sign",
          onPress: async (message: string) => {
            const signedMessage = await passkeySignerProtocolKit.signMessage(
              passkeySignerProtocolKit.createMessage(message),
              SigningMethod.ETH_SIGN
            );

            if (Platform.OS === "web") {
              window.alert(
                (signedMessage.data as string) +
                  "\n" +
                  signedMessage.encodedSignatures()
              );
            } else {
              Alert.alert(
                signedMessage.data as string,
                signedMessage.encodedSignatures()
              );
            }
          },
        },
      ],
      {
        type: "plain-text",
        cancelable: false,
        defaultValue: "",
        placeholder: "placeholder",
        style: "shimo",
      }
    );
  };

  const handleSendTransaction = async () => {
    if (!safeAddress || !protocolKit || !passkeySignerProtocolKit) return;

    setIsLoading(true);

    const transaction = {
      to: safeAddress,
      value: "0",
      data: "0x",
    };

    const safeTransaction = await passkeySignerProtocolKit.createTransaction({
      transactions: [transaction],
    });

    const signedTransaction = await passkeySignerProtocolKit.signTransaction(
      safeTransaction
    );

    const txResult = await protocolKit.executeTransaction(signedTransaction);

    setIsLoading(false);

    if (txResult.hash) {
      if (Platform.OS === "web") {
        window.alert(txResult.hash as string);
      } else {
        console.log("txHash", txResult.hash);
        Alert.alert("Transaction hash", txResult.hash);
      }
    }
  };

  const handleRemovePasskey = async () => {
    removeStoredPassKey("safe-owner");
    setPasskeySigner(null);
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loadingContainer} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text>Safe Passkeys demo</Text>
      </View>

      <View>
        <Text style={styles.sectionContainer}>Safe Address</Text>
        <Text>{safeAddress}</Text>
      </View>

      {!isDeployed && (
        <View style={styles.sectionContainer}>
          <Text>⚠️ The account is not activated yet</Text>

          <Button title="Activate account" onPress={handleActivateAccount} />
        </View>
      )}

      {isDeployed && (
        <>
          {!passkeySigner && (
            <Button title="Add passkey owner" onPress={handleAddPasskeyOwner} />
          )}

          {passkeySigner && (
            <>
              <Button title="Sign message" onPress={handleSignMessage} />
              <Button
                title="Send dummy transaction"
                onPress={handleSendTransaction}
              />
              <Button title="Remove passkey" onPress={handleRemovePasskey} />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionContainer: {
    gap: 8,
    marginBottom: 8,
  },
  safeLogo: {
    height: 160,
    width: 200,
    bottom: 10,
    position: "absolute",
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
