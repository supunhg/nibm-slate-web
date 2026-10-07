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
import { Download, Sparkles, X } from 'lucide-react-native';

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabScreen>('schedule');
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [isUpdateBannerDismissed, setIsUpdateBannerDismissed] = useState(false);

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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
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

      {/* Global In-App Update Banner */}
      {updateInfo?.hasUpdate && !isUpdateBannerDismissed && (
        <View style={styles.updateBanner}>
          <View style={styles.updateBannerLeft}>
            <Sparkles size={15} color="#fbbf24" style={{ marginRight: 6 }} />
            <Text style={styles.updateBannerText} numberOfLines={1}>
              Update v{updateInfo.latestVersion} available
            </Text>
          </View>
          <View style={styles.updateBannerActions}>
            <TouchableOpacity
              style={styles.updateBannerButton}
              onPress={() => downloadAndInstallUpdate(updateInfo.apkUrl)}
              activeOpacity={0.8}
            >
              <Download size={12} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.updateBannerButtonText}>Install</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.updateBannerDismiss}
              onPress={() => setIsUpdateBannerDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  updateBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  updateBannerText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  updateBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateBannerButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  updateBannerButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  updateBannerDismiss: {
    padding: 3,
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
    backgroundColor: colors.primary,
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
