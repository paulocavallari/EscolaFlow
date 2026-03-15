// app/(auth)/login.tsx
// Login screen with email/password — MD3 design

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { GraduationCap, EnvelopeSimple, Lock, WarningCircle } from 'phosphor-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme, typography } from '../../src/lib/theme';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';

export default function LoginScreen() {
    const { signIn, loading, session } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const passwordRef = useRef<TextInput>(null);

    // Redirect if already logged in
    React.useEffect(() => {
        if (session) {
            router.replace('/(app)');
        }
    }, [session]);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Preencha o e-mail e a senha.');
            return;
        }

        setError(null);
        const result = await signIn(email.trim(), password);

        if (result.error) {
            setError(result.error);
        } else {
            router.replace('/(app)');
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Logo / Header */}
                <View style={styles.header}>
                    <View style={[styles.logoCircle, { backgroundColor: colors.primaryContainer }]}>
                        <GraduationCap size={48} color={colors.onPrimaryContainer} weight="duotone" />
                    </View>
                    <Text style={[styles.appName, { color: colors.onBackground }]}>Ocorrências VC</Text>
                    <Text style={[styles.tagline, { color: colors.onSurfaceVariant }]}>Gestão Escolar Inteligente</Text>
                </View>

                {/* Login Form */}
                <View style={styles.form}>
                    <AppInput
                        label="E-mail"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="seu.email@escola.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        blurOnSubmit={false}
                        leftIcon={EnvelopeSimple}
                    />

                    <AppInput
                        ref={passwordRef}
                        label="Senha"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                        leftIcon={Lock}
                    />

                    {error && (
                        <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                            <WarningCircle size={16} color={colors.onErrorContainer} weight="bold" />
                            <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>{error}</Text>
                        </View>
                    )}

                    <AppButton
                        title="Entrar"
                        onPress={handleLogin}
                        loading={loading}
                        size="lg"
                        style={{ marginTop: 8 }}
                    />
                </View>

                {/* Footer */}
                <Text style={[styles.footer, { color: colors.onSurfaceVariant }]}>
                    Acesse com as credenciais fornecidas pela administração.
                </Text>
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
        marginBottom: 48,
    },
    logoCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    appName: {
        ...typography.displayMedium,
        letterSpacing: -0.5,
    },
    tagline: {
        ...typography.bodyLarge,
        marginTop: 4,
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
    footer: {
        marginTop: 32,
        textAlign: 'center',
        ...typography.bodySmall,
    },
});
