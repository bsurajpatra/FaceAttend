import { getSecureItem, setSecureItem } from './secure-storage';

export interface LocalAuditLog {
    timestamp: number;
    action: string;
    details: string;
    synced: boolean;
}

const STORAGE_KEY = 'local_audit_trail';
const MAX_LOGS = 30; // Keep it small to fit safely in secure storage (Keychain/Keystore)

/**
 * Logs a sensitive action locally in the encrypted secure storage.
 * This ensures that even if a network failure occurs, the action is recorded
 * and can be reviewed if the device is inspected.
 */
export async function logEvent(action: string, details: string) {
    try {
        const rawLogs = await getSecureItem(STORAGE_KEY);
        let logs: LocalAuditLog[] = [];
        
        if (rawLogs) {
            try {
                logs = JSON.parse(rawLogs);
            } catch {
                logs = [];
            }
        }

        // Prepend new log
        logs.unshift({
            timestamp: Date.now(),
            action,
            details,
            synced: false
        });

        // Limit size
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }

        await setSecureItem(STORAGE_KEY, JSON.stringify(logs));
        console.log(`[Audit] ${action}: ${details}`);
    } catch (error) {
        console.error('Failed to write local audit log:', error);
    }
}

/**
 * Retrieves the encrypted local audit trail.
 */
export async function getLocalLogs(): Promise<LocalAuditLog[]> {
    try {
        const rawLogs = await getSecureItem(STORAGE_KEY);
        return rawLogs ? JSON.parse(rawLogs) : [];
    } catch {
        return [];
    }
}

/**
 * Marks logs as synced if we want to implement a sync-back mechanism
 */
export async function clearSyncedLogs() {
    try {
        await setSecureItem(STORAGE_KEY, JSON.stringify([]));
    } catch (error) {
        console.error('Failed to clear audit logs:', error);
    }
}
