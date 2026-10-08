import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { apiUpdateProfile, apiChangePassword } from '../services/api';
import {
  Shield,
  Server,
  Bell,
  LogOut,
  ChevronRight,
  Sparkles,
  KeyRound,
  Edit3,
  Phone,
  Mail,
  UserCheck,
  ArrowLeft,
  ArrowDownToLine,
  RefreshCw,
  CheckCircle2,
  Download,
} from 'lucide-react-native';
import {
  checkAppUpdate,
  downloadAndInstallUpdate,
  AppUpdateCheckResult,
  CURRENT_APP_VERSION,
} from '../services/updates';

interface ProfileScreenProps {
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { user, logout, serverUrl, updateServerUrl, refreshUser } = useAuth();

  // App Update state
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null);

  // Server URL Modal state (Admin only)
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState(serverUrl);
  const [isPushRegistering, setIsPushRegistering] = useState(false);

  // Contact Info Modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Change Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setContactEmail(user.email || '');
      setContactPhone(user.phone || '');
    }
  }, [user]);

  // Check for updates on profile mount
  useEffect(() => {
    let isMounted = true;
    checkAppUpdate().then((res) => {
      if (isMounted) setUpdateInfo(res);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckMessage(null);
    try {
      const res = await checkAppUpdate();
      setUpdateInfo(res);
      if (res.hasUpdate) {
        Alert.alert(
          'Update Available',
          `A newer release (v${res.latestVersion}) is ready. Would you like to download and install the new APK update?`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Install Now',
              onPress: () => downloadAndInstallUpdate(res.apkUrl),
            },
          ]
        );
      } else {
        setUpdateCheckMessage(`You are running the latest version (v${res.currentVersion})`);
      }
    } catch {
      setUpdateCheckMessage('Unable to reach the update server.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of NIBM Slate?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleSaveServer = async () => {
    if (newServerUrl.trim()) {
      await updateServerUrl(newServerUrl.trim());
      setIsServerModalOpen(false);
      Alert.alert('Saved', 'Server endpoint updated.');
    }
  };

  const handleTestPush = async () => {
    setIsPushRegistering(true);
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        Alert.alert(
          'Push Notifications Active',
          'Your device is registered to receive real-time alerts for roster publications, schedule changes, and leave updates.'
        );
      } else {
        Alert.alert(
          'Push Notifications Notice',
          'Push notifications are supported on physical iOS and Android mobile devices with notifications enabled.'
        );
      }
    } catch {
      Alert.alert('Notice', 'Unable to refresh push notification service at this time.');
    } finally {
      setIsPushRegistering(false);
    }
  };

  const handleSaveContact = async () => {
    setContactError(null);
    setIsContactSubmitting(true);
    try {
      const res = await apiUpdateProfile({
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      });
      if (res.success) {
        await refreshUser();
        setIsContactModalOpen(false);
        Alert.alert('Profile Updated', 'Your contact details have been successfully saved.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setContactError(msg);
    } finally {
      setIsContactSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const res = await apiChangePassword(currentPassword, newPassword);
      if (res.success) {
        await refreshUser();
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Password Changed', 'Your password has been changed successfully.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButtonRow}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={colors.primaryLight} />
          <Text style={styles.backButtonText}>Back to Schedule</Text>
        </TouchableOpacity>
      )}

      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <View style={styles.roleChip}>
              <Shield size={11} color={colors.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.roleChipText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Username</Text>
          <Text style={styles.detailValue}>@{user?.username}</Text>
        </View>

        {user?.jobTitle && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Job Title</Text>
            <Text style={styles.detailValue}>{user.jobTitle}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Contact Phone</Text>
          <Text style={styles.detailValue}>{user?.phone || 'Not configured'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user?.email || 'Not configured'}</Text>
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => {
            setContactEmail(user?.email || '');
            setContactPhone(user?.phone || '');
            setContactError(null);
            setIsContactModalOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Edit3 size={13} color={colors.primaryLight} style={{ marginRight: 6 }} />
          <Text style={styles.editProfileButtonText}>Edit Contact Details</Text>
        </TouchableOpacity>
      </View>

      {/* Security & Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account & Security</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError(null);
            setIsPasswordModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(234, 179, 8, 0.12)' }]}>
            <KeyRound size={17} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Change Password</Text>
            <Text style={styles.settingSubtext}>Update your account security credential</Text>
          </View>
          <ChevronRight size={17} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Connectivity & Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connectivity & Notifications</Text>

        {/* Server Endpoint Item (Admin only) */}
        {user?.role === 'ADMIN' && (
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              setNewServerUrl(serverUrl);
              setIsServerModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Server size={17} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>API Server URL</Text>
              <Text style={styles.settingSubtext} numberOfLines={1}>
                {serverUrl || 'Default host'}
              </Text>
            </View>
            <ChevronRight size={17} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Push Notification Item */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleTestPush}
          activeOpacity={0.7}
          disabled={isPushRegistering}
        >
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
            <Bell size={17} color={colors.primaryLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingSubtext}>
              {isPushRegistering ? 'Registering...' : 'Tap to refresh push alert token'}
            </Text>
          </View>
          <ChevronRight size={17} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* App Version & Updates Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <ArrowDownToLine size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>App Version & Updates</Text>
          </View>
          {updateInfo?.hasUpdate ? (
            <View style={styles.updateBadge}>
              <Text style={styles.updateBadgeText}>Update Available</Text>
            </View>
          ) : (
            <View style={styles.upToDateBadge}>
              <CheckCircle2 size={11} color={colors.success} style={{ marginRight: 3 }} />
              <Text style={styles.upToDateBadgeText}>Up to Date</Text>
            </View>
          )}
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Installed Version</Text>
          <Text style={styles.detailValue}>v{CURRENT_APP_VERSION}</Text>
        </View>

        {updateInfo?.hasUpdate && (
          <View style={{ marginTop: 8 }}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Latest Release</Text>
              <Text style={[styles.detailValue, { color: '#fbbf24', fontWeight: '800' }]}>
                v{updateInfo.latestVersion}
              </Text>
            </View>

            {updateInfo.releaseNotes.length > 0 && (
              <View style={styles.releaseNotesBox}>
                <Text style={styles.releaseNotesTitle}>What's New in v{updateInfo.latestVersion}:</Text>
                {updateInfo.releaseNotes.map((note, idx) => (
                  <Text key={idx} style={styles.releaseNoteItem}>• {note}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.downloadUpdateButton}
              onPress={() => downloadAndInstallUpdate(updateInfo.apkUrl)}
              activeOpacity={0.8}
            >
              <Download size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadUpdateButtonText}>Download & Install Update (APK)</Text>
            </TouchableOpacity>
          </View>
        )}

        {updateCheckMessage && !updateInfo?.hasUpdate && (
          <Text style={styles.updateStatusText}>{updateCheckMessage}</Text>
        )}

        <TouchableOpacity
          style={styles.checkUpdateButton}
          onPress={handleCheckForUpdates}
          disabled={isCheckingUpdate}
          activeOpacity={0.7}
        >
          {isCheckingUpdate ? (
            <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginRight: 6 }} />
          ) : (
            <RefreshCw size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
          )}
          <Text style={styles.checkUpdateButtonText}>
            {isCheckingUpdate ? 'Checking for Updates...' : 'Check for Updates Now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* System Information */}
      <View style={styles.infoBox}>
        <Sparkles size={15} color={colors.accent} style={{ marginRight: 8 }} />
        <Text style={styles.infoText}>
          NIBM Slate Mobile v{CURRENT_APP_VERSION} • School of Computing, NIBM
        </Text>
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut size={17} color={colors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Sign Out of Slate</Text>
      </TouchableOpacity>

      {/* Edit Contact Details Modal */}
      <Modal visible={isContactModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Edit Contact Details</Text>
            <Text style={styles.modalSubtitle}>
              Keep your contact details updated so administrators and demonstrators can reach you.
            </Text>

            {contactError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{contactError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.modalInput}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@nibm.lk"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE / MOBILE NUMBER</Text>
              <TextInput
                style={styles.modalInput}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholder="+94 71 234 5678"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsContactModalOpen(false)}
                disabled={isContactSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, isContactSubmitting && styles.buttonDisabled]}
                onPress={handleSaveContact}
                disabled={isContactSubmitting}
              >
                {isContactSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Change Account Password</Text>
            <Text style={styles.modalSubtitle}>
              Ensure your new password contains at least 8 characters.
            </Text>

            {passwordError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{passwordError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Repeat new password"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsPasswordModalOpen(false)}
                disabled={isPasswordSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, isPasswordSubmitting && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={isPasswordSubmitting}
              >
                {isPasswordSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Server Edit Modal */}
      <Modal visible={isServerModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Update Server Endpoint</Text>
            <TextInput
              style={styles.modalInput}
              value={newServerUrl}
              onChangeText={setNewServerUrl}
              autoCapitalize="none"
              placeholder="https://slate.oalindustries.me"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsServerModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveServer}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    marginBottom: 4,
  },
  backButtonText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  roleChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceHighlight,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5.5,
  },
  detailLabel: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 9,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    marginTop: 14,
  },
  editProfileButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSubtext: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  updateBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  updateBadgeText: {
    color: '#fbbf24',
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  upToDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upToDateBadgeText: {
    color: colors.success,
    fontSize: 10.5,
    fontWeight: '700',
  },
  releaseNotesBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    marginVertical: 10,
    gap: 4,
  },
  releaseNotesTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  releaseNoteItem: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
  },
  downloadUpdateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  downloadUpdateButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  updateStatusText: {
    fontSize: 11.5,
    color: colors.success,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  checkUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 9,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    marginTop: 10,
  },
  checkUpdateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginTop: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 12,
  },
  modalErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    marginBottom: 6,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
