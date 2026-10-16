import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  StatusBar as RNStatusBar,
  Platform,
  BackHandler,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Modal,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme/colors';
import { TabScreen } from './src/types';
import { Header } from './src/components/Header';
import { TabBar } from './src/components/TabBar';
import { LoginScreen } from './src/screens/LoginScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { InstructorPortalScreen } from './src/screens/InstructorPortalScreen';
import { ExecutiveCockpitScreen } from './src/screens/ExecutiveCockpitScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ChangePasswordScreen } from './src/screens/ChangePasswordScreen';
import { checkAppUpdate, downloadAndInstallUpdate, AppUpdateCheckResult } from './src/services/updates';
import { Download, Sparkles } from 'lucide-react-native';

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabScreen>('schedule');
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  // Remember which version was dismissed so "Later" isn't undone by the next
  // foreground check, while a newer release still prompts again.
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [isStartingUpdate, setIsStartingUpdate] = useState(false);

  // Silently check for software/APK updates on mount and whenever app resumes to foreground
  useEffect(() => {
    let isMounted = true;
    const runUpdateCheck = async () => {
      const res = await checkAppUpdate();
      if (isMounted && res.hasUpdate) {
        setUpdateInfo(res);
      }
    };
    runUpdateCheck();

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        runUpdateCheck();
      }
    });

    return () => {
      isMounted = false;
      appStateSub.remove();
    };
  }, []);

  // Handle hardware back press on Android so user returns to schedule instead of exiting app
  useEffect(() => {
    const handleBackPress = () => {
      if (activeTab === 'profile') {
        setActiveTab('schedule');
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backSubscription.remove();
  }, [activeTab]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>SLATE</Text>
        </View>
        <ActivityIndicator size="large" color="#fafafa" style={{ marginTop: 24 }} />
        <Text style={styles.splashText}>Connecting to NIBM Roster...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (user.mustChangePassword) {
    return (
      <View style={styles.safeArea}>
        <ChangePasswordScreen />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Header
        isBackVisible={activeTab === 'profile'}
        onBackPress={() => setActiveTab('schedule')}
        onProfilePress={() => setActiveTab(activeTab === 'profile' ? 'schedule' : 'profile')}
      />

      {/* In-app update prompt */}
      <Modal
        visible={!!updateInfo?.hasUpdate && dismissedVersion !== updateInfo?.latestVersion}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => updateInfo && setDismissedVersion(updateInfo.latestVersion)}
      >
        <View style={styles.updateBackdrop}>
          <View style={styles.updateSheet}>
            <View style={styles.updateIcon}>
              <Sparkles size={22} color="#0a0a0a" />
            </View>
            <Text style={styles.updateTitle}>Update available</Text>
            <Text style={styles.updateSubtitle}>
              Version {updateInfo?.latestVersion} is ready (you have {updateInfo?.currentVersion}).
            </Text>
            {!!updateInfo?.releaseNotes?.length && (
              <ScrollView style={styles.updateNotes} contentContainerStyle={{ gap: 6 }}>
                {updateInfo.releaseNotes.map((note, i) => (
                  <View key={i} style={styles.updateNoteRow}>
                    <View style={styles.updateNoteDot} />
                    <Text style={styles.updateNoteText}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.updatePrimary}
              activeOpacity={0.85}
              disabled={isStartingUpdate}
              onPress={async () => {
                if (!updateInfo) return;
                setIsStartingUpdate(true);
                await downloadAndInstallUpdate(updateInfo.apkUrl);
                setIsStartingUpdate(false);
              }}
            >
              {isStartingUpdate ? (
                <ActivityIndicator size="small" color="#0a0a0a" />
              ) : (
                <Download size={16} color="#0a0a0a" />
              )}
              <Text style={styles.updatePrimaryText}>{isStartingUpdate ? 'Opening download…' : 'Update now'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.updateSecondary}
              activeOpacity={0.7}
              onPress={() => updateInfo && setDismissedVersion(updateInfo.latestVersion)}
            >
              <Text style={styles.updateSecondaryText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.body}>
        {activeTab === 'schedule' && <ScheduleScreen />}
        {activeTab === 'portal' && <InstructorPortalScreen />}
        {activeTab === 'executive' && <ExecutiveCockpitScreen />}
        {activeTab === 'profile' && <ProfileScreen onBack={() => setActiveTab('schedule')} />}
      </View>

      <TabBar currentTab={activeTab} onSelectTab={setActiveTab} />
    </View>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : Platform.OS === 'ios' ? 44 : 0,
  },
  updateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 28,
  },
  updateSheet: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 22,
  },
  updateIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  updateTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  updateSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  updateNotes: {
    maxHeight: 160,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  updateNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  updateNoteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginTop: 7,
  },
  updateNoteText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  updatePrimary: {
    marginTop: 20,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updatePrimaryText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: '700',
  },
  updateSecondary: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  updateSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  splashText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
});
