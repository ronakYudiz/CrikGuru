import { NavigatorScreenParams } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/MainNavigator';
import { AuthStackParamList } from '../navigation/AuthNavigator';

export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainStackParamList>;
};

// Re-export the specific stack param lists for convenience
export type { MainStackParamList, AuthStackParamList };
