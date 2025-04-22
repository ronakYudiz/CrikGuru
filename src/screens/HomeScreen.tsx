import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import { RootStackParamList } from '../navigation';

// Import screen versions
import AdminHomeScreen from './AdminHomeScreen';
import GuestHomeScreen from './GuestHomeScreen';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen = ({ navigation, route }: HomeScreenProps) => {
    const { isAuthenticated, isAdmin } = useAppSelector(state => state.user);


    // Render the appropriate home screen based on user role
    if (isAdmin) {
        return <AdminHomeScreen navigation={navigation} route={route} />;
    } else {
        return <GuestHomeScreen navigation={navigation} route={route} />;
    }
};

export default HomeScreen; 