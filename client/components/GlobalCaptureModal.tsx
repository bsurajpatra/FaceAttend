
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../api/http';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlobalCaptureModal() {
    const { socket } = useSocket();
    const { isLoggedIn } = useAuth();
    const [request, setRequest] = useState<any>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!socket || !isLoggedIn) {
            setRequest(null); // Clean up if logged out
            return;
        }

        const handleRequest = (data: any) => {
            console.log('Received capture request:', data);
            setRequest(data);
        };

        socket.on('capture_request', handleRequest);

        return () => {
            socket.off('capture_request', handleRequest);
        };
    }, [socket, isLoggedIn]);

    const handleClose = () => {
        setRequest(null);
        setCapturedImage(null);
        setCameraOpen(false);
    };

    const openCamera = async () => {
        if (!permission?.granted) {
            const p = await requestPermission();
            if (!p.granted) return;
        }
        setCameraOpen(true);
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setCapturedImage(result.assets[0].base64);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
                if (photo?.base64) {
                    setCapturedImage(photo.base64);
                    setCameraOpen(false);
                }
            } catch (e) {
                Alert.alert('Error', 'Failed to capture photo');
            }
        }
    };

    const handleUpload = async () => {
        if (!capturedImage || !request) return;

        try {
            setUploading(true);
            console.log('Uploading photo for student:', request.studentId);

            await http.post(`/api/students/${request.studentId}/face`, {
                faceImageBase64: capturedImage
            });

            Alert.alert('Success', 'Face captured & uploaded successfully!');
            handleClose();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to upload face');
        } finally {
            setUploading(false);
        }
    };

    if (!request) return null;

    return (
        <Modal visible={true} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Photo Request</Text>
                        <Pressable onPress={handleClose}>
                            <Ionicons name="close-circle" size={28} color="#94A3B8" />
                        </Pressable>
                    </View>

                    {/* Details */}
                    <View style={styles.details}>
                        <Text style={styles.studentName}>{request.name}</Text>
                        <Text style={styles.rollNo}>Roll No: {request.rollNumber}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{request.subject} • {request.section}</Text>
                        </View>
                    </View>

                    {/* Camera View or Preview */}
                    <View style={styles.previewContainer}>
                        {capturedImage ? (
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${capturedImage}` }}
                                style={styles.previewImage}
                            />
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="person" size={48} color="#CBD5E1" />
                            </View>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {!capturedImage ? (
                            <View style={styles.row}>
                                <Pressable style={styles.actionBtnSecondary} onPress={pickImage}>
                                    <Ionicons name="images" size={20} color="#64748B" />
                                    <Text style={styles.btnTextSecondary}>Gallery</Text>
                                </Pressable>
                                <Pressable style={styles.actionBtnPrimary} onPress={openCamera}>
                                    <Ionicons name="camera" size={20} color="white" />
                                    <Text style={styles.btnTextPrimary}>Camera</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.column}>
                                <Pressable
                                    style={[styles.uploadBtn, uploading && styles.disabledBtn]}
                                    onPress={handleUpload}
                                    disabled={uploading}
                                >
                                    <Text style={styles.uploadBtnText}>
                                        {uploading ? 'UPLOADING...' : 'UPLOAD PHOTO'}
                                    </Text>
                                </Pressable>
                                <Pressable style={styles.retakeBtn} onPress={() => setCapturedImage(null)} disabled={uploading}>
                                    <Text style={styles.retakeBtnText}>Retake</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>

                {/* Camera Modal */}
                <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
                    <View style={{ flex: 1, backgroundColor: 'black' }}>
                        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
                        <View style={styles.cameraControls}>
                            <Pressable onPress={() => setCameraOpen(false)} style={styles.closeCamBtn}>
                                <Ionicons name="close" size={28} color="white" />
                            </Pressable>
                            <Pressable onPress={takePicture} style={styles.captureBtn}>
                                <View style={styles.captureBtnInner} />
                            </Pressable>
                            <View style={{ width: 44 }} />
                        </View>
                    </View>
                </Modal>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    card: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
    },
    details: {
        alignItems: 'center',
        marginBottom: 24,
    },
    studentName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    rollNo: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    placeholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 4,
        borderColor: '#3B82F6',
    },
    actions: {
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    column: {
        gap: 12,
    },
    actionBtnPrimary: {
        flex: 1,
        height: 56,
        backgroundColor: '#2563EB',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionBtnSecondary: {
        flex: 1,
        height: 56,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnTextPrimary: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    btnTextSecondary: {
        color: '#475569',
        fontSize: 16,
        fontWeight: '700',
    },
    uploadBtn: {
        height: 56,
        backgroundColor: '#10B981',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4
    },
    uploadBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    retakeBtn: {
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    retakeBtnText: {
        color: '#64748B',
        fontWeight: '600',
    },
    cameraControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 40,
        paddingBottom: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'white',
    },
    closeCamBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 22,
    }
});
