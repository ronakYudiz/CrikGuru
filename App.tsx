/**
 * IPL Dream League App
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Appearance } from 'react-native';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import DataLoadingProvider from './src/providers/DataLoadingProvider';
import MatchStatusChecker from './src/components/MatchStatusChecker';
import { ThemeProvider } from './src/providers/ThemeProvider';

const App = () => {
  // Force light mode for React Native components
  useEffect(() => {
    Appearance.setColorScheme('light');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider>
              <DataLoadingProvider>
                <MatchStatusChecker />
                <AppNavigator />
              </DataLoadingProvider>
            </ThemeProvider>
          </PersistGate>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
