import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 4,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  messageContainer: {
    marginTop: 0,
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: -1.5,
  },
  loginContainer: {
    width: '100%',
    marginTop: 20,
  },
});


