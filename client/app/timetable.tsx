import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { getTimetableApi, TimetableDay } from '@/api/timetable';
import TimetableView from '@/components/timetable-view';

export default function TimetableScreen() {
    const getEmptyTimetable = (): TimetableDay[] => [
        { day: 'Monday', sessions: [] },
        { day: 'Tuesday', sessions: [] },
        { day: 'Wednesday', sessions: [] },
        { day: 'Thursday', sessions: [] },
        { day: 'Friday', sessions: [] },
        { day: 'Saturday', sessions: [] },
        { day: 'Sunday', sessions: [] }
    ];

    const [timetable, setTimetable] = useState<TimetableDay[]>(getEmptyTimetable());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimetable = async () => {
            try {
                const userRaw = await AsyncStorage.getItem('user');
                if (userRaw) {
                    const user = JSON.parse(userRaw);
                    const response = await getTimetableApi(user.id);
                    setTimetable(response.timetable || getEmptyTimetable());
                }
            } catch (error) {
                console.error('Failed to fetch timetable:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTimetable();
    }, []);

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            router.replace('/');
        } catch (e) {
            console.error('Logout failed', e);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <TimetableView
            timetable={timetable}
            onLogout={handleLogout}
        />
    );
}
