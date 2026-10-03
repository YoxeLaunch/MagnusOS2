import React from 'react';
import { Login } from './Login';

interface RegisterProps {
    onRegisterSuccess: (user: any) => void;
    onNavigateToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
    return (
        <Login
            onLoginSuccess={onRegisterSuccess}
            onNavigateToRegister={onNavigateToLogin}
            initialMode="register"
        />
    );
};
