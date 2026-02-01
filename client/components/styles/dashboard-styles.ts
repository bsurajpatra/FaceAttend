import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Dashboard Container
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
  },

  // Sidebar Styles
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Semi-transparent Slate 900
    zIndex: 1000,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 1001,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sidebarHeader: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarLogo: {
    width: 44,
    height: 44,
    marginRight: 12,
  },
  sidebarAppName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E3A8A', // Blue 900
    letterSpacing: -0.5,
  },
  sidebarContent: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF', // Blue 50
  },
  navIcon: {
    fontSize: 22,
    marginRight: 16,
    width: 28,
    textAlign: 'center',
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B', // Slate 500
  },
  navTextActive: {
    color: '#2563EB', // Blue 600
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 20,
  },
  logoutNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFF1F2', // Rose 50
  },
  logoutNavText: {
    color: '#E11D48', // Rose 600
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },

  // Header Styles
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#2563EB', // Blue 600
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 10,
  },
  menuButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  profileInitial: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '900',
  },

  // Content Styles
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 30,
  },
  welcomeContainer: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#3B82F6', // Blue 500
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  welcomeName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E293B', // Slate 800
    marginBottom: 6,
    letterSpacing: -1,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: '#64748B', // Slate 500
    fontWeight: '500',
    textAlign: 'center',
  },

  // Current Session Card
  currentSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  currentSessionLabel: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  currentSessionContent: {
    gap: 16,
  },
  sessionMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    flex: 1,
    letterSpacing: -0.5,
  },
  sessionTypeBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sessionTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sessionDetails: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#475569', // Slate 600
    fontWeight: '600',
  },
  takeAttendanceButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  takeAttendanceButtonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: '#1D4ED8',
  },
  takeAttendanceButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  refreshButton: {
    backgroundColor: '#EFF6FF',
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  refreshButtonPressed: {
    backgroundColor: '#DBEAFE',
  },
  refreshButtonText: {
    fontSize: 20,
  },

  // Attendance Status
  attendanceTakenContainer: {
    gap: 16,
  },
  attendanceTakenInfo: {
    backgroundColor: '#F0FDF4', // Green 50
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  attendanceTakenButtonText: {
    color: '#166534', // Green 800
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  attendanceDetailsText: {
    color: '#15803D', // Green 700
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  attendanceTimeText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  retakeAttendanceButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFF6FF',
  },
  retakeAttendanceButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  retakeAttendanceButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
  },

  // Empty State
  noSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
  },
  noSessionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    marginTop: 16,
  },
  noSessionSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Action Buttons
  actionsContainer: {
    gap: 12,
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionButtonPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
});
