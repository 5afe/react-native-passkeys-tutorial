## React Native passkeys app

This app is a simple React Native app that allows you to test passkeys. The app uses the Safe Core SDK `protocol-kit` and `react-native-passkeys` library The app will enable you to:

- Deploy a new Safe on Ethereum Sepolia.
- Create a new passkey secured by the user's device.
- Sign messages and create transactions using the passkey as a signer.

Check the [Safe documentation](http://docs.safe.global/advanced/passkeys/tutorials/react-native) to follow the complete tutorial.

## What you’ll need

**Prerequisite knowledge:** You will need some basic experience with [React](https://react.dev/learn), [React Native](https://reactnative.dev) and [Expo](https://docs.expo.dev).

Before progressing with the tutorial, please make sure you have:

- Downloaded and installed [Node.js](https://nodejs.org/en/download/package-manager);
- Have enrolled to the [Apple Developer Program](https://developer.apple.com/programs/enroll/) and installed [Xcode](https://developer.apple.com/xcode/) (if you want to test the app on iOS);
- Have downloaded and installed [Android Studio](https://developer.android.com/studio) and have a Google account connected to your emulator (if you want to test the app on Android).

## Getting Started

To install this example application, run the following commands:

```bash
git clone https://github.com/5afe/react-native-passkeys-tutorial.git
cd react-native-passkeys-tutorial
npm install
```

This will get a copy of the project installed locally. Now, create a file named `.env` at the root of your project, and add your RPC URL, private key and address to it:

```bash
cp .env-sample .env
```

Run the local development server with the following command, depending on the environment you want to test:

```bash
npm run ios
npm run android
npm run web
```

## Help

Please post any questions on [Stack Exchange](https://ethereum.stackexchange.com/questions/tagged/safe-core) with the `safe-core` tag.

## License

MIT, see [LICENSE](LICENSE).
