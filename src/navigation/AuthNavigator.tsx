import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';

export type AuthStackParamList = {
    Login: undefined;
    // Add other auth screens if needed (Register, ForgotPassword, etc.)
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#CEF249',
                },
                headerTintColor: '#21212F',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                    title: 'IPL Dream League',
                    headerShown: false
                }}
            />
            {/* Add other auth screens here if needed */}
        </Stack.Navigator>
    );
};

export default AuthNavigator;
