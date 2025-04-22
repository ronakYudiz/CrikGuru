import React from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { COLORS } from '../constants/colors';

// Create a custom theme based on the color scheme
const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: COLORS.DARK,
        secondary: COLORS.LIME,
        background: COLORS.WHITE,
        surface: COLORS.WHITE,
        surfaceVariant: COLORS.LIME,
        error: '#B00020',

        // Custom button colors
        buttonPrimary: COLORS.DARK,
        buttonText: COLORS.WHITE,
        buttonSecondary: COLORS.WHITE,
        buttonSecondaryText: COLORS.DARK,

        // Card colors
        cardBackground: COLORS.LIME,
        cardText: COLORS.DARK,
    },
};

type ThemeProviderProps = {
    children: React.ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    return (
        <PaperProvider theme={theme}>
            {children}
        </PaperProvider>
    );
};

export type AppTheme = typeof theme;
export const useAppTheme = () => theme; 