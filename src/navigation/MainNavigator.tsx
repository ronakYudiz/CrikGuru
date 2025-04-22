import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import MatchDetailsScreen from '../screens/MatchDetailsScreen';
import GuestMatchDetailsScreen from '../screens/GuestMatchDetailsScreen';
import AssignPlayersScreen from '../screens/AssignPlayersScreen';
import PlayerScoresScreen from '../screens/PlayerScoresScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AdminScreen from '../screens/AdminScreen';

export type MainStackParamList = {
    Home: undefined;
    MatchDetails: { matchId: string; scoresJustUpdated?: boolean };
    GuestMatchDetails: { matchId: string };
    AssignPlayers: { matchId: string; editAssignment?: any };
    PlayerScores: { matchId: string };
    Leaderboard: undefined;
    Admin: { skipLogin?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="Home"
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
                name="Home"
                component={HomeScreen}
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="MatchDetails"
                component={MatchDetailsScreen}
                options={{ title: 'Match Details' }}
            />
            <Stack.Screen
                name="GuestMatchDetails"
                component={GuestMatchDetailsScreen}
                options={{ title: 'Match Details' }}
            />
            <Stack.Screen
                name="AssignPlayers"
                component={AssignPlayersScreen}
                options={{ title: 'Assign Players' }}
            />
            <Stack.Screen
                name="PlayerScores"
                component={PlayerScoresScreen}
                options={{ title: 'Player Scores' }}
            />
            <Stack.Screen
                name="Leaderboard"
                component={LeaderboardScreen}
                options={{ title: 'Leaderboard' }}
            />
            <Stack.Screen
                name="Admin"
                component={AdminScreen}
                options={{
                    title: 'Admin Panel'
                }}
            />
        </Stack.Navigator>
    );
};

export default MainNavigator;
