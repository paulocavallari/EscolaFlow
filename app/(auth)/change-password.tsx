// app/(auth)/change-password.tsx
// Screen to force user to change their initial password — MD3 design

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Lock, WarningCircle } from 'phosphor-react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme, typography } from '../../src/lib/theme';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';

export default function ChangePasswordScreen() {
    const { session, profile, refreshProfile } = useAuth();
    const { colors } = useTheme();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If no session, they shouldn't be here
    React.useEffect(() => {
        if (!session) {
            router.replace('/(auth)/login');
        }
    }, [session]);

    const handleChangePassword = async () => {
        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });
            if (authError) throw authError;

            if (profile) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ force_password_change: false })
                    .eq('id', profile.id);
                if (profileError) throw profileError;
            }

            await refreshProfile();

            Alert.alert(
                'Sucesso',
                'Sua senha foi alterada com sucesso. Você será redirecionado.',
                [{ text: 'OK', onPress: () => router.replace('/(app)') }]
            );
        } catch (err: any) {
            setError(err.message || 'Falha ao alterar senha.');
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
                        <Lock size={40} color={colors.onPrimaryContainer} weight="duotone" />
                    </View>
                    <Text style={[styles.title, { color: colors.onBackground }]}>Definir Nova Senha</Text>
                    <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                        Como este é seu primeiro acesso, por motivos de segurança, você precisa definir uma nova senha.
                    </Text>
                </View>

                <View style={styles.form}>
                    <AppInput
                        label="Nova Senha"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mínimo 6 caracteres"
                        secureTextEntry
                        leftIcon={Lock}
                    />

                    <AppInput
                        label="Confirmar Nova Senha"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Mínimo 6 caracteres"
                        secureTextEntry
                        onSubmitEditing={handleChangePassword}
                        leftIcon={Lock}
                    />

                    {error && (
                        <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                            <WarningCircle size={16} color={colors.onErrorContainer} weight="bold" />
                            <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>{error}</Text>
                        </View>
                    )}

                    <AppButton
                        title="Atualizar Senha e Continuar"
                        onPress={handleChangePassword}
                        loading={loading}
                        size="lg"
                        style={{ marginTop: 8 }}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        ...typography.headlineLarge,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.bodyMedium,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: 16,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        ...typography.bodySmall,
        flex: 1,
    },
});
