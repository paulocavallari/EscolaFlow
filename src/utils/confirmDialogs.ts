import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
    } else {
        Alert.alert(title, message);
    }
}

export function showConfirmDialog(
    title: string,
    message: string,
    confirmText: string,
    onConfirm: () => void | Promise<void>,
    cancelText: string = 'Cancelar'
) {
    if (Platform.OS === 'web') {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
            void onConfirm();
        }
        return;
    }

    Alert.alert(title, message, [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, onPress: () => { void onConfirm(); } },
    ]);
}

export function showDoubleConfirmDialog(
    title: string,
    message: string,
    finalMessage: string,
    onConfirm: () => void | Promise<void>
) {
    if (Platform.OS === 'web') {
        const first = window.confirm(`${title}\n\n${message}`);
        if (!first) return;
        const second = window.confirm(finalMessage);
        if (!second) return;
        void onConfirm();
        return;
    }

    Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
                Alert.alert('Confirmação Final', finalMessage, [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Sim, Confirmar',
                        style: 'destructive',
                        onPress: () => { void onConfirm(); },
                    },
                ]);
            },
        },
    ]);
}