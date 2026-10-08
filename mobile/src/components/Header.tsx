import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowLeft } from 'lucide-react-native';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onProfilePress?: () => void;
  isBackVisible?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onProfilePress,
  isBackVisible,
  onBackPress,
}) => {
  const { user } = useAuth();

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.35)', text: colors.warning };
      case 'DEMONSTRATOR':
        return { bg: 'rgba(99, 102, 241, 0.16)', border: 'rgba(99, 102, 241, 0.38)', text: colors.primaryLight };
      case 'EXECUTIVE':
        return { bg: 'rgba(6, 182, 212, 0.14)', border: 'rgba(6, 182, 212, 0.35)', text: colors.accent };
      default:
        return { bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.35)', text: colors.success };
    }
  };

  const roleStyle = getRoleBadgeStyle(user?.role);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {isBackVisible && onBackPress ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          /* Modern Sleek Brand Mark Badge */
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>SLATE</Text>
          </View>
        )}

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'NIBM Slate'}
          </Text>

          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : user ? (
            <View style={styles.userMetaRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.fullName}
              </Text>
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: roleStyle.bg, borderColor: roleStyle.border },
                ]}
              >
                <Shield size={9} color={roleStyle.text} style={{ marginRight: 3 }} />
                <Text style={[styles.rolePillText, { color: roleStyle.text }]}>{user.role}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {onProfilePress && (
        <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.8}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            {/* Live active indicator dot */}
            <View style={styles.onlineDot} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    marginRight: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  backButton: {
    backgroundColor: colors.surfaceElevated,
    padding: 8,
    borderRadius: 10,
    marginRight: 11,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    marginTop: 1,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1.5,
    gap: 7,
  },
  userName: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
    maxWidth: 130,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatarButton: {
    marginLeft: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.cardBorderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
