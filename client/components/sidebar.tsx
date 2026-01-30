import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Dimensions, TouchableWithoutFeedback, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { styles } from './styles/dashboard-styles'; // Reusing dashboard styles for consistency
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    onLogout?: () => void;
    onTimetablePress?: () => void; // Optional if handled via router
    activeRoute?: string;
    userName?: string;
};

export function Sidebar({ isOpen, onClose, onLogout, onTimetablePress, activeRoute, userName }: SidebarProps) {
    const router = useRouter();
    const currentPath = usePathname();
    const sidebarAnim = useRef(new Animated.Value(-280)).current;

    // Sync animation with isOpen prop
    useEffect(() => {
        Animated.timing(sidebarAnim, {
            toValue: isOpen ? 0 : -280,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    // Create smooth interpolation for the overlay opacity based on sidebar position
    const overlayOpacity = sidebarAnim.interpolate({
        inputRange: [-280, 0],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dx < -5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) {
                    sidebarAnim.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -100 || gestureState.vx < -0.5) {
                    onClose();
                } else {
                    Animated.spring(sidebarAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 0,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(sidebarAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 0,
                }).start();
            },
            onPanResponderTerminationRequest: () => false,
        })
    ).current;

    const navigateTo = (route: string) => {
        onClose();
        if (route === '/dashboard') {
            // Special case for dashboard if it's not a route but the index
            // Depending on how app structure is, usually router.push('/') or router.back() if coming from deeper
            // For now let's assume router.replace('/') goes to dashboard home
            router.dismissAll();
            router.replace('/');
        } else {
            router.push(route as any);
        }
    };

    // Helper to determine active state
    const isActive = (route: string) => {
        if (activeRoute) return activeRoute === route;
        // Fallback to path check (imperfect for 'dashboard' if it's '/')
        if (route === '/dashboard' && currentPath === '/') return true;
        return currentPath === route;
    };

    return (
        <>
            {/* Sidebar Overlay */}
            {isOpen && (
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.sidebarOverlay, { opacity: overlayOpacity, zIndex: 1000 }]} />
                </TouchableWithoutFeedback>
            )}

            {/* Side Navbar (Sidebar) */}
            <Animated.View
                style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }], zIndex: 1001 }]}
                {...panResponder.panHandlers}
            >
                <View style={styles.sidebarHeader}>
                    <Image
                        source={require('@/assets/images/logo.png')}
                        style={styles.sidebarLogo}
                        contentFit="contain"
                    />
                    <Text style={styles.sidebarAppName}>FaceAttend</Text>
                </View>

                <ScrollView style={styles.sidebarContent}>
                    <Pressable
                        style={[styles.navItem, isActive('/dashboard') && styles.navItemActive]}
                        onPress={() => navigateTo('/dashboard')}
                    >
                        <Ionicons
                            name="home"
                            size={22}
                            color={isActive('/dashboard') ? "#4F46E5" : "#4B5563"}
                            style={styles.navIcon}
                        />
                        <Text style={[styles.navText, isActive('/dashboard') && styles.navTextActive]}>Dashboard</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.navItem, isActive('/timetable') && styles.navItemActive]}
                        onPress={() => navigateTo('/timetable')}
                    >
                        <Ionicons
                            name="calendar"
                            size={22}
                            color={isActive('/timetable') ? "#4F46E5" : "#4B5563"}
                            style={styles.navIcon}
                        />
                        <Text style={[styles.navText, isActive('/timetable') && styles.navTextActive]}>Timetable</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.navItem, isActive('/student-registration') && styles.navItemActive]}
                        onPress={() => navigateTo('/student-registration')}
                    >
                        <Ionicons
                            name="person-add"
                            size={22}
                            color={isActive('/student-registration') ? "#4F46E5" : "#4B5563"}
                            style={styles.navIcon}
                        />
                        <Text style={[styles.navText, isActive('/student-registration') && styles.navTextActive]}>Register Student</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.navItem, isActive('/manage-students') && styles.navItemActive]}
                        onPress={() => navigateTo('/manage-students')}
                    >
                        <Ionicons
                            name="people"
                            size={22}
                            color={isActive('/manage-students') ? "#4F46E5" : "#4B5563"}
                            style={styles.navIcon}
                        />
                        <Text style={[styles.navText, isActive('/manage-students') && styles.navTextActive]}>Manage Students</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.navItem, isActive('/settings') && styles.navItemActive]}
                        onPress={() => navigateTo('/settings')}
                    >
                        <Ionicons
                            name="settings"
                            size={22}
                            color={isActive('/settings') ? "#4F46E5" : "#4B5563"}
                            style={styles.navIcon}
                        />
                        <Text style={[styles.navText, isActive('/settings') && styles.navTextActive]}>Settings</Text>
                    </Pressable>
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <Pressable
                        style={styles.logoutNavItem}
                        onPress={() => {
                            onClose();
                            onLogout && onLogout();
                        }}
                    >
                        <Ionicons name="log-out" size={22} color="#EF4444" />
                        <Text style={styles.logoutNavText}>Logout</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </>
    );
}
