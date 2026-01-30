import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    color: '#1E293B', // Slate 800
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B', // Slate 500
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#3B82F6', // Blue 500
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    fontSize: 14,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#2563EB', // Blue 600
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#1D4ED8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  linksRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  linkButtonPressed: {
    opacity: 0.6,
  },
  linkText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});


