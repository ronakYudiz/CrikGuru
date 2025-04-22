import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// You may need to adjust this import based on your Redux store structure
import { RootState } from '../store/store';

export type RootStackParamList = {
    Home: undefined;
    MatchDetails: { matchId: string; scoresJustUpdated?: boolean };
    GuestMatchDetails: { matchId: string };
    AssignPlayers: { matchId: string; editAssignment?: any };
    PlayerScores: { matchId: string };
    Leaderboard: undefined;
    Admin: { skipLogin?: boolean } | undefined;
    Login: undefined;
};

const AppNavigator = () => {
    // Get authentication state from Redux
    const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

export default AppNavigator;