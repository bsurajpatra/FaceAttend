import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getDevicesApi, revokeDeviceApi, trustDeviceApi } from '../api/auth';
import type { DeviceInfo } from '../api/auth';
import { Smartphone, Shield, Trash2, AlertCircle, RefreshCw, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface MyDevicesProps {
    user: any;
}

export default function MyDevices({ user }: MyDevicesProps) {
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchDevices = async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            const data = await getDevicesApi();
            setDevices(data.devices);
            setError(null);
        } catch (err) {
            setError('Failed to load devices. Please try again.');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();

        // Socket integration
        const apiUrl = import.meta.env.VITE_API_URL;
        const socketUrl = apiUrl.split(',')[0].trim();

        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            auth: { token: localStorage.getItem('token') }
        });

        socket.on('connect', () => {
            console.log('MyDevices: Socket connected');
            socket.emit('join_room', `faculty_${user.id}`);
        });

        socket.on('devices_updated', (data: { devices: DeviceInfo[] }) => {
            console.log('MyDevices: Real-time update received');
            setDevices(data.devices);
        });

        return () => {
            socket.disconnect();
        };
    }, [user.id]);

    const handleManualRefresh = () => fetchDevices(true);

    const handleRevoke = async (deviceId: string) => {
        if (!confirm('Are you sure you want to revoke this device? You will be logged out from that device.')) return;

        try {
            setActionLoading(deviceId);
            const data = await revokeDeviceApi(deviceId);
            setDevices(data.devices);
        } catch (err) {
            alert('Failed to revoke device.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTrust = async (deviceId: string) => {
        try {
            setActionLoading(deviceId);
            const data = await trustDeviceApi(deviceId);
            setDevices(data.devices);
        } catch (err) {
            alert('Failed to update trust status.');
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                        <ShieldCheck size={28} className="text-blue-600" />
                        My Devices
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 text-sm uppercase tracking-wider ml-10">Manage trusted hardware for attendance</p>
                </div>
                <button
                    onClick={handleManualRefresh}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 shadow-sm group"
                >
                    <RefreshCw size={20} className={cn("group-hover:rotate-180 transition-transform duration-500", isLoading && "animate-spin")} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* Info Policy Card */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                    <Shield size={80} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-5 items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-600/20 group-hover:rotate-6 transition-transform flex-shrink-0">
                        <Shield size={24} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-black italic uppercase tracking-tighter text-blue-400 mb-1">Device Trust Policy</h3>
                        <p className="text-slate-300 font-medium leading-normal text-xs md:text-sm max-w-3xl">
                            Attendance operations are restricted to a <span className="text-white font-black underline italic">single trusted device</span>.
                            New logins are marked untrusted by default. Trusting a new device will automatically revoke trust from all other hardware.
                        </p>
                    </div>
                </div>
            </div>

            {/* Devices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.length === 0 ? (
                    <div className="col-span-full bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center">
                        <Smartphone size={60} className="text-slate-200 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-slate-400 tracking-tight italic uppercase">No devices found</h3>
                        <p className="text-slate-400 font-medium mt-2">Log in from your mobile app to register a device.</p>
                    </div>
                ) : (
                    devices.map((device: DeviceInfo) => (
                        <div
                            key={device.deviceId}
                            className={cn(
                                "bg-white p-6 rounded-[2.5rem] border transition-all duration-300 group relative overflow-hidden flex flex-col h-full",
                                device.isTrusted
                                    ? "border-emerald-200 shadow-xl shadow-emerald-50 bg-emerald-50/10"
                                    : "border-slate-200 hover:border-blue-200 shadow-sm hover:shadow-lg"
                            )}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <Smartphone size={80} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                                        device.isTrusted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <Smartphone size={24} />
                                    </div>
                                    {device.isTrusted ? (
                                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100 italic">
                                            Trusted
                                        </span>
                                    ) : (
                                        <span className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-200 italic">
                                            Untrusted
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight uppercase italic truncate">
                                    {device.deviceName}
                                </h3>

                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg w-fit">
                                        ID: {device.deviceId.slice(-12)}
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} className="text-blue-500" />
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Last Login</p>
                                                <p className="text-[11px] font-bold text-slate-600">
                                                    {new Date(device.lastLogin).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-3">
                                    {!device.isTrusted && (
                                        <button
                                            onClick={() => handleTrust(device.deviceId)}
                                            disabled={!!actionLoading}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
                                        >
                                            {actionLoading === device.deviceId ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="w-4 h-4" />
                                            )}
                                            Trust Device
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRevoke(device.deviceId)}
                                        disabled={!!actionLoading}
                                        className={cn(
                                            "p-3 rounded-xl transition-all active:scale-95 shadow-sm border",
                                            device.isTrusted
                                                ? "bg-white border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600"
                                                : "bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        )}
                                        title="Revoke device"
                                    >
                                        {actionLoading === device.deviceId ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
