import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import { COLORS } from '../constants/colors';

interface AppButtonProps extends ButtonProps {
    variant?: 'primary' | 'secondary';
}

/**
 * Custom button component that follows the app's color scheme
 * 
 * Usage:
 * - Primary variant: Dark background (#21212F) with white text
 * - Secondary variant: White background with dark text (#21212F)
 */
const AppButton: React.FC<AppButtonProps> = ({
    variant = 'primary',
    style,
    labelStyle,
    mode,
    ...props
}) => {
    // Use mode="contained" for primary variant
    // Use mode="outlined" for secondary variant
    const buttonMode = mode || (variant === 'primary' ? 'contained' : 'outlined');

    return (
        <Button
            mode={buttonMode}
            style={[
                variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
                style
            ]}
            labelStyle={[
                variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
                labelStyle
            ]}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    primaryButton: {
        backgroundColor: COLORS.DARK,
    },
    primaryLabel: {
        color: COLORS.WHITE,
    },
    secondaryButton: {
        backgroundColor: COLORS.WHITE,
        borderColor: COLORS.DARK,
        borderWidth: 1,
    },
    secondaryLabel: {
        color: COLORS.DARK,
    },
});

export default AppButton; 