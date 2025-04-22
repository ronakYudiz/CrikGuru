import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, Divider, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { RootStackParamList } from '../navigation';
import { loginAsAdmin, loginAsGuest, clearError } from '../store/slices/userSlice';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

// Define consistent font families
const fontFamily = Platform.select({
    ios: 'System',
    android: 'System',
    default: 'System',
});

const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const [loginType, setLoginType] = useState('guest');
    const [adminCode, setAdminCode] = useState('');
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const { isAuthenticated, error } = useAppSelector(state => state.user);

    // Redirect to home if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigation.replace('Home');
        }
    }, [isAuthenticated, navigation]);

    // Clear error when changing login type
    useEffect(() => {
        dispatch(clearError());
    }, [loginType, dispatch]);

    const handleAdminLogin = () => {
        dispatch(loginAsAdmin({ code: adminCode }));
    };

    const handleGuestLogin = () => {
        dispatch(loginAsGuest());
    };

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={[
                styles.headerContainer,
                { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0 }
            ]}>
                <Text variant="displaySmall" style={[styles.title, { fontFamily }]}>IPL Dream League</Text>
            </View>

            <View style={styles.contentContainer}>
                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        <SegmentedButtons
                            value={loginType}
                            onValueChange={setLoginType}
                            buttons={[
                                {
                                    value: 'guest',
                                    label: 'Guest Login',
                                    style: { borderRadius: 0 }
                                },
                                {
                                    value: 'admin',
                                    label: 'Admin Login',
                                    style: { borderRadius: 0 }
                                }
                            ]}
                            style={styles.segmentedButtons}
                            theme={{
                                colors: {
                                    secondaryContainer: '#21212F',
                                    onSecondaryContainer: 'white',
                                    outline: '#21212F'
                                }
                            }}
                        />

                        <Divider style={styles.divider} horizontalInset />

                        {loginType === 'admin' ? (
                            <View style={styles.formContainer}>
                                <Text variant="titleLarge" style={[styles.sectionTitle, { fontFamily }]}>Admin Login</Text>
                                <TextInput
                                    mode="outlined"
                                    label="Admin Code"
                                    value={adminCode}
                                    onChangeText={setAdminCode}
                                    secureTextEntry
                                    style={styles.input}
                                    outlineStyle={{ borderRadius: 0 }}
                                    theme={{
                                        roundness: 0,
                                        fonts: {
                                            bodyLarge: { fontFamily },
                                            labelLarge: { fontFamily }
                                        }
                                    }}
                                />

                                {error && <Text style={[styles.errorText, { fontFamily }]}>{error}</Text>}

                                <Button
                                    mode="contained"
                                    onPress={handleAdminLogin}
                                    style={styles.button}
                                    buttonColor="#21212F"
                                    contentStyle={{ paddingVertical: 6 }}
                                    labelStyle={{ fontSize: 16, fontWeight: '600', fontFamily, color: 'white' }}
                                >
                                    Login as Admin
                                </Button>
                            </View>
                        ) : (
                            <View style={styles.formContainer}>
                                <Text variant="titleLarge" style={[styles.sectionTitle, { fontFamily }]}>Guest Access</Text>
                                <Text style={[styles.guestDescription, { fontFamily }]}>
                                    Continue as a guest to view match data without editing capabilities.
                                </Text>
                                <Button
                                    mode="contained"
                                    onPress={handleGuestLogin}
                                    icon="account-eye"
                                    style={styles.button}
                                    buttonColor="#21212F"
                                    contentStyle={{ paddingVertical: 6 }}
                                    labelStyle={{ fontSize: 16, fontWeight: '600', fontFamily, color: 'white' }}
                                >
                                    Continue as Guest
                                </Button>
                            </View>
                        )}
                    </Card.Content>
                </Card>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f9fa',
    },
    headerContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#CEF249',
        paddingVertical: 22,
        // Add subtle gradient effect through shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    title: {
        color: '#21212F',
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 0,
        backgroundColor: '#CEF249',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    cardContent: {
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    segmentedButtons: {
        marginBottom: 20,
    },
    divider: {
        marginBottom: 24,
        height: 1.5,
        backgroundColor: '#21212F',
    },
    formContainer: {
        width: '100%',
        paddingHorizontal: 8,
    },
    sectionTitle: {
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '600',
        color: '#21212F',
        letterSpacing: 0.3,
    },
    input: {
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    button: {
        marginTop: 8,
        borderRadius: 0,
        paddingVertical: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    guestButton: {
        marginTop: 16,
    },
    guestDescription: {
        textAlign: 'center',
        marginVertical: 16,
        marginHorizontal: 10,
        color: '#21212F',
        fontSize: 15,
        lineHeight: 22,
    },
    errorText: {
        color: '#d32f2f',
        marginBottom: 16,
        textAlign: 'center',
        fontSize: 14,
    },
});

export default LoginScreen; 