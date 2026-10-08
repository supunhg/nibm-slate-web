import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { TabScreen } from '../types';
import { Calendar, UserCheck, Activity, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

interface TabBarProps {
  currentTab: TabScreen;
  onSelectTab: (tab: TabScreen) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const showExecutive =
    user?.role === 'EXECUTIVE' || user?.role === 'ADMIN' || user?.role === 'DEMONSTRATOR';

  const tabs: Array<{ id: TabScreen; label: string; icon: typeof Calendar; isAccent?: boolean }> = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'portal', label: 'My Portal', icon: UserCheck },
    ...(showExecutive
      ? [{ id: 'executive' as TabScreen, label: 'Cockpit', icon: Activity, isAccent: true }]
      : []),
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          const activeColor = tab.isAccent ? colors.accentLight : colors.primaryLight;
          const iconColor = isActive ? activeColor : colors.textMuted;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                isActive && (tab.isAccent ? styles.tabItemActiveAccent : styles.tabItemActive),
              ]}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Icon size={20} color={iconColor} strokeWidth={isActive ? 2.4 : 1.8} />
                {isActive && (
                  <View
                    style={[
                      styles.activeIndicatorDot,
                      { backgroundColor: tab.isAccent ? colors.accent : colors.primary },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive &&
                    (tab.isAccent ? styles.tabLabelActiveAccent : styles.tabLabelActive),
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderSubtle,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    minWidth: 70,
  },
  tabItemActive: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.32)',
  },
  tabItemActiveAccent: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.32)',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 5,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primaryLight,
    fontWeight: '800',
  },
  tabLabelActiveAccent: {
    color: colors.accentLight,
    fontWeight: '800',
  },
});
